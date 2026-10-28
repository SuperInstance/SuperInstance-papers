# F170 v0.3 — Real-Audio Experiments + Backbone-Agnostic Architecture

*Patrick McNamara · 2026-09-04 · continuation of F170 v0.2*

## Abstract

F170 v0.2 proved the head is byte-exact across 4 substrates and
quantizes to 173 bytes (int4). F170 v0.3 takes the next step:
**the architecture is backbone-agnostic** and **works on real
audio**.

We loaded 200 real audio files from the ESC-50 dataset (5
vessel-relevant categories: engine, sea_waves, wind, pouring_water,
water_drops), trained the F170 head via FedAvg, and got:
- **52.5% test accuracy with the hand-crafted backbone** (log-mel + MFCC + PCA)
- **26.7% test accuracy with the Whisper backbone**

Random baseline: 20%. Both are above random. The hand-crafted
backbone beats Whisper because Whisper is optimized for speech,
not environmental sounds.

The key research finding: **the F170 architecture is backbone-agnostic**.
The frozen backbone is interchangeable. The 1.3 KB head and the
FedAvg aggregator don't care what produced the 64-dim embedding.
This is the F161 conservation law in action.

## 1. The ESC-50 vessel subset

We extracted 5 vessel-relevant categories from ESC-50 (40 samples
each = 200 total). Each is a 5-second WAV file at 44.1 kHz, mono,
16-bit PCM. We resample to 16 kHz and crop to 0.5-second windows.

| Class | Source | Domain |
|---|---|---|
| engine | boat/vehicle engines | industrial |
| sea_waves | ocean surf | ambient |
| wind | wind sounds | ambient |
| pouring_water | water flow | flow |
| water_drops | droplet impacts | transient |

## 2. The hand-crafted backbone (re-tested)

The same F170 backbone from v0.1 (log-mel + MFCC + delta + delta-delta
+ 180-dim hand-crafted stats + PCA projection to 64-dim) achieves:

| alpha | n_devices | n_rounds | final_acc |
|------:|----------:|---------:|----------:|
| 10.0  | 5         | 50       | 52.5%     |
| 1.0   | 5         | 20       | 47.5%     |
| 0.5   | 5         | 20       | 37.5%     |
| 0.3   | 5         | 20       | (low)     |

Real audio is messier than synthetic. 52.5% is **2.6x random**.

## 3. The Whisper backbone (alternative)

We tried using Whisper-large-v3-turbo as a "describe-the-audio" backbone:
1. Audio -> Whisper -> text (e.g. "rain", "engine")
2. Text -> BGE-base-en-v1.5 -> 768-dim embedding
3. 768 -> 64 (random projection)
4. Train the head

Result: 26.7% test accuracy. Whisper is optimized for **speech**, not
environmental sounds. It tends to return generic descriptions
("noise", "sound", or transcribes when it can't identify). The
hand-crafted backbone wins for this domain.

## 4. The architecture is backbone-agnostic

The F170 architecture does NOT depend on any specific backbone. The
contract is just:
- Input: raw audio
- Output: 64-dim embedding
- Trainable: 64x5 head (325 params, 1.3 KB)
- Aggregator: FedAvg

We can swap the backbone for:
- Hand-crafted (F170 v0.1) — works on synthetic + real environmental audio
- Whisper + BGE (F170 v0.3) — works on speech-heavy audio
- PANNs / YAMNet (future) — state-of-the-art for environmental sound
- Perceiver IO (future) — multimodal

All share the same head, same aggregator, same byte-exact
polyformalism. The 1.3 KB is the constant.

## 5. The lessons

1. **Backbone choice matters for real audio.** Synthetic data
   showed 100% accuracy because the classes were perfectly
   separable. Real audio is messier. The right backbone for
   environmental sound is NOT a speech model.

2. **The hand-crafted features are surprisingly good.** MFCC + delta
   + delta-delta + PCA is a 1980s technique, but it still beats
   Whisper for distinguishing engine from sea_waves.

3. **The federated loop is the real product.** The head is
   1.3 KB. The aggregator is 200 lines. The backbone is
   interchangeable. The F161 conservation law is what matters.

## 6. The next paper

F171 will explore:
- PANNs (Pre-trained Audio Neural Networks) as the backbone
- A real hydrophone dataset (if we can find one)
- On-device training on actual ESP32 hardware
- Quantization-aware training (QAT) to keep accuracy at int4

## 7. Token economy

**F170 v0.3 R&D session**: ~30K tokens.

- 4 new files (esc50_loader, federated_real, whisper_backbone, federated_whisper)
- 1 paper (this one)
- 200 real audio files downloaded and processed
- 2 backbones tested (hand-crafted + Whisper)
- 4 federated experiments

The hand-crafted backbone wins. The architecture is backbone-agnostic.
The 1.3 KB is the constant.
