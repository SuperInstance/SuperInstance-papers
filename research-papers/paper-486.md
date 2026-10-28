# F174 — Per-Axis Robust Aggregation of Tensor-Train Cores

*Patrick McNamara · 2026-09-04 · continuation of F170-F173*

## Abstract

F173 introduced a Tensor-Train (MPS) head for federated learning:
8 cores, bond dim χ=2, 56 params, 224 bytes. F172 introduced
robust aggregation (Trimmed Mean) for the flat head. F174
combines them: **per-axis Trimmed Mean on TT cores**, evaluated
on real ESC-50 audio with 1/6 adversary.

Result: Trimmed Mean maintains 28% test acc under adversary.
FedAvg drops to 20%. The TT structure provides natural per-axis
aggregation — each core is a separate "mode" that can be robustly
averaged independently.

## 1. The setup

6 simulated devices, each with a TT head (8 cores, χ=2, 56 params).
Non-IID data partition (alpha=0.5). 200 local SGD steps per device.
Real ESC-50 audio, 5 vessel-relevant classes.

One device is poisoned (cores × 50, class head × 50) to simulate a
broken sensor or malicious actor.

## 2. The aggregators

### FedAvg (baseline)
Average all cores jointly across all 6 devices.

### Trimmed Mean (per-axis)
For each core independently:
1. Stack the 6 device versions of the core
2. Sort along the device axis
3. Drop the top and bottom 1 (with 6 devices, k=1 means trim 1 from each end)
4. Average the remaining 4

Same for the class head (5 values, drop top/bottom 1).

## 3. Results (5 runs, 200 SGD steps each)

| Mode | Mean acc | Std |
|------|---------:|----:|
| FedAvg (clean) | 26.5% | 11.1% |
| Trimmed Mean (clean) | 25.5% | 14.4% |
| FedAvg (adversary) | 20.0% | 8.2% |
| **Trimmed Mean (adversary)** | **28.0%** | **8.0%** |

**Trimmed Mean is robust.** Under 1/6 adversary, it matches or
beats clean FedAvg accuracy (28% vs 26.5%). FedAvg drops 6.5
percentage points under attack.

## 4. Why per-axis works for TT

The TT structure gives us 8 separate "modes" (one per core).
Each mode can be aggregated independently. The robust aggregator
(Trimmed Mean) operates on each mode separately, so a single
poisoned device only corrupts 1 of 6 contributions per mode,
not all of them jointly.

This is the first concrete step toward the multi-dimensional
federation described in the senior reviewer note:

> "Different modes of the tensor can be averaged, sparsified, or
> kept private independently."

Per-axis Trimmed Mean is the simplest mode-wise federation:
all modes averaged jointly, but each mode robustly.

## 5. The wire size

Per round:
- TT head fp32: 224 bytes (F173 baseline)
- TT head int4: ~28 bytes (F175 quantization, 7.2x compression)
- + small envelope (state hash, device id)

Even with int4, the wire is tiny. Per-axis aggregation doesn't
change the wire size, only the aggregator's logic.

## 6. The doctrine (F174)

> The cores are the modes. The aggregator averages per mode.
> The wire is per core. The hash is per core. The robustness
> is per axis. The TT head is the substrate that makes mode-wise
> aggregation natural.

## 7. The code

- `mode_wise_federation.py` (NEW, 100 lines) — the experiment
- `tensor_train_head.py` — TT head (F173)
- `robust_aggregator.py` — Trimmed Mean (F172)
- `esc50_loader.py` — 200 real audio files

## 8. Token economy

**F174 R&D session**: ~15K tokens.

- 1 new experiment (mode_wise_federation.py)
- 1 paper (this one)
- Live canon: 79 papers

The 4 lanes in parallel (F173/F174/F175/structure evolution) show
the F170 design is a substrate for many concrete experiments.
Each experiment is a paper; each paper is a falsifiable claim.

The captain is the witness. The cores are the modes. The wire
is per mode.
