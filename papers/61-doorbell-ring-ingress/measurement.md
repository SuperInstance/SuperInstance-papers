# measurement.md — the wire→tensor ingress attempts of 2026-11-01

Receiver: `wire_ingress.cu` (this folder — the **corrected** build), built
`/usr/local/cuda/bin/nvcc -O3 -arch=sm_110` on the Thor. Sender: `sender.c`,
`gcc -O2`, loopback on the box (§7 of the paper explains why the comparison
is insensitive to the sender's location: the measured window starts when
`recv()` returns). Job = sum of the frame's floats; payload floats are exact
quarters, so GPU and CPU sums are bit-exact in any order and `mismatch`
counts true disagreements. Serial per frame: recv → doorbell (zero mode) or
copy+launch (naive) → result observed, with per-frame abort bounds so the
lease can never spin on the shared box.

All under `thor-admit` (study tier, 512 MB) on the shared, co-tenant box.
Clocks not lockable (`nvidia-smi` N/A on Thor). Device: NVIDIA Thor, cc 11.0,
20 SMs, CUDA 13.2 driver 13020.

## Attempt 1 — 09:48, lease `googl1.ingress3` (ran; clock bug found)

The first build's `now_us()` computed `tv_sec*1e6 + tv_nsec*1e3` —
nanoseconds multiplied where they should be divided — so every printed
duration was inflated ×1000. Two consequences:

- The zero mode's "2 s" hang bound was effectively 2 µs: every run aborted
  at job 0 before the resident warp's cold first service
  (`{"served": 0, "hang": true}`). No mechanism conclusion can be drawn
  from it.
- The naive mode's numbers are inflated but **unit-correctable**: per-frame
  differences are linear in the true duration, and the only distortion is
  the second-boundary discontinuity, which a 31–36 µs window straddles in
  ≈ 1.5 of 50,000 frames — negligible at the percentiles reported.

**Naive arm, corrected (÷1000), 70,000 frames, 0 mismatches:**

| frame | count | p50 | p90 | p99 | max | recv p50 |
|---|---|---|---|---|---|---|
| 1 KiB | 50,000 | 30.82 µs | 33.56 µs | 43.71 µs | 2455 ms | 1.20 µs |
| 8 KiB | 20,000 | 36.42 µs | 40.84 µs | 55.29 µs | 5922 ms | 1.41 µs |

The rare multi-second maxima are the same per-job stall-under-contention
behavior `xp-batch/persist_queue` recorded, resurfacing in the ingress
setting; the distribution is otherwise tight (p50→p99 within 1.8×). The
run-1 harness lacked the over-threshold counters (added in the corrected
build), so the >1 ms counts are unknown; maxima are reported as observed.

Raw JSON of attempt 1 (as printed, inflated ×1000):

```
{"mode": "zero", "frame_bytes": 1024, "count": 50000, "served": 0, "hang": true}
{"mode": "zero", "frame_bytes": 8192, "count": 20000, "served": 0, "hang": true}
{"mode": "naive", "frame_bytes": 1024, "count": 50000, "copy_launch_to_result_p50_us": 30824000.000, "copy_launch_to_result_p90_us": 33556000.000, "copy_launch_to_result_p99_us": 43714000.000, "copy_launch_to_result_max_us": 2455378000.000, "recv_p50_us": 1204000.000, "recv_p90_us": 1436000.000, "recv_p99_us": 10602000.000, "recv_max_us": 77204000.000, "mismatch": 0, "max_relerr": 0}
{"mode": "naive", "frame_bytes": 8192, "count": 20000, "copy_launch_to_result_p50_us": 36416000.000, "copy_launch_to_result_p90_us": 40844000.000, "copy_launch_to_result_p99_us": 55287000.000, "copy_launch_to_result_max_us": 5922392000.000, "recv_p50_us": 1407000.000, "recv_p90_us": 3907000.000, "recv_p99_us": 13427000.000, "recv_max_us": 52436000.000, "mismatch": 0, "max_relerr": 0}
```

(The two `wall_s` fields printed negative values — the same boundary
discontinuity applied across the whole loop — which is how the bug was
caught. Sender counts: 50,000 and 20,000 frames sent, connection reset for
the zero configs when the receiver aborted.)

## Attempt 2 — from 09:53, lease `googl1.ingress4` (queued; did not survive)

*(Superseded by Attempt 3, same day.)* The corrected build adds: the fixed
clock; a 16-job pre-connect warmup that proves the doorbell bit-exact before
any measurement (and reports `doorbell_unsupported` honestly if it fails); a
500 ms per-frame bound; per-frame over-100 µs / over-1 ms counters. The lease
(512 MB, study tier, label `googl1.ingress4`, ~10 s of bounded work) was
queued behind the box's own traffic — the admission queue spent most of the
session head-of-line blocked behind 24–26 GB render and model-server leases,
the pool stayed between 36 MB and 4.5 GB, and by ~10:30 the Thor's ssh
endpoint itself was timing out under load. **Correction (11:15, the next
seat): the lease did not survive in the queue** — at 11:15 the queue was
empty, the ledger showed no `googl1.ingress*` run, and
`~/googl1-ingress/results/` did not exist. The "retrieval, not a project"
expectation below was wrong; the run had to be resubmitted, which Attempt 3
did.

> Superseded text (kept visible per DOC-RULES): "The lease remained queued
> (position 2–3) when this seat ended. When the box opens, the run executes
> unattended and its results land in `~/googl1-ingress/results/` on the Thor:
> retrieval, not a project."

## Attempt 3 — 11:21–11:31, lease `googl1.ingress5` (ran to completion; **PASS**)

The box was healthy at 11:15 (85.8 GB free, queue empty, three co-tenant
leases: `serve.qwen3-coder-30b` 26 G, `serve.d1-3B`, `infinigen.desert.coarse`
— an active GPU render throughout). Two sub-attempts:

**3a (11:21) — hung at shutdown; probe fixed.** Run 1 of `runall.sh`
(zero/1 KiB/500) drained all frames — the sender finished in 1 ms (loopback
buffers absorb 500 KiB), the socket went CLOSE-WAIT with Recv-Q 0 — but the
receiver sat in `dma_fence_default_wait` for minutes. Diagnosis from the
source: the zero path printed its JSON only *after*
`cudaDeviceSynchronize()`, and that sync waits for the resident warp to
observe the STOP sentinel — which it cannot do promptly while co-tenant work
occupies the GPU (the warp is starved, not stuck; this is the same
starvation-under-contention behavior §5.2 of the paper records). The
measurement was complete and unreported. Both stuck processes were the
lease's own (PIDs 27547/27555, verified before the kill) and were killed.
**Probe correction (second):** print and flush the JSON before the shutdown
sentinel, post the sentinel, and `_exit(0)` without a device sync — process
exit tears the context and the warp down with the lease. `now_us()` was
re-checked: plain `clock_gettime(CLOCK_MONOTONIC)`, not event-based; the
hang was purely the shutdown sync. The corrected `wire_ingress.cu` in this
folder is this build (`nvcc -O3 -arch=sm_110`, 11:29).

**3b (11:29) — all five configs completed, one lease, same co-tenancy.**

| mode | frame | count | p50 | p90 | p99 | max | over 1 ms | mismatch |
|---|---|---|---|---|---|---|---|---|
| zero | 1 KiB | 50,000 | **3.21 µs** | 4.35 µs | 7.09 µs | 150 µs | 0 | 0 |
| naive | 1 KiB | 50,000 | 29.32 µs | 34.33 µs | 194.30 µs | 2973 µs | 22 | 0 |
| zero | 8 KiB | 20,000 | **4.84 µs** | 5.74 µs | 9.92 µs | 33 µs | 0 | 0 |
| naive | 8 KiB | 20,000 | 44.35 µs | 47.64 µs | 69.18 µs | 1058 µs | 1 | 0 |

`max_relerr = 0` in all four runs (payloads are exact quarters; sums are
bit-exact). Throughput: 230.2 kfps vs 26.2 kfps at 1 KiB; 121.8 kfps vs
19.2 kfps at 8 KiB (997.9 vs 157.7 MB/s of payload). The zero arm's
doorbell-to-result p50 (3.21 µs at 1 KiB) sits 6% above the socket-free
ring's 3.03 µs — the recv-into-slot adds nothing measurable to the dispatch
path, which is the coherence claim in its ingress form. A 500-frame smoke
config (`zero_1024` run 1 of `runall.sh`) is overwritten by the 50,000-frame
config of the same name; counts above are the full runs. Raw JSON:
`results-2026-11-01T1129/` in this folder, as fetched from
`~/googl1-ingress/results/` on the Thor.

## What is established and what is not

- **Established:** the naive ingress path (recv → heap → H2D copy → per-job
  launch → D2H result) is launch-dominated at ~29–44 µs p50 on this box,
  bit-exact, with rare multi-second stalls under co-tenancy. This is the
  $c_{\text{launch}}$ term of the paper's §4.1 measured in the ingress
  setting (attempts 1 and 3 agree: 30.8/36.4 and 29.3/44.4 µs p50).
- **Established (attempt 3):** the zero-copy ingress path — `recv()` directly
  into the mapped pinned ring slot, consumed in place by the resident warp —
  serves frames at **3.2/4.8 µs p50 (1/8 KiB), 9.1×/9.2× faster than the
  naive path at p50**, bit-exact over 70,000 frames, with **zero** >1 ms
  events where the naive path had 22 and 1. Pass bar (a) met at both frame
  sizes; bar (b) met for both arms; bar (c) met (naive maxima recorded
  verbatim, not retried).
- **Not measured here:** anything ahead of `recv()` — the NIC/skbuf stage,
  and GPUDirect RDMA in particular (no such NIC on this box; §7 of the
  paper). The 8 KiB payload step moves the zero arm's p50 by only 1.6 µs
  (3.21 → 4.84), consistent with a dispatch-dominated path well below the
  wire's ceiling.
