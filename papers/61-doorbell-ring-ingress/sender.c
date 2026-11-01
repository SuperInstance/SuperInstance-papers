// sender.c — paced TCP frame source for wire_ingress.cu (no CUDA, plain POSIX)
//
// Payload floats are drawn from {0, 0.25, 0.5, 0.75} by a deterministic hash
// of (frame, index), so both sides sum them exactly in any order.
//
// Build: gcc -O2 -o sender sender.c
// Usage: ./sender --host H --port P --frame BYTES --count N [--pace-us U]

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <time.h>
#include <unistd.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <arpa/inet.h>
#include <sys/socket.h>

static double now_us(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1e6 + ts.tv_nsec / 1000.0;
}

static uint32_t hash32(uint32_t x) {
    x ^= x >> 16; x *= 0x7feb352dU;
    x ^= x >> 15; x *= 0x846ca68bU;
    x ^= x >> 16;
    return x;
}

int main(int argc, char** argv) {
    const char* host = "127.0.0.1";
    int port = 51777, frame = 8192, count = 20000, pace_us = 0;
    for (int i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "--host") && i + 1 < argc) host = argv[++i];
        else if (!strcmp(argv[i], "--port") && i + 1 < argc) port = atoi(argv[++i]);
        else if (!strcmp(argv[i], "--frame") && i + 1 < argc) frame = atoi(argv[++i]);
        else if (!strcmp(argv[i], "--count") && i + 1 < argc) count = atoi(argv[++i]);
        else if (!strcmp(argv[i], "--pace-us") && i + 1 < argc) pace_us = atoi(argv[++i]);
        else { fprintf(stderr, "bad arg %s\n", argv[i]); return 2; }
    }
    if (frame % 4 || frame < 4) { fprintf(stderr, "frame must be multiple of 4\n"); return 2; }
    const int nfloat = frame / 4;
    float* buf = malloc(frame);

    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) { perror("socket"); return 1; }
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof addr);
    addr.sin_family = AF_INET;
    addr.sin_port = htons((uint16_t)port);
    if (inet_pton(AF_INET, host, &addr.sin_addr) != 1) { fprintf(stderr, "bad host\n"); return 1; }
    if (connect(fd, (struct sockaddr*)&addr, sizeof addr) < 0) { perror("connect"); return 1; }
    int one = 1;
    setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &one, sizeof one);

    double t0 = now_us();
    for (int i = 0; i < count; i++) {
        if (pace_us > 0) {
            double target = t0 + (double)i * pace_us;
            while (now_us() < target)
                ;  // busy pace: sleep granularity is coarser than the target
        }
        for (int j = 0; j < nfloat; j++) {
            uint32_t h = hash32((uint32_t)i * 2654435761u ^ (uint32_t)j * 40503u);
            buf[j] = (float)(h >> 30) * 0.25f;   // exact quarters
        }
        size_t sent = 0;
        while (sent < (size_t)frame) {
            ssize_t s = send(fd, (char*)buf + sent, frame - sent, 0);
            if (s <= 0) { perror("send"); return 1; }
            sent += (size_t)s;
        }
    }
    double t1 = now_us();
    double wall = (t1 - t0) / 1e6;
    printf("{\"sent\": %d, \"frame_bytes\": %d, \"wall_s\": %.3f, \"kfps\": %.1f, \"MBps\": %.1f, \"pace_us\": %d}\n",
           count, frame, wall, count / wall / 1000.0, (double)count * frame / 1e6 / wall, pace_us);
    close(fd);
    return 0;
}
