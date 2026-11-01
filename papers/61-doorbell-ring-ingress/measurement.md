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

## Attempt 2 — from 09:53, lease `googl1.ingress4` (queued; not run within the seat)

The corrected build adds: the fixed clock; a 16-job pre-connect warmup that
proves the doorbell bit-exact before any measurement (and reports
`doorbell_unsupported` honestly if it fails); a 500 ms per-frame bound;
per-frame over-100 µs / over-1 ms counters. The lease (512 MB, study tier,
label `googl1.ingress4`, ~10 s of bounded work) was queued behind the box's
own traffic — the admission queue spent most of the session head-of-line
blocked behind 24–26 GB render and model-server leases, the pool stayed
between 36 MB and 4.5 GB, and by ~10:30 the Thor's ssh endpoint itself was
timing out under load. The lease remained queued (position 2–3) when this
seat ended. When the box opens, the run executes unattended and its results
land in `~/googl1-ingress/results/` on the Thor: retrieval, not a project.

## What is established and what is not

- **Established:** the naive ingress path (recv → heap → H2D copy → per-job
  launch → D2H result) is launch-dominated at ~31–36 µs p50 on this box,
  bit-exact over 70,000 frames, with rare multi-second stalls under
  co-tenancy. This is the $c_{\text{launch}}$ term of the paper's §4.1
  measured in the ingress setting.
- **Not yet evaluated:** pass bar (a) — zero-copy p50 < naive p50 — and the
  zero arm's correctness at ingress (bar (b) for the zero arm). The
  mechanism's ingredients are individually measured (mapped-pinned
  coherence both directions; the ring at 3 µs in `persist_queue`'s
  socket-free form), but the composed socket→slot→resident-kernel claim
  waits for the queued run.
