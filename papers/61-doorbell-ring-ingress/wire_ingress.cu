// wire_ingress.cu — wire→tensor ingress on a unified-memory Thor: zero-copy vs naive
//
// The googl1-digest paper candidate (part 05 / part 13): on a SoC where CPU and
// GPU share one physical memory, a frame received by the CPU directly into a
// mapped pinned ring slot can be consumed in place by a resident kernel — no
// staging copy, no per-job launch. This probe measures that claim against the
// naive path (recv into heap, cudaMemcpyAsync H2D, per-job kernel, D2H result)
// on the same socket, in the same process, on the same box.
//
// Job = sum of the frame's floats (a dot with the ones vector — the smallest
// honest "tensor consumption"). Payload floats are drawn from {0, 0.25, 0.5,
// 0.75} so any summation order is exact in fp32 and the check is bit-exact.
//
// Both modes are serial per frame (recv → consume → result observed), which is
// the per-frame round-trip measurement; ring *pipelined* throughput is already
// measured separately (xp-batch persist_queue, 314 k jobs/s).
//
// Read-only with respect to the machine: no /dev/mem, no firmware, no boot
// config, no privileged writes. CUDA + a TCP socket only. Run the receiver
// under thor-admit.
//
// Build: /usr/local/cuda/bin/nvcc -O3 -arch=sm_110 -o wire_ingress wire_ingress.cu
// Usage:
//   wire_ingress recv --mode zero|naive --frame BYTES --count N [--port P]
//   wire_ingress info

#include <cuda.h>
#include <cuda_runtime.h>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cstdint>
#include <cmath>
#include <ctime>
#include <unistd.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <arpa/inet.h>
#include <sys/socket.h>

#define CAP 8192                 // max frame bytes
#define NSLOTS 64                // ring depth (zero mode)
#define WARP 32

// One slot per in-flight job. Header (seq_in/seq_out/result) gets its own
// 128-byte line so it never shares a line with payload bytes. CPU release-
// stores seq_in after the payload is written; the kernel acquire-reads it,
// sums the payload in place, writes result, then release-stores seq_out.
struct __align__(128) Slot {
    uint64_t seq_in;             // CPU -> GPU doorbell (job number)
    uint64_t seq_out;            // GPU -> CPU ack (job number)
    float    result;             // GPU's sum
    char     _pad[128 - 8 - 8 - 4];
    char     payload[CAP];       // frame lands here via recv()
};

static double now_us() {
    timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1e6 + ts.tv_nsec / 1000.0;
}

static void die(const char* what) { perror(what); exit(1); }

// ---------------- kernels ----------------

__global__ void resident_ring(Slot* slots, int nslots, int nfloat, uint64_t stop_seq) {
    // One warp: lane 0 is the only thread that touches mapped host memory in
    // the poll loop (the xp-batch finding: a 20k-thread grid hammering one
    // mapped word never observes host writes; one polite poller works).
    __shared__ uint64_t s_job;
    const int tid = threadIdx.x;
    uint64_t processed = 0;
    for (;;) {
        const int si = (int)(processed % (uint64_t)nslots);
        if (tid == 0) {
            // acquire-style wait for job processed+1. The atomic read cannot
            // be compiled away (a plain spin on a non-volatile is deleted).
            while (atomicAdd_system((unsigned long long*)&slots[si].seq_in, 0ULL)
                   < processed + 1)
                __nanosleep(200);
            s_job = slots[si].seq_in;
        }
        __syncthreads();
        const uint64_t job = s_job;
        if (job == stop_seq) return;          // shutdown sentinel
        const float* p = (const float*)slots[si].payload;
        float acc = 0.f;
        for (int i = tid; i < nfloat; i += WARP) acc += p[i];
        for (int o = 16; o > 0; o >>= 1) acc += __shfl_down_sync(0xffffffffu, acc, o);
        if (tid == 0) {
            slots[si].result = acc;
            __threadfence_system();           // result visible before the ack
            atomicExch_system((unsigned long long*)&slots[si].seq_out, job);
        }
        processed++;
    }
}

__global__ void sum_kernel(const float* p, int n, float* out) {
    float acc = 0.f;
    for (int i = threadIdx.x; i < n; i += blockDim.x) acc += p[i];
    for (int o = 16; o > 0; o >>= 1) acc += __shfl_down_sync(0xffffffffu, acc, o);
    if (threadIdx.x == 0) *out = acc;
}

// ---------------- helpers ----------------

static float cpu_ref(const char* payload, int nfloat) {
    // exact: payload floats are quarters
    const float* p = (const float*)payload;
    float acc = 0.f;
    for (int i = 0; i < nfloat; i++) acc += p[i];
    return acc;
}

static int listen_accept(int port) {
    int lfd = socket(AF_INET, SOCK_STREAM, 0);
    if (lfd < 0) die("socket");
    int one = 1;
    setsockopt(lfd, SOL_SOCKET, SO_REUSEADDR, &one, sizeof one);
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons((uint16_t)port);
    if (bind(lfd, (sockaddr*)&addr, sizeof addr) < 0) die("bind");
    if (listen(lfd, 1) < 0) die("listen");
    fprintf(stderr, "listening on %d ...\n", port);
    int fd = accept(lfd, nullptr, nullptr);
    if (fd < 0) die("accept");
    setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &one, sizeof one);
    close(lfd);
    return fd;
}

static void recvall(int fd, void* buf, size_t n) {
    char* p = (char*)buf;
    size_t got = 0;
    while (got < n) {
        ssize_t r = recv(fd, p + got, n - got, MSG_WAITALL);
        if (r <= 0) die("recv");
        got += (size_t)r;
    }
}

static int cmp_double(const void* a, const void* b) {
    double x = *(const double*)a, y = *(const double*)b;
    return x < y ? -1 : x > y ? 1 : 0;
}

static void print_pct(const char* name, double* v /* sorted */, int n) {
    printf(", \"%s_p50_us\": %.3f, \"%s_p90_us\": %.3f, \"%s_p99_us\": %.3f, \"%s_max_us\": %.3f",
           name, v[n / 2], name, v[(int)(n * 0.90)], name, v[(int)(n * 0.99) - 1], name, v[n - 1]);
}

static void device_info() {
    cudaDeviceProp prop{};
    cudaGetDeviceProperties(&prop, 0);
    int drv = 0, rt = 0;
    cudaDriverGetVersion(&drv);
    cudaRuntimeGetVersion(&rt);
    printf("{\"device\": \"%s\", \"cc\": \"%d.%d\", \"sms\": %d, \"driver\": \"%d.%d\", \"runtime\": \"%d.%d\"}\n",
           prop.name, prop.major, prop.minor, prop.multiProcessorCount,
           drv / 1000, drv % 1000, rt / 1000, rt % 1000);
}

int main(int argc, char** argv) {
    if (argc > 1 && !strcmp(argv[1], "info")) { device_info(); return 0; }
    const char* mode = "zero";
    int frame = 8192, count = 20000, port = 51777;
    for (int i = 2; i < argc; i++) {
        if (!strcmp(argv[i], "--mode") && i + 1 < argc) mode = argv[++i];
        else if (!strcmp(argv[i], "--frame") && i + 1 < argc) frame = atoi(argv[++i]);
        else if (!strcmp(argv[i], "--count") && i + 1 < argc) count = atoi(argv[++i]);
        else if (!strcmp(argv[i], "--port") && i + 1 < argc) port = atoi(argv[++i]);
        else { fprintf(stderr, "bad arg %s\n", argv[i]); return 2; }
    }
    if (frame > CAP || frame < 4 || frame % 4) {
        fprintf(stderr, "frame must be 4..%d bytes, multiple of 4\n", CAP);
        return 2;
    }
    const int nfloat = frame / 4;

    cudaFree(0);
    device_info();

    double* lat = (double*)calloc(count, sizeof(double));
    double* rec = (double*)calloc(count, sizeof(double));
    double t_start = 0, t_end = 0;
    int mismatches = 0;
    double max_relerr = 0.0;

    if (!strcmp(mode, "zero")) {
        Slot* ring = nullptr;
        cudaError_t e = cudaHostAlloc(&ring, sizeof(Slot) * NSLOTS, cudaHostAllocMapped);
        if (e != cudaSuccess) { fprintf(stderr, "cudaHostAlloc: %s\n", cudaGetErrorString(e)); return 1; }
        Slot* ring_dev = nullptr;
        cudaHostGetDevicePointer((void**)&ring_dev, ring, 0);
        memset((void*)ring, 0, sizeof(Slot) * NSLOTS);
        fprintf(stderr, "mapped pinned ring: host=%p dev=%p (same=%d)\n",
                (void*)ring, (void*)ring_dev, (void*)ring == (void*)ring_dev);

        const uint64_t STOP = UINT64_MAX;
        resident_ring<<<1, WARP>>>(ring_dev, NSLOTS, nfloat, STOP);
        e = cudaGetLastError();
        if (e != cudaSuccess) { fprintf(stderr, "launch resident: %s\n", cudaGetErrorString(e)); return 1; }

        // Warmup + doorbell proof before the sender connects: post local
        // jobs and wait for service. The resident warp's first service can
        // be slow (cold, co-tenant box); measurement starts only once the
        // doorbell is demonstrated.
        int warm_ok = 0;
        for (int w = 0; w < 16; w++) {
            Slot* s = &ring[w % NSLOTS];
            for (int j = 0; j < nfloat; j++)
                ((float*)s->payload)[j] = (float)((j + w) & 3) * 0.25f;
            const uint64_t job = (uint64_t)w + 1;
            const double tw0 = now_us();
            __atomic_store_n(&s->seq_in, job, __ATOMIC_RELEASE);
            int served = 0;
            for (;; ) {
                if (__atomic_load_n(&s->seq_out, __ATOMIC_ACQUIRE) >= job) { served = 1; break; }
                if (now_us() - tw0 > 5e5) break;   // 500 ms bound
            }
            if (!served) { fprintf(stderr, "warmup %d: doorbell not served in 500 ms\n", w); continue; }
            const float ref = cpu_ref(s->payload, nfloat);
            if (s->result != ref) {
                fprintf(stderr, "warmup %d: served but wrong result\n", w);
                printf("{\"mode\": \"zero\", \"frame_bytes\": %d, \"warmup_served\": %d, \"wrong_result\": true}\n", frame, warm_ok);
                return 5;
            }
            warm_ok++;
        }
        fprintf(stderr, "warmup: %d/16 jobs served doorbell-to-ack\n", warm_ok);
        if (warm_ok == 0) {
            printf("{\"mode\": \"zero\", \"frame_bytes\": %d, \"warmup_served\": 0, \"doorbell_unsupported\": true}\n", frame);
            return 6;
        }

        int fd = listen_accept(port);
        t_start = now_us();
        for (int i = 0; i < count; i++) {
            const uint64_t job = (uint64_t)i + 1 + 16;   // jobs continue after warmup
            Slot* s = &ring[(job - 1) % NSLOTS];
            const double t0 = now_us();
            recvall(fd, s->payload, (size_t)frame);   // frame lands directly in the ring slot
            const double t1 = now_us();
            __atomic_store_n(&s->seq_in, job, __ATOMIC_RELEASE);  // doorbell
            int hung = 0;
            while (__atomic_load_n(&s->seq_out, __ATOMIC_ACQUIRE) < job) {
                if (now_us() - t1 > 5e5) { hung = 1; break; }  // bounded: 500 ms
            }
            const double t2 = now_us();
            if (hung) {
                fprintf(stderr, "doorbell not served at job %d after 500 ms — aborting\n", i);
                printf("{\"mode\": \"zero\", \"frame_bytes\": %d, \"count\": %d, \"served\": %d, \"hang\": true}\n",
                       frame, count, i);
                fflush(stdout);
                _exit(3);   // the resident kernel must not outlive a hung lease
            }
            const float ref = cpu_ref(s->payload, nfloat);
            if (s->result != ref) {
                mismatches++;
                double r = fabs((double)s->result - (double)ref) / (fabs((double)ref) > 0 ? fabs((double)ref) : 1.0);
                if (r > max_relerr) max_relerr = r;
            }
            lat[i] = t2 - t1;
            rec[i] = t1 - t0;
        }
        t_end = now_us();
        qsort(lat, count, sizeof(double), cmp_double);
        qsort(rec, count, sizeof(double), cmp_double);
        int over100 = 0, over1ms = 0;
        for (int i = 0; i < count; i++) { if (lat[i] > 100) over100++; if (lat[i] > 1000) over1ms++; }
        printf("{\"mode\": \"zero\", \"frame_bytes\": %d, \"count\": %d, \"warmup_served\": %d", frame, count, warm_ok);
        print_pct("doorbell_to_result", lat, count);
        print_pct("recv", rec, count);
        printf(", \"wall_s\": %.3f, \"kfps\": %.1f, \"MBps\": %.1f, \"over_100us\": %d, \"over_1ms\": %d, \"mismatch\": %d, \"max_relerr\": %.3g}\n",
               (t_end - t_start) / 1e6,
               count / ((t_end - t_start) / 1e6) / 1000.0,
               (double)count * frame / 1e6 / ((t_end - t_start) / 1e6),
               over100, over1ms, mismatches, max_relerr);
        fflush(stdout);

        // Shutdown must not wait on the GPU: cudaDeviceSynchronize() here has
        // been observed (2026-11-01, lease googl1.ingress5) to sit in
        // dma_fence_default_wait for minutes behind co-tenant work with the
        // measurement already complete — the resident warp is starved, not
        // stuck. Post the sentinel and exit; process exit tears the context
        // and the warp down with the lease.
        {
            const uint64_t stop_job = (uint64_t)count + 16 + 1;
            __atomic_store_n(&ring[(stop_job - 1) % NSLOTS].seq_in, stop_job, __ATOMIC_RELEASE);
        }
        _exit(0);
    }

    if (!strcmp(mode, "naive")) {
        char* heap = (char*)malloc(frame);
        memset(heap, 0, frame);
        float* dev_in = nullptr;
        float* dev_out = nullptr;
        cudaMalloc(&dev_in, frame);
        cudaMalloc(&dev_out, 4);
        cudaStream_t stream;
        cudaStreamCreate(&stream);
        float h_out = 0.f;

        int fd = listen_accept(port);
        t_start = now_us();
        for (int i = 0; i < count; i++) {
            const double t0 = now_us();
            recvall(fd, heap, (size_t)frame);
            const double t1 = now_us();
            cudaMemcpyAsync(dev_in, heap, frame, cudaMemcpyHostToDevice, stream);
            sum_kernel<<<1, WARP, 0, stream>>>(dev_in, nfloat, dev_out);
            cudaMemcpyAsync(&h_out, dev_out, 4, cudaMemcpyDeviceToHost, stream);
            // bounded sync: the per-job path has been observed to stall on
            // this box (xp-batch: plain-launch mapped writes stalled at job 1)
            for (int spin = 0; ; spin++) {
                cudaError_t q = cudaStreamQuery(stream);
                if (q == cudaSuccess) break;
                if (q != cudaErrorNotReady) {
                    fprintf(stderr, "stream error at job %d: %s\n", i, cudaGetErrorString(q));
                    printf("{\"mode\": \"naive\", \"frame_bytes\": %d, \"count\": %d, \"served\": %d, \"stream_error\": true}\n",
                           frame, count, i);
                    fflush(stdout);
                    _exit(4);
                }
                if (spin > 5000) {   // ~5 s of 1 ms polls
                    fprintf(stderr, "per-job path stalled at job %d — aborting\n", i);
                    printf("{\"mode\": \"naive\", \"frame_bytes\": %d, \"count\": %d, \"served\": %d, \"hang\": true}\n",
                           frame, count, i);
                    fflush(stdout);
                    _exit(4);
                }
                usleep(1000);
            }
            const double t2 = now_us();
            const float ref = cpu_ref(heap, nfloat);
            if (h_out != ref) {
                mismatches++;
                double r = fabs((double)h_out - (double)ref) / (fabs((double)ref) > 0 ? fabs((double)ref) : 1.0);
                if (r > max_relerr) max_relerr = r;
            }
            lat[i] = t2 - t1;
            rec[i] = t1 - t0;
        }
        t_end = now_us();
        qsort(lat, count, sizeof(double), cmp_double);
        qsort(rec, count, sizeof(double), cmp_double);
        int over100 = 0, over1ms = 0;
        for (int i = 0; i < count; i++) { if (lat[i] > 100) over100++; if (lat[i] > 1000) over1ms++; }
        printf("{\"mode\": \"naive\", \"frame_bytes\": %d, \"count\": %d", frame, count);
        print_pct("copy_launch_to_result", lat, count);
        print_pct("recv", rec, count);
        printf(", \"wall_s\": %.3f, \"kfps\": %.1f, \"MBps\": %.1f, \"over_100us\": %d, \"over_1ms\": %d, \"mismatch\": %d, \"max_relerr\": %.3g}\n",
               (t_end - t_start) / 1e6,
               count / ((t_end - t_start) / 1e6) / 1000.0,
               (double)count * frame / 1e6 / ((t_end - t_start) / 1e6),
               over100, over1ms, mismatches, max_relerr);
        return 0;
    }

    fprintf(stderr, "unknown mode %s\n", mode);
    return 2;
}
