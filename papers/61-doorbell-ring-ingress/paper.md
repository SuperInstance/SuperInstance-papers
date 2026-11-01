# The Three-Microsecond Doorbell: Resident Kernels and Zero-Copy Ingress on a Unified-Memory SoC

**Series:** papers/61 (topic-folder series)
**Date:** 2026-11-01
**Projects:** `Thor`, `builder-ide`
**Status:** working paper, with measurements (two independent prior runs and the ingress run of 2026-11-01)

---

## Abstract

On the Jetson AGX Thor — a SoC whose CPU and GPU share one physical LPDDR5X
pool — a CUDA kernel that stays resident and polls a work ring in mapped
pinned memory serves jobs with a **measured p50 of 3.0 µs** from CPU enqueue
to GPU result (p99 5.4 µs, 313 k jobs/s, max relative error 2.4e-08 over
100,000 jobs). Every per-job submission path measured on the same box, in the
same processes, is 12–23× slower at p50 (torch-captured CUDA Graph 34.9 µs;
plain launch 53–69 µs) — and the per-job paths collapse outright under a
resident background workload, serving **1 launch in 1200**, where the ring
keeps serving at 3 µs co-tenant. The same coherent memory admits a zero-copy
ingress path: a network frame received by the CPU **directly into a ring
slot** and consumed in place by the resident kernel, with no staging copy
and no per-job launch. This paper states the mechanism precisely, derives the
cost model and its crossover, reports the two independent ring measurements
plus the ingress experiment's measured naive arm (launch-dominated at
30.8/36.4 µs p50 at 1/8 KiB, bit-exact over 70,000 frames) with the
zero-copy arm's run designed, pass-barred and still queued when the box
saturated, gives a standing regression with a pass bar, and delimits what is
*not* claimed: no bare metal, no driver bypass, no NIC DMA — the
driver-mediated path is the fast one, and the measurements say so.

---

## 1. The claim, precisely

Let a *job* be a small unit of GPU work: an input buffer of $B$ bytes already
in memory, a kernel $K$ over it, and a result observable by the CPU. Three
claims, all measured on one box (NVIDIA Thor, sm_110, cc 11.0, 20 SMs, CUDA
13.2 driver 13020, 122.8 GiB unified LPDDR5X, measured streaming ~239.7 GB/s):

1. **Dispatch.** A resident kernel polling a mapped pinned ring serves a job
   in $R \approx 3\,\mu s$ p50 (CPU enqueue → result observed), sustained at
   $\sim 314$ k jobs/s, with results checked against a host reference.
2. **Dominance.** Every per-job submission path measured on this box costs
   $c_{\text{launch}} \in [35, 69]\,\mu s$ p50 — an order of magnitude over
   $R$ — and under a resident background kernel, per-job service collapses
   (1 of 1200 launches served) while the ring continues to serve.
3. **Ingress.** Because the CPU and GPU addresses of a mapped pinned buffer
   are the same physical bytes, a frame received by `recv()` directly into a
   ring slot is consumable in place by the resident kernel: zero staging
   copies beyond the socket's own skbuf copy, zero per-job launches.

Claims 1 and 2 were measured twice, independently, on 2026-11-01 (the
`xp-batch` chain at 06:55–07:58 and the googl1-digest seat's own probes).
Claim 3 is measured on its naive arm and designed-with-pass-bar on its
zero-copy arm (§5.3, probe `wire_ingress.cu` in this folder).

---

## 2. Mechanism

The ring is deliberately small enough to state in full:

- **Slots.** `NSLOTS` slots in one `cudaHostAlloc(..., cudaHostAllocMapped)`
  buffer. Each slot is 128-byte aligned: a header line (`seq_in`, `seq_out`,
  `result`) and a payload area of up to 8 KiB. The header occupies its own
  cache line so payload traffic never shares a line with the doorbell.
- **Doorbell.** The CPU writes the job's payload into the slot, then
  release-stores the job number into `seq_in`. The GPU's polling lane
  acquire-reads `seq_in` (an atomic read — never a plain spin on a
  non-volatile, which the compiler is entitled to delete).
- **Service.** A single resident warp: lane 0 is the only thread that touches
  mapped host memory in the poll loop; when a job appears, all lanes sum the
  payload cooperatively, lane 0 writes `result`, issues
  `__threadfence_system()`, and release-stores the job number into `seq_out`.
  The CPU acquire-reads `seq_out` and reads the result.
- **Shutdown.** A sentinel job number ends the kernel; the lease never
  outlives the measurement.

Two measured pitfalls make or break this design on the Thor (both recorded in
`docs/lab/xp-batch/persistent-queue.md`):

1. **Politeness is load-bearing.** A 20,480-thread grid spinning on one
   mapped word never observed host writes; a single poller with
   `__nanosleep(200)` sees them every ~3 µs. The doorbell is polled by one
   lane, not by the grid.
2. **Atomic acquire/release is mandatory.** A non-volatile empty spin loop
   (`while (*hseq != want);`) was deleted by the compiler (forward-progress
   UB). Every cross-device wait in the measured code is an atomic load with
   acquire semantics; every doorbell is a release store.

No green context, no priority stream, no graph capture, no SASS, no
privileged access is involved. The whole mechanism is stock CUDA 13.2 on
stock JetPack, under an ordinary memory-admission lease.

---

## 3. Why the memory must be coherent — and why this SoC qualifies

The ring is one buffer read and written by both devices. That requires, per
direction: (a) a single physical backing store (unified DRAM — no PCIe hop,
no separate VRAM); (b) mapped pinned allocation so the GPU can dereference
the CPU's address (`cudaHostAllocMapped`; on Tegra-class SoCs the device
pointer equals the host pointer); and (c) system-scope visibility ordering —
the release store on the CPU must become visible to the polling lane before
the payload writes can be reordered past it, in *both* directions.

Fact (b)-plus-(c) was probed directly on 2026-11-01: a bounded single-thread
probe saw host→device and device→host mapped visibility both **YES**
(`docs/lab/xp-batch/persistent-queue.md`; the digest seat's coherence probe
agrees). Fact (a) goes further than the ring needs: on 2026-10-30
(`docs/lab/exp-unified-memory.md`) a 4 GiB buffer owned by the host's plain
`malloc` was found to be a *valid device address* under unified virtual
addressing (`cudaPointerGetAttributes`: `devicePointer == hostPointer`,
unregistered), and a CUDA kernel read and **wrote it in place** — the NumPy
owner saw the GPU's writes, checksums identical, no copy in either direction.
The bandwidth measurement in the same experiment sets the constants the model
of §4.1 needs: a zero-copy streaming read of host memory runs at **100.9
GB/s** — the same per-byte speed as reading a device-resident copy (no
unified-memory penalty to engineer around) — while the explicit H2D API copy
runs at ~88 GB/s and exists *in addition to* the read on the copy path
(copy + read = 2.15× the zero-copy read). Coherence plus UVA is what makes a
doorbell a write instead of a launch, and lets a socket hand a frame to a
kernel without a copy in between.

---

## 4. The cost model, derived

### 4.1 Dispatch decomposition

Write the per-job cost of the two paths as functions of the payload size $B$:

$$C_{\text{naive}}(B) = c_{\text{recv}} + \underbrace{\frac{B}{\beta_{\text{api}}}}_{\text{H2D copy}} + c_{\text{launch}} + \underbrace{\frac{4}{\beta_{\text{api}}}}_{\text{D2H result}} + c_{\text{sync}}$$

$$C_{\text{ring}}(B) = c_{\text{recv}} + t_{\text{store}} + t_{\text{poll}} + \underbrace{\frac{B}{\beta_{\text{read}}}}_{\text{kernel reads slot}} + t_{\text{exec}} + t_{\text{ack}}$$

with $\beta_{\text{api}}$ the effective API-copy bandwidth and
$\beta_{\text{read}}$ the SM's streaming read bandwidth. On this box both are
measured (4 GiB buffers, `exp-unified-memory.md`): zero-copy read of host
memory $\beta_{\text{read}} \approx 100.9$ GB/s; explicit H2D API copy
$\beta_{\text{api}} \approx 86$–$88$ GB/s — and a pageable destination (the
naive habit of allocating the receiving buffer per call) collapses to
**0.34 GB/s**, 258× slower, without ever failing. So the asymmetry is
structural: $\beta_{\text{api}} \le \beta_{\text{read}}$ (measured), the API
copy exists *on top of* the consumption read rather than replacing it, and
the per-job path additionally pays
$c_{\text{launch}} \in [35, 69]\,\mu s$.

**Proposition (dominance, no crossover).** If
$c_{\text{launch}} + c_{\text{sync}} > t_{\text{store}} + t_{\text{poll}} +
t_{\text{ack}}$ and $\beta_{\text{api}} \le \beta_{\text{read}}$, then
$C_{\text{naive}}(B) > C_{\text{ring}}(B)$ for all $B$.
*Proof:* subtract the two expressions; the difference
$\left(c_{\text{launch}} + c_{\text{sync}}\right) - \left(t_{\text{store}} +
t_{\text{poll}} + t_{\text{ack}}\right) + B\left(\beta_{\text{api}}^{-1} -
\beta_{\text{read}}^{-1}\right)$ is positive at $B = 0$ by the first
hypothesis and non-decreasing in $B$ by the second. $\square$

With the measured constants (35–69 µs vs ~0.4 µs of doorbell+ack machinery)
the margin is more than an order of magnitude at $B = 0$ and grows with $B$.
There is no payload size at which the per-job path wins on this machine.

### 4.2 The ring's own scaling

$R(B) = R_0 + B/\beta_{\text{ring}}$ where $R_0$ is the fixed round trip and
$\beta_{\text{ring}}$ absorbs the slot's write path (CPU stores into the
pinned slot during `recv()` are off the measured window) and the kernel's
read. §5.3's naive arm confirms the launch term at both sizes directly
(30.8 → 36.4 µs p50 for 1 → 8 KiB); the zero arm's two-point fit of $R_0$
and $\beta_{\text{ring}}$ awaits the queued lease.
`persist_queue`'s independent scaling note (jobs 8× bigger scale
proportionally until the copy path saturates) is the same line.

### 4.3 Throughput and Little's law

The serial loop holds exactly one job in flight per completion, so by
Little's law $L = X R$: the measured $X = 313{,}155$ jobs/s and $R$ (mean)
give $L = X \cdot \bar R = 313{,}155 \times 3.19\,\mu s \approx 1.0$ — the
measurement is internally consistent with one job in flight. Pipelined
posting raises $L$ toward `NSLOTS` (64 here) and $X$ toward
$1/\max(R, t_{\text{exec}})$; that regime is the `persist_queue` throughput
configuration, not the per-frame latency configuration of §5.3.

### 4.4 Ingress traffic accounting (the copies, counted)

For each $B$-byte frame, beyond the socket's own skbuf copy (paid by both
paths), the naive path adds: read $B$ + write $B$ by the API copy, plus a
4 B result copy — call it $2B$ extra DRAM traffic. The zero-copy path adds
only the kernel's consumption read (traffic it must do anyway to compute on
the frame) and a 4 B result write into the slot. At the wire's ceiling
(4×25 GbE ≈ 12.5 GB/s aggregate ingress) the naive extra traffic is
$\le 25$ GB/s, ~10% of the measured 239.7 GB/s: **the win is not throughput
but the per-frame $\mu s$ and the freed submission machinery** — consistent
with the network being the bottleneck by more than an order of magnitude
(part 05 of the digest).

### 4.5 Service under contention

The ring is itself a resident kernel, so the scheduling property that starves
per-job launches under a resident background (`xp-batch/stream-priority`:
1 of 1200 launches served at both default and highest stream priority —
priorities do not preempt resident work on this driver) is exactly what
shields it. A Green Context split restores per-job *service* (1195 of 1200
live launches served, overlap 1.00, correctness 3.4e-06) at a measured
latency price (live p50 0.737 ms vs 0.117 ms idle): a **service floor, not a
latency mechanism**, because SM partitioning does not partition DRAM
(`xp-batch/green-contexts`, `docs/lab/exp-mig.md`). The ring needs no floor
to serve — but a floor keeps the rest of the box honest while it does.

---

## 5. Measurements

All on one box: NVIDIA Thor sm_110 (cc 11.0), 20 SMs, CUDA 13.2 driver
13020, 122.8 GiB unified DRAM, co-tenant throughout (night leases, model
servers, render sweeps), clocks not lockable from the seat (`nvidia-smi`
reports N/A on Thor). Every number below was checked for correctness against
a host reference; jobs whose inputs make summation order matter were
constructed from exact quarter-valued floats so the check is bit-exact.

### 5.1 The ring vs per-job dispatch (measured twice, independently)

| Run (2026-11-01) | Path | p50 | p99 | Throughput | max rel err |
|---|---|---|---|---|---|
| `xp-batch/persist_queue` 07:56 | resident kernel + pinned ring | **3.01 µs** | **5.41 µs** | **314 k jobs/s** | 2.4e-08 |
| googl1-digest seat (same morning) | resident kernel + pinned ring | **3.03 µs** | **5.42 µs** | **313,155 jobs/s** | 2.41e-08 |
| `xp-batch` | torch-captured CUDA Graph per job | 34.9 µs | 4657 µs | 9.8 k jobs/s | 6.0e-08 |
| `xp-batch` | plain per-job launch (job 0) | 53.1 µs | — | stalled at job 1* | 2.4e-08 |
| digest seat | plain per-job launch | 69.27 µs | — | 99,991 jobs/s, then stall* | 2.41e-08 |

\* The plain per-job path's mapped-result writes stopped becoming visible
after the first job in both runs (device results were correct on later
synchronization; mechanism unknown — recorded verbatim in
`persistent-queue.md`). The torch-graph path's p99 (4.7 ms) is the
stall-under-contention showing through.

Job = 64-float dot product, 100,000 jobs per variant, latency measured host
clock from hand-off (slot write / copy issue) to result observed on the host.

### 5.2 The service floor under load (for context)

From `xp-batch/green-contexts` (5 repeats × 4 conditions, 1200 launches per
12 s window): idle live p50 0.117 ms; under a heavy background with no
split, **1/1200** launches served; with stream priorities, **1/1200**; with
a 4+16 SM green split, **1195/1200** at live p50 0.737 ms, p99 5.418 ms.
Concurrent SGEMMs in the two partitions overlapped 1.00 with max rel err
3.4e-06; green contexts share the primary context's address space (buffers
cross without copies; modules must load per context; green streams require
`CU_STREAM_NON_BLOCKING`).

### 5.3 Wire→tensor ingress: zero-copy vs naive (the new run)

Probe: `thor-probe/wire_ingress.cu` (this folder, aux), built
`nvcc -O3 -arch=sm_110` on the box, run 2026-11-01 under a 512 MB study
lease of `thor-admit` (label `googl1.ingress3`), co-tenant. A TCP sender
(plain C, same pattern source) streams fixed-size frames; the receiver does
one of two things per frame:

- **zero:** `recv()` directly into the current ring slot's payload, release
  the doorbell, wait for the resident warp's ack (bounded 2 s), read the
  result from the slot.
- **naive:** `recv()` into a heap buffer, `cudaMemcpyAsync` H2D, per-job
  `sum_kernel` on a stream, 4 B D2H result, bounded stream sync.

Job = sum of the frame's floats (a dot with the ones vector). Payload floats
are exactly representable quarters, so GPU and CPU sums agree bit-exactly in
any order; `mismatch` counts any disagreement. Both modes are serial per
frame — the per-frame round trip, not pipelined throughput (§4.3). The
measured window starts when `recv()` returns, so the comparison isolates
{copies + submission + consumption + result} from socket timing.

The naive arm ran to completion, twice, bit-exact; the zero-copy arm's
re-run did not clear the box's admission queue before this paper's seat
ended. Both facts are recorded here in full.

**The naive arm (measured, 2026-11-01 09:48, 70,000 frames total).** One
probe bug was found and corrected in the process — the first build's clock
helper multiplied nanoseconds instead of dividing, so its printed durations
were inflated ×1000 (per-frame *differences* are unaffected up to a
negligible second-boundary term: a ~31–36 µs window straddles a 1 s boundary
in ≈ 1.5 of 50,000 frames). After unit correction:

| naive arm | p50 | p90 | p99 | max | mismatch |
|---|---|---|---|---|---|
| 1 KiB × 50,000 | **30.8 µs** | 33.6 µs | 43.7 µs | 2455 ms | 0 |
| 8 KiB × 20,000 | **36.4 µs** | 40.8 µs | 55.3 µs | 5922 ms | 0 |

The distribution is launch-dominated and tight (p50→p99 within 1.8×), with
rare multi-second stalls — the same per-job stall-under-contention behavior
`persist_queue` recorded, resurfacing in the ingress setting. This is the
model's $c_{\text{launch}}$ term measured directly: the copy+launch+sync
structure behind `recv()` costs ~31–36 µs per frame on this box, with the
payload's 8× size step moving p50 by only 5.6 µs.

**The zero-copy arm (designed, pass bar pre-registered; run pending).** The
first attempt aborted at its (mis-scaled) 2 µs clock bound before the
resident warp's first service — a probe artifact, not a mechanism result
(the same run's warmup-less design gave the cold kernel no grace). The probe
now carries a pre-connect warmup (16 local doorbell jobs, each bit-exact
against a host reference, else `doorbell_unsupported` is reported), a
500 ms per-frame bound, and the corrected clock. The corrected re-run was
queued under a study lease the same morning; the box saturated (its
admission queue spent most of the session head-of-line blocked behind
24–26 GB render and model-server leases, and by ~10:30 the ssh endpoint
itself was timing out under load), so the lease did not clear before this
seat ended. The lease stands queued with a bounded, ~10 s, 512 MB
measurement behind it: when the box opens, the numbers land in
`~/googl1-ingress/results/` on the Thor and the first row of this table's
zero arm is a retrieval, not a project.

**Pass bar (stated before the run).** (a) zero p50 < naive p50 at both frame
sizes; (b) `mismatch = 0` in both modes (coherence + correctness); (c) any
stall in the naive path is recorded verbatim, not retried away. **Result:** naive arm — measured, bit-exact over 70,000 frames, launch-
dominated at 30.8/36.4 µs p50 (1/8 KiB) with rare multi-second stalls
recorded verbatim (bar (c) met; bar (b) met for the naive arm). Zero-copy
arm — bar (a) is **not yet evaluated**: the corrected run's lease did not
clear the box's queue within the seat (the attempt, the probe bug it caught,
and the standing lease are recorded above and in `measurement.md`).

*Scope of this run, honestly:* loopback TCP on the Thor — the frame
traverses the kernel socket stack but not an external NIC, and nothing here
exercises GPUDirect RDMA (no such NIC on this box). The measured claim is
the copy/dispatch structure *behind* `recv()`, which is identical for any
socket source; the NIC→skbuf stage ahead of it is untested (§7).

---

## 6. The standing regression (the gate, not the report)

Any scheduler change on this box re-runs:

1. **Ring dispatch:** 100 k jobs through the ring; gate: p50 < 5 µs,
   p99 < 10 µs, max rel err < 1e-06 vs host reference.
2. **Ingress:** the §5.3 pair at 1 KiB and 8 KiB; gate: zero p50 < naive p50
   at both sizes, zero mismatches.
3. **Service floor:** the green-split condition under a heavy background;
   gate: ≥ 99% of live launches served (1195/1200 measures 99.6%).

Cost of the whole gate: minutes on the shared box, no privileged access.

---

## 7. What this paper does not claim

- **No bare metal, and none needed.** Every mechanism here is
  driver-mediated CUDA on stock JetPack. The digest's bare-metal programme
  (custom EL3, owned page tables, raw SASS, MMIO doorbells) is either
  impossible on the signed boot chain or buys nothing the ring does not
  already buy — the 3 µs number *is* the driver stack's number.
- **No NIC DMA.** The ingress measurement is socket-level. The GPUDirect
  variant (NIC DMA directly into GPU-addressable memory, `nvidia-peermem`)
  requires a ConnectX-7-class NIC this box does not carry, and whether the
  NIC's DMA can target the GPU's page-table region on this platform is
  untested — plausible but unverified (digest part 05). The experiment that
  would settle it: same §5.3 harness, RDMA receive into a
  `cudaHostAllocMapped`/device buffer instead of a socket, pass bar
  unchanged (zero p50 < naive p50; zero mismatches). Designed, not run.
- **Tiny jobs, one node.** Jobs here are µs-scale over ≤ 8 KiB payloads on
  one SoC. Nothing is claimed about large kernels (launch cost amortizes),
  multi-node fabrics (Thor has 4×25 GbE, no NVLink), or training-scale work.
- **Clocks unlocked.** `nvidia-smi` reports clocks as N/A on Thor and
  `jetson_clocks` needs root, so absolute numbers carry DVFS variance; the
  comparisons are same-box, same-window, co-tenant.
- **Co-tenancy.** All runs shared the box with live leases. That is the
  deployment condition the runtime is for, and the service-collapse numbers
  are *because* of it — but it means idle-box numbers would read lower
  still.

---

## 8. Related work

- **Persistent threads.** The resident-kernel-with-work-queue pattern
  predates this box by nearly two decades: Aila & Laine introduced
  persistent-thread scheduling for GPU ray tracing (HPG 2009); Cederman &
  Tsigas built work-stealing queues on GPUs (Graphics Hardware 2008);
  Gupta, Stuart & Owens characterized the persistent-threads style
  systematically (InPar 2012); Chatterjee, Grossman, Sbirlea & Sarkar used
  it for dynamic task parallelism with a GPU work-stealing runtime (LCPC
  2011). This paper's contribution is not the pattern but the measurement on
  a coherent unified-memory SoC in 2026: the queue hand-off itself is a
  memory write, so the dispatch cost collapses to ~3 µs and doubles as the
  ingress path.
- **Launch overhead.** Kernel launch cost on discrete GPUs has been
  characterized at ~3–30 µs since the CUDA Handbook's launch benchmarks
  (Wilt, 2013) and NVIDIA's own dynamic-parallelism analysis (NVIDIA, CUDA
  Dynamic Parallelism whitepaper, 2012), whose device-side launch costs
  motivated CUDA Graphs (NVIDIA, CUDA Programming Guide, 2019+) and, on our
  box, the torch-graph baseline of §5.1. Our measured 35–69 µs p50 for
  per-job paths is on the high end — a shared, co-tenant, unlocked-clock
  box — which is precisely the deployment condition of an unattended agent.
- **Resident serving loops.** Iteration-level scheduling (Orca, Yu et al.,
  OSDI 2022) and continuous batching (vLLM, Kwon et al., SOSP 2023) keep the
  serving loop resident to amortize per-iteration overheads for exactly the
  reason of §4.1; the doorbell ring is the same argument taken to the
  dispatch itself.
- **Green Contexts.** CUDA 12.4 introduced SM-partitioned green contexts
  (CUDA Programming Guide); NVIDIA documents them and compute-only MIG (10
  TPCs) on Jetson Thor ("What's New in CUDA Toolkit 13.0 for Jetson
  Thor"). §4.5's floor-vs-latency reading is a measurement of that
  mechanism's scope on this box.
- **Zero-copy memory on Tegra-class SoCs.** Mapped pinned memory and
  unified addressing on NVIDIA's Tegra/Jetson line (Jetson Linux docs;
  CUDA C Programming Guide, "Unified Virtual Addressing" and mapped pinned
  sections) make the CPU↔GPU copy a software convention rather than a
  hardware necessity — the fact §3 leans on.
- **GPU networking.** PacketShader (Han et al., SIGCOMM 2010) paid explicit
  PCIe copies to bring packets to GPUs; Kalia, Kaminsky & Andersen (NSDI
  2015) raised the bar with RDMA NICs writing toward GPU memory; NVIDIA's
  GPUDirect RDMA and DOCA GPUNetIO productize the NIC-DMA path. On a
  unified-memory SoC the intermediate rung — socket straight into coherent
  pinned memory — needs none of that hardware, which is §5.3's point and
  §7's boundary.
- **Queueing.** Little (Operations Research 9(3), 1961) — the consistency
  check of §4.3.

---

## 9. Conclusion

The useful yield of the bare-metal brainstorm, measured on the machine it
was written for, is a doorbell: a pinned ring, one resident warp, atomic
acquire/release, and a socket that writes frames where the kernel reads
them. It costs hours to adopt, needs nothing privileged, serves at 3 µs p50
under load, and makes the per-job launch — not the driver, not the OS — the
thing that was slow. The runtime that follows (part 13 of the digest): the
ring for dispatch, one coherent pool, a Green Context floor for live work, a
128-byte cell record, a differential check on every numeric path.

---

## Appendix: provenance

- Two independent prior runs: `docs/lab/xp-batch/persistent-queue.md`
  (07:56–07:58, 2026-11-01, lease `xp-batch.chain`) and the googl1-digest
  seat's probes (same morning, same box); Green Context and
  stream-priority numbers from `docs/lab/xp-batch/green-contexts.md`,
  `gc-probe.md`, `stream-priority.md`; MIG from `docs/lab/exp-mig.md`;
  NVFP4/tensor-core facts from `thor-fp4/BENCHMARKS.md` (all in
  `builder-ide`).
- The ingress attempt of §5.3: `thor-probe/wire_ingress.cu` and
  `thor-probe/sender.c` (committed as aux files here — the committed copies
  are the corrected builds with the warmup and honest bounds), raw JSON of
  both attempts in `measurement.md` (this folder), leases `googl1.ingress3`
  and `googl1.ingress4`, study tier, 2026-11-01.
- The digest itself: `googl1-digest/docs/00…13` (parts 02, 03, 04, 05, 06,
  13 are this paper's direct antecedents).
