# Two Ears, Two Eyes + One Phone as a Room Probe — State of the Art

_Survey date: 2026-10-22 (AKDT). Strand A: a laptop and a phone in the same room, each with its own microphone, camera and clock — no shared clock, no wiring. Strand B: a consumer phone **alone** measuring its room — its speaker plays the test signal, its microphone records. Confidence labels: **[verified live]** = page read in the research browser/index this run with the fact on it; **[index]** = search-index extract only; **[derived]** = arithmetic/physics from stated constants (speed of sound 343 m/s at ~20 °C, sample period = 1/fs), not a measured claim._

## Summary

1. **Alignment is solved to sample accuracy; localisation from two microphones is not — and cannot be, from TDOA alone.** Windowed GCC-PHAT / cross-correlation offsets fitted as a line (offset + slope = drift) over minutes routinely give residual alignment of 1 sample (20.8 µs at 48 kHz) in good SNR, and ~0.1–1 ms in ordinary reverberant rooms. But one TDOA is one number: it constrains a moving person to a **hyperbola branch in 2-D / a hyperboloid sheet + cone ambiguity in 3-D**, forever. Every published “2-mic localisation” result that reports a point position is smuggling in extra information — motion, a floor/room prior, level differences, head/body shadowing, a camera, or a known source signal.
2. **Drift is not a nuance, it is the dominant error over minutes.** Typical consumer relative drift is a few ppm to ~50 ppm, with measured outliers of hundreds of ppm. 20 ppm = 12 ms in 10 minutes; 50 ppm = 180 ms in an hour. Any single-offset sync is wrong within a minute for TDOA purposes.
3. **For cameras, audio is the sync signal and vision is the pose signal.** Audio cross-correlation gets two videos to well under a frame; learned pointmap methods (DUSt3R/MASt3R, CVPR/ECCV 2024) get relative pose from overlapping stills/video with **no calibration**, but only up to an unknown scale — which the audio TDOA / a known device separation can supply.
4. **Phone-alone room measurement (Strand B) is real but narrower than app marketing implies.** The exponential swept sine (Farina, AES 2000) works beautifully on a phone *as a recorder*, and tolerably with a phone driving a decent external/Bluetooth speaker. With **the phone's own speaker as the source and its own mic as the receiver** you measure a monostatic, direct-sound-dominated, band-limited channel: usable for **mid-band (roughly 250 Hz–4 kHz) T20/T30 comparisons in the same room, same position** and for a per-room fingerprint, **not** for standards-grade RT60, not below ~200 Hz, and not for absolute frequency response. No peer-reviewed validation of strict same-device phone RT60 accuracy was found — see *Could not verify*.
5. **The phone's transducers pollute level and spectrum far more than they pollute decay slope.** A multiplicative speaker+mic frequency response shifts a band's level but not, to first order, its exponential decay rate. What *does* corrupt RT60 is lack of band SNR/dynamic range, speaker distortion and compression, AGC/noise-suppression DSP, and non-diffuse/modal decay at low frequencies. That asymmetry — trust slopes, distrust levels — is the single most useful rule in Strand B.

---

# Strand A — Two unsynchronised devices

## A1. Aligning two audio recordings: unknown offset AND unknown drift

### A1.1 The model

Each device samples at a nominal fs (44.1/48 kHz) with a true rate fs·(1+ε), ε in parts per million, plus an arbitrary start offset. Relating the two timelines is therefore, to an excellent approximation over minutes, **affine**:

```
t_phone ≈ a · t_laptop + b        a = 1 + (ε_phone − ε_laptop),  b = start offset
```

The job is to estimate `b` (offset) and `a−1` (relative drift, ppm) from shared sound, then **resample** one recording by 1/a (or apply a time-varying delay) — not merely shift it. A third term is occasionally needed: dropped/duplicated samples or OS resampling steps appear as a *piecewise* affine map (a sudden jump in b). Six et al.'s synchronised-recording work makes exactly this diagnostic: drift shows as “many, gradually increasing or decreasing, offsets”, dropped samples as “two distinct offsets” **[index]** — https://0110.be/files/attachments/434/2015.synchronized-recording.pdf

### A1.2 How big is drift, really?

| Relative drift | Error after 1 min | 10 min | 1 h | Source |
|---|---|---|---|---|
| 1 ppm | 0.06 ms | 0.6 ms (29 samples @48k) | 3.6 ms | **[index]** https://www.cmuse.org/clock-drift-calculator/ |
| 5 ppm | 0.3 ms | 3.0 ms | 18 ms | same |
| 20 ppm | 1.2 ms | 12 ms (576 samples) | 72 ms | same |
| 50 ppm | 3 ms | 30 ms | 180 ms | same — labelled “common free-running danger zone” |
| 1,000 ppm | 60 ms | 600 ms | 3.6 s | same — usually a sample-rate/pull mismatch, not a crystal |

Measured hardware, not spec sheets: Meyer's GPS-referenced drift measurements (summarised at https://protyposis.net/clockdrift/high-precision-audio-drift-measurements-with-gps/ , **[index]**) found most laptops/phones/recorders within a few ppm to ~+20 ppm (Nexus 5 +6.44 ppm audio, Sony PCM-M10 +8.61 ppm, Zoom R16 +23.46 ppm), **and gross outliers**: iPhone 6+ / iPod touch 4G ≈ **+417 ppm** (25 ms/min) in that test chain, Galaxy S2 ≈ +274 ppm, one tablet video path −554 ppm. A vendor speech-quality blog gives the same ordering — consumer headsets 50–200 ppm typical, professional gear 10–50 ppm **[index, vendor — indicative only]** https://www.opalesystems.com/Tech-Blog/66-A-clock-drift-study-in-Speech-Quality-Assessment-world.en.htm

**Practical consequence [derived]:** at 20 ppm, a clap at minute 0 and a clap at minute 10 disagree by 12 ms = **4.1 m of apparent sound travel**. For lip-sync (≈ ±40 ms tolerance) a single offset survives ~30 min at 20 ppm; for TDOA localisation (needs ≲0.1 ms, §A2) it survives ~5 seconds. Drift estimation is therefore not optional for Strand A2.

### A1.3 Algorithms, in the order a builder should implement them

**(a) Coarse acquisition — audio fingerprinting / landmark hashing.** Wang-style spectral-peak fingerprints (as in Shazam) or energy/onset fingerprints match fragments between recordings with no assumption about overlap position. Six et al. use fingerprint hashes to find candidate blocks, noting raw fingerprint timing precision is only ~**16–32 ms** depending on parameters **[index]** https://0110.be/files/attachments/446/2016_Real-time_signal_synchronization_with_acoustic_fingerprinting.pdf — good enough to find *where* the overlap is in hours of audio, useless as the final answer. Robustness virtue: fingerprints survive different mic frequency responses, AGC and moderate noise far better than raw waveform correlation over long lags.

**(b) Fine offset — cross-correlation / GCC-PHAT per window.** Knapp & Carter, “The generalized correlation method for estimation of time delay,” *IEEE Trans. ASSP* **1976** — the foundational paper. GCC weights the cross-spectrum before inverse FFT; the **PHAT** weighting (1/|G(ω)|) whitens the spectrum, sharpening the peak and emphasising phase, which is why it is the default in reverberation; ML/TML weightings are derivable/optimal against ambient noise but PHAT is “purely heuristics based” yet better against reverberation **[index]** https://asmp-eurasipjournals.springeropen.com/articles/10.1186/1687-4722-2011-3 . Brandstein & Silverman (eds.), *Microphone Arrays* (Springer, 2001) and DiBiase, Silverman & Brandstein's chapter in it turned this into **SRP-PHAT** (steered-response power) for arrays. Honest limit, from the same comparison literature: GCC “performs fairly well in moderately noisy and lightly reverberant environments [but] degrades dramatically when noise or reverberation is high.”

**(c) Sub-sample interpolation.** Parabolic (or sinc/Gaussian) interpolation around the discrete correlation peak. At 48 kHz one sample = 20.8 µs = 7.1 mm of travel **[derived]**; parabolic interpolation on a broadband transient in good SNR recovers a fraction of a sample. It does **not** create information: on narrowband/speech-only content the correlation peak is many samples wide and interpolation is decoration.

**(d) Drift = regression over windowed offsets.** Compute an offset estimate every few seconds (windows of 1–10 s, GCC-PHAT, keep only high peak-to-sidelobe / high-coherence windows), then fit offset(t) with a **robust line** (least squares → Theil–Sen / RANSAC / Huber when outliers are present — they will be: doors, speech gaps, a device being handled). Slope = drift in samples/second → ppm = slope × 10⁶. Six et al. do the refinement explicitly: after fingerprint matching, cross-covariance per audio block gives “a sample accurate time offset”, and multiple offsets per recording expose drift **[index]** https://0110.be/files/attachments/434/2015.synchronized-recording.pdf . Then resample with a high-quality sinc resampler at ratio 1/(1+drift) or apply a fractional-delay time-varying shift for analysis-only work.

**(e) Designed transients beat found transients.** A hand-clap, a balloon, or best of all a short **chirp/MLS/ESS played from one device** gives a broadband, high-crest event whose correlation peak is unambiguous. Claps in a room are already reverberated copies of a ~1–3 ms source; their onset (first-arrival picking on a high-passed envelope) is more reliable than their correlation peak centroid. If the protocol can be active, BeepBeep-style two-way chirps (§A4) sidestep sync for *distance* entirely.

**(f) Learned TDE (recent).** Chen, Fouhey & Owens, “Sound Localization by Self-Supervised Time Delay Estimation,” *ECCV 2022* — https://arxiv.org/pdf/2204.12489 **[index]** — train a network to output representations whose GCC-PHAT is clean, plus a classifier over delays; it matches GCC-PHAT in easy conditions and beats it as SNR falls and RT60 rises (simulated RT60 0.1–0.9 s). This is the current state of the art for *hostile* audio, at the cost of training data, compute, and opaque failure. It is not needed for clap/chirp alignment.

### A1.4 Achievable accuracy — the honest ladder

| Condition | Achievable alignment | Basis |
|---|---|---|
| Same designed chirp, high SNR, short window | **±0.1–1 sample ≈ 2–20 µs** | Sample-accurate cross-covariance (Six et al.); BeepBeep sample-counting ~cm-level ranging implies ~30–60 µs timing |
| Broadband transients (claps) in a normal room, drift-corrected | **~20–100 µs** | [derived] from sample period + onset-pick jitter; consistent with acoustic ranging std ≈2 cm ≈ 58 µs |
| Speech/music only, reverberant, drift-corrected | **~0.1–1 ms** | GCC-PHAT peak width / learned-TDE errors in reverb |
| Fingerprint-only, or video-frame sync | **16–32 ms; 33 ms at 30 fps** | Six et al. fingerprint precision (above) |
| Single offset, **no** drift correction, 10 min take | **wrong by 3–30 ms** at 5–50 ppm | Drift table, §A1.2 |

Microsecond claims in vendor/literature contexts almost always mean *relative timing of a designed signal on synchronous or two-way hardware*, not two free-running consumer recordings of ambient sound. Millisecond-level is the defensible promise for arbitrary room audio; tens of microseconds is defensible for designed transients with drift fitting.

### A1.5 Failure modes (A1)

Reverberation creating a taller correlation peak at a reflection lag than at the direct path (mitigate: PHAT, onset/first-peak-above-threshold picking, restrict lag window by plausible geometry); periodic content (music beat, mains hum, a fan) giving aliased peaks every period; **different DSP chains** — phone noise suppression/AGC/echo-cancellation destroying waveform similarity (use “voice-off”/measurement recording modes, correlate envelopes or fingerprints instead); clock *steps* from OS sample-rate conversion or Bluetooth paths; temperature-driven drift non-linearity over long takes (fit piecewise-linear, e.g. per-minute segments); and silent/near-silent stretches with no shared information at all — no algorithm aligns what was not recorded in common.

---

## A2. TDOA localisation of a moving person from just TWO microphones

### A2.1 The geometry — what one TDOA is

For microphones at **m₁, m₂** and source **s**: Δr = |s−m₁| − |s−m₂| = c·Δt. The locus {s : Δr = const} is:

- **2-D:** one branch of a hyperbola with foci at the mics (branch selected by the sign of Δt). PySDR's TDOA exposition states it plainly: “A single TDOA thus constrains the emitter's position to a curve, not a point… you would need a third sensor to find where on that line it is” **[index]** https://PySDR.org/content/tdoa
- **3-D:** a hyperboloid sheet; equivalently, in the far field, a **cone** around the mic axis (half-angle θ with cos θ = c·Δt / baseline). A 2-mic pair measures, at best, a cone angle — classic binaural geometry (Woodworth's formula for ITD vs azimuth is the head-sized special case).

Bounds **[derived]**: |Δt| ≤ baseline/c. For devices 3 m apart, |Δt| ≤ 8.7 ms (420 samples @48k); a person crossing the perpendicular bisector sweeps Δt through 0. Timing error σ_t maps to Δr error c·σ_t: **0.1 ms ↔ 3.4 cm of range-difference**, but position error along the hyperbola is unbounded — geometry (GDOP) diverges near the baseline extension and is poor near the bisector at long range, as PySDR also notes (“near both of these extremes the geometry becomes ill-conditioned”).

### A2.2 What is and is not solvable

| Quantity | From 2-mic TDOA alone? |
|---|---|
| Range difference Δr, cone angle | **Yes** — this is the measurement |
| Which side / branch | Yes, from sign of Δt |
| Position in 2-D or 3-D | **No** — 1 equation, 2–3 unknowns, at every instant |
| Position if source is known to be **on a known line/plane** (a corridor, a floor plane + known mouth height, a desk line) | Yes — intersect hyperbola with that manifold (height assumption typically 1.2–1.7 m for a standing/walking person; error grows as true height departs) |
| Trajectory over time | **Partially** — a *sequence* of hyperbolae + a motion model (constant velocity, floor constraint) in a Kalman/particle filter can collapse to a plausible track, but mirror/branch ambiguities persist and the filter can lock onto the wrong branch; observability is through motion, not instantaneous |
| Position + unknown clock offset, from TDOA | Offset and Δr are **perfectly confounded** in a single pair: an offset error δ is indistinguishable from moving the source along the hyperbola family by c·δ. This is why §A1 drift work is a prerequisite, or why two-way/active methods (§A4) are used |

Extra channels of information researchers actually use to break the ambiguity: **inter-channel level difference** (ILD — with a ~3 m baseline, 1/r level falloff is informative, unlike head binaural ILD; but room reflections and source directivity — a person turning their head — corrupt it); **direct-to-reverberant ratio** (gives a rough absolute range to each mic separately); **Doppler** while walking; **spectral/body-shadowing** cues; **room priors** (source inside the room polygon, on the floor plane); and **fusion with the cameras** (§A3) — in this two-device setting the honest solution is usually audio-for-sync + vision-for-position, audio cone as a consistency check.

### A2.3 Reported numbers in real rooms — read the conditions

There is **no credible literature result for point-position error from exactly two free microphones and TDOA alone**, for the geometric reason above. Published numbers nearby:

- **Angle-only from a pair:** GCC-PHAT/SRP-PHAT azimuth on compact arrays in reverberant rooms is typically a few degrees in good conditions and 10°+ / gross outliers in bad ones; learned TDE (Chen et al. 2022, above) reduces gross errors vs GCC-PHAT as noise/reverb increase.
- **With ≥3–4 receivers / beacons:** Guoguo, ASSIST, WALRUS-class systems (§A4) report decimetre-to-room level; a distributed 24-mic robot system reported ~7 cm within ~3 m, and single-phone HyperEar ~15 cm average at 7 m by exploiting motion/Doppler — all with infrastructure, known geometry, or a cooperating emitting device **[index]** https://lion.sjtu.edu.cn/resource/downloadFile?filePath=/home/lion/lionweb/data/publication/text/20210513232123_690.pdf and https://ar5iv.labs.arxiv.org/html/1512.05103
- **Ranging (not position) between the two devices themselves:** BeepBeep ~2 cm average over >10 m **[index]** https://cm-edgetun.pages.dev/en-us/research/wp-content/uploads/2007/11/demo_sensys07_beepbeep.pdf — often misquoted as a localisation accuracy; it is a *pairwise distance* with an active, designed signal and two-way exchange.

**Failure modes (A2):** first-arrival vs strongest-arrival confusion in reverb (the TDOA jumps by reflection path lengths, i.e. tens of cm to metres); person's own body/head shadowing and mouth directivity making speech TDOA/ILD time-varying; footsteps vs voice giving different “positions” (feet vs mouth — actually useful if modelled); clock drift masquerading as motion (§A1.2: 20 ppm over a minute = 72 cm of phantom Δr drift per hour of take — [derived]: 1.2 ms/min → over 1 min the *change* is small, but absolute Δr bias after a 10-min-old sync is 12 ms = 4.1 m, completely swamping the ±8.7 ms physical range for a 3 m baseline — re-sync continuously or the hyperbolae are meaningless); and multipath in small rooms where the “direct” path may be occluded by furniture while a wall reflection is unobstructed.

**Still genuinely unsolved (A2):** passive, infrastructure-free, *metric* 2-D tracking of an uncooperative moving talker from one mic pair in reverb, without priors or another modality. Anyone claiming it should be asked which prior did the work.

---

## A3. Fusing two camera views: one fixed, one moving (worn/carried)

### A3.1 Synchronisation

- **Audio-first (recommended):** both cameras record room audio; §A1's affine alignment maps the moving camera's frames onto the fixed camera's timeline to **sub-frame accuracy** (audio at 48 kHz vs video at 30 fps: a frame is 1,600 audio samples). This also resolves the cameras' *video* clock drift, which is a separate (and sometimes much worse — cf. the −554 ppm video-path outlier in §A1.2) clock from the audio codec's.
- **Flash/clap events:** a camera flash or clap visible+audible in both gives a single-point check, frame-quantised (±½ frame each side) unless audio is used.
- **Vision-only sync (recent):** Liu, Yao, Gupta & Wang, “VisualSync: Multi-Camera Synchronization via Cross-View Object Motion,” arXiv Dec 2025 — https://arxiv.org/html/2512.02017v1 **[index]** — jointly minimises epipolar error over tracked moving points to estimate each camera's offset, “median synchronization error below 50 ms” on four challenging datasets of *unposed, unsynchronised* consumer video. Note that is **worse than audio sync when usable audio exists**; its value is for silent/muted or audio-incompatible footage. (Preprint, 2025 — treat numbers as authors' reports, not yet independently replicated.)

### A3.2 Relative pose

Classical pipeline: detect/match features across views (SIFT → learned matchers), estimate essential matrix with 5-point + RANSAC, decompose to R, t̂ (**direction only — scale is unobservable from two calibrated views**), triangulate; COLMAP-style SfM + bundle adjustment for sequences, with the fixed camera as the world anchor and the moving camera's trajectory recovered frame-by-frame (visual odometry / SLAM on the moving stream, registered to the fixed view wherever they overlap).

Learned shortcut: Wang et al., “DUSt3R: Geometric 3D Vision Made Easy,” *CVPR 2024* — http://cvpr.thecvf.com/virtual/2024/poster/29338 **[index]** — regresses pixel-aligned **pointmaps** from an image pair with “no prior information about camera calibration nor viewpoint poses”, and recovers focal lengths, relative pose and depth from them; Leroy et al., “MASt3R” (2024) adds dense local features/matching on the same backbone, greatly improving matching under wide baselines. Limits that matter here: pose/depth are **up to an unknown scale**, textureless walls / motion blur / rolling shutter on a worn camera degrade pointmaps, and pairwise predictions can be mutually inconsistent (the motivation for MV-DUSt3R and global alignment stages).

**Where the scale comes from in this setup [synthesis]:** (i) the known/measured distance between the two *devices* (§A4 ranging, ~cm); (ii) the audio TDOA cone intersected with triangulated rays; (iii) a known object/person height. A 2025 extension makes the audio contribution explicit — “Audio-Visual Camera Pose Estimation with Passive Scene Sounds” (arXiv) https://arxiv.org/html/2512.12165 **[index]** adds a spatial-audio encoder to a Reloc3r-style pose network, arguing audio helps “when vision alone is unreliable due to occlusion, bad lighting, or camera failure” and from sources out of view. Early, preprint-stage work, but directionally important for the worn-camera case, where the moving camera often faces a wall while its mic still hears the room.

### A3.3 Applications and failure modes

Applications in the literature/product world: multi-view capture of events (concerts/lectures/sport) from consumer cameras; surveillance-fixed + body-worn fusion for incident reconstruction; telepresence/meeting capture (fixed room camera + roaming phone); 3-D reconstruction / free-viewpoint rendering of a room event; person re-identification and handover between the fixed view and the moving view.

Failure modes: **non-overlapping fields of view** for long stretches (pose chain breaks; IMU on the phone — visual-inertial odometry — is the standard bridge, and phone IMU + fixed-camera re-observation on overlap is the practical architecture); dynamic scene content violating static-scene SfM (the *person* is the moving thing — mask people out for pose, track them separately for content); exposure/white-balance differences breaking matching; rolling-shutter skew on fast head motion; and privacy/consent, which is a deployment constraint, not an algorithmic one.

**Unsolved (A3):** metric-scale, drift-free, hours-long fusion of a casually worn camera with a fixed camera in a texture-poor room, with no IMU and no audio — each pair of modalities covers another's hole, which is precisely why the two-device brief should use all three (audio, video, IMU if available).

---

## A4. Distributed ad-hoc microphone arrays from phones and laptops

### A4.1 The problem that defines the field

An ad-hoc array = microphones whose **positions, orientations, clock offsets and clock skews are all unknown**, sampled asynchronously. Hennecke & Fink, “Towards acoustic self-localization of ad hoc smartphone arrays,” *HSCMA 2011* — https://web.patrec.cs.tu-dortmund.de/pubs/papers/Hennecke2011-TAS.pdf **[index]** — state the main problems as exactly “the unknown spatial positions, the asynchronous sampling and the unknown time offsets between clocks of smartphones”, and solve self-localisation by maximum likelihood over TOA measurements of short calibration pulses, using each phone's compass orientation and its known internal mic–speaker distance to reduce the optimisation's dimensionality. That trio (geometry + offset + skew, jointly) remains the framing: Canclini et al. (IEEE TASLP 2013, distributed asynchronous networks), Hasegawa et al. (blind estimation of locations and time offsets), and the Euclidean-distance-matrix formulation for multiple smartphones (arXiv:1512.05103) all estimate some subset jointly rather than assuming it away.

### A4.2 Notable academic systems

| System | Authors / venue / year | Signal & method | Reported performance & conditions |
|---|---|---|---|
| **BeepBeep** | Peng, Shen, Zhang, Li & Tan, *SenSys 2007* (Microsoft Research Asia) | Two-way chirps (2–6 kHz in summaries), **self-recording + sample counting** — each device records both beeps; difference of elapsed sample counts cancels clock offset & most latency | **~1–2 cm** ranging, 2 cm std after averaging, >10 m range, COTS phones, no infrastructure, no sync **[index]** https://arxiv.org/pdf/2008.13564 and demo abstract (above) |
| **WALRUS** | Borriello et al., UW, ~2005 | 21 kHz ultrasound emitted by PDAs/laptops + Wi-Fi timing | Room-level localisation of devices |
| **Guoguo** | Liu et al., ~2013 | Fixed beacon hardware emitting 15–20 kHz doublet pulses, Hadamard codes, TOA | Phone localisation vs beacons; Liu et al. report **23 cm by averaging** multiple measurements (via survey, above) |
| **ASSIST** | Zhang et al., *IPIN 2012* | Phones/devices receive 18–21 kHz chirps from a smartphone | Self-calibrating indoor smartphone tracking |
| **Hennecke ad-hoc array** | Hennecke & Fink, *HSCMA 2011* | Audible 5–16 kHz chirp pulses, ML self-localisation + compass | Demonstrated in a reverberant, noisy conference room (simulation + recordings) |
| **Cricket / Active Bat** | Priyantha et al. (MIT, 2000) / AT&T Labs | RF + ultrasound TOA with **dedicated beacon hardware** | cm-level in instrumented spaces (Cricket: 100% correct 1.2×1.2 m regions in the summarised report) — the infrastructure-heavy contrast case |
| **ENSBox** | Girod et al. | Dedicated ARM/Linux nodes with disciplined sync for acoustic ranging | ~5 cm average ranging |
| **CHiME / VoiceHome-style corpora** | Barker et al. (CHiME-5/6, 2018–2020); Vacher et al. (VoiceHome) | Real homes, distributed Kinect/tablet arrays, dinner-party / home automation speech | Not localisation systems per se, but the benchmark reality-check: far-field ASR word-error rates in real homes remained many times worse than close-talk — evidence of how hostile real rooms are |

Survey anchor for most of the table: “Simultaneous Acoustic Localization of Multiple Smartphones with Euclidean Distance Matrices,” https://ar5iv.labs.arxiv.org/html/1512.05103 **[index]**.

What ad-hoc arrays are *for*, once calibrated: distributed beamforming / speech enhancement (pick the best-SNR device per source — recent work on scattered smart speakers argues noisy channels should be **discarded, not merely down-weighted** **[index]** https://scienmag.com/graph-networks-turn-scattered-smart-speakers-into-powerful-microphone-arrays/ — press summary of a graph-network speaker-verification paper, low evidential weight), speaker localisation by intersecting many pairwise TDOAs, and meeting transcription with device selection.

### A4.3 Shipped products (and what they actually are)

- **Sonos Trueplay / Era Quick Tune, Apple HomePod room sensing, Google/Denon/Bluesound room correction** — distributed in the weak sense (speaker + phone, or speaker's own mics); detailed under Strand B §B4, because they are room-measurement systems, not general ad-hoc arrays.
- **Microsoft / Zoom / Google meeting systems with multiple laptop/phone mics** — products use device *selection* and echo cancellation, not coherent beamforming across unsynchronised consumer devices; no major shipped product publicly claims coherent ad-hoc beamforming across arbitrary phones+laptops. That absence is itself a finding: the calibration burden (§A4.1) has kept coherent ad-hoc arrays in the lab, while *incoherent* uses (best-mic selection, ranging, sync) shipped widely.
- **Hearing-assist / live-transcription apps using a phone as a remote mic** (e.g. phone-as-mic for TV/speaker) — a 2-node ad-hoc system in product form, using the phone mic + another device's speaker, with sync handled by the streaming protocol rather than acoustics.

**Unsolved (A4):** turnkey self-calibration (geometry+offset+skew) that survives devices being picked up and moved mid-session, people occluding paths, and OS audio DSP — continuously, invisibly, at consumer cost.

---

# Strand B — A consumer phone alone measuring its room

## B1. Swept-sine impulse-response measurement on commodity phones

### B1.1 The method (Farina ESS) — the one to use

Angelo Farina, “Simultaneous measurement of impulse response and distortion with a swept-sine technique,” *AES 108th Convention, Paris, 2000* (JAES summary 2000); refined Farina, “Advancements in impulse response measurements by sine sweeps,” *AES 122nd, 2007*. Play an **exponential (log) sine sweep** — frequency grows exponentially with time — record the response, and deconvolve by convolving with the **inverse filter**: the time-reversed sweep, amplitude-equalised to compensate the log sweep's −6 dB/octave (pink) spectral tilt. Result: the linear impulse response, **plus** a sequence of separate impulse responses for each harmonic-distortion order, appearing at predictable negative times before the linear IR — so a distorting little phone speaker does not silently contaminate the linear IR the way it does with MLS or a plain impulse; you can window the distortion products out. Farina's abstract claims the method “proved to compare very well with traditional techniques”, is “very robust to minor time-variance of the system under test, and to mismatch between the sampling clock of the signal generation and recording” **[index]** https://www.zanotowane.pl/1191/7715/ — that last property is gold for phones, whose playback and record clocks may not be the same crystal domain in every audio path (and certainly are not when the speaker is Bluetooth — see §B1.4).

The standard review is Müller & Massarani, “Transfer-function measurement with sweeps,” *JAES* 49(6), 2001, pp. 443–471 — sweep theory, synchronicity requirements, time-variance and non-linearity handling; the DIRAC blog summary notes e-sweeps' popularity “was stimulated by the excellent work of Angelo Farina and the article by Swen Müller and Paulo Massarani”, and that an impulse-to-noise ratio **INR ≥ 25 dB is required to reliably calculate acoustical parameters** from an IR **[index]** https://www.acoustics-engineering.com/html/blog-001.html . Schroeder (1965) backward integration and ISO 3382 (§B2) then turn the IR into decay parameters; Allen & Berkley's image method (*JASA* 66(4), 1979) https://jontallen.ece.illinois.edu/uploads/537.F18/Papers/Public/Allen-PDFs/Allen-Jun3.22/AllenBerkley79.pdf **[index]** is the simulation counterpart used to validate/synthesise RIRs.

### B1.2 Signal design — concrete recipes

| Parameter | Lab / hall practice | Phone-alone practice (recommended) | Why |
|---|---|---|---|
| Sweep type | Exponential/log sine | Same | Equal energy per octave, distortion separation |
| Range | 22 Hz–22 kHz (example: 15 s sweep + 10 s silence, ~90 dB dynamic range **[index]**, CCRMA/AES24 measurement https://ccrma.stanford.edu/courses/318/mini-courses/rooms/mus318_Abel_Lecture/concert%20hall%20measurement.pdf) | **~100/200 Hz–16 kHz claimed; trust only ~250 Hz–8/12 kHz** | Phone speaker has essentially no output below ~150–300 Hz (model-dependent) and rolls off/distorts; phone mic is good mid-band, high-passed by default DSP |
| Length | 10–20 s typical; longer for noisy/large spaces | **10–20 s, repeated 2–4× and averaged** | Longer sweep = more energy per octave = higher SNR (roughly +3 dB per doubling of length, [derived] from energy); averaging N synchronous repeats gains ~10·log₁₀N dB against uncorrelated noise. In a lived-in room, a 20 s sweep is also 20 s in which a fridge, traffic or a dog can ruin the take — repeats + median/robust selection beat one heroic 60 s sweep |
| Level | As high as possible without distortion; check harmonic IRs | **Loud but below obvious speaker rattle/compression — typically ~75–85 dB at the phone in a quiet room** | Phone speakers enter compression/limiting early; ESS lets you *see* the distortion orders — if 2nd/3rd harmonic IRs are within ~30 dB of the linear IR in a band, discard that band |
| Tail / silence | Silence ≥ expected RT after sweep end | **≥ 2–3 s silence** appended (record continues after sweep ends) | The room's decay after the sweep's top frequency must be captured, and deconvolution needs the tail; truncating it truncates RT |
| Repeats at a position | Multiple positions averaged for a room value (ISO 3382 wants multiple source/receiver positions) | **Mandatory multi-position for any “room RT60” claim** | A single position measures *that channel*, dominated by local modes/reflections (§B2.3) |

Deconvolution hygiene: use **linear (not circular) convolution** with the inverse filter (the AES24 example stresses this); window the deconvolved result to start just before the direct arrival and exclude the pre-arrival harmonic-distortion IRs (unless distortion is what you want); check the noise floor after the decay — if decay range < ~35 dB you cannot even form T30 (§B2).

### B1.3 Phone-alone geometry — the part nobody markets

With speaker and mic **on the same handset** (~10–17 cm apart, model-dependent, plus a structure-borne path through the chassis):

1. **Direct sound is enormous and early** (~0.3–0.5 ms air path, plus near-instant chassis conduction). The direct-to-reverberant ratio at the mic is far higher than in any normal source–receiver setup. Early reflections arriving within the first few ms (path differences < ~1 m) are buried under the direct arrival and its transducer ringing.
2. **It is a monostatic (backscatter) measurement.** Source and receiver co-located means you preferentially excite and hear reflections that return to the phone's location — informative about *that spot* (useful for “how live is it where the phone sits”, for a room fingerprint, for detecting a move), not a spatial average of the room.
3. **Transducer responses are inside the measurement** (§B2.2): measured IR = speaker response ∗ room response ∗ mic response (plus DSP). You cannot deconvolve the room out without independently knowing the other two.
4. **Orientation and the hand/body matter.** Phone mics/speakers are directional at HF, ports get covered by fingers/cases, and the user's body is a large absorber/reflector centimetres away. Tripod/stand, case off, ports clear, user out of the room or at least still and behind — the same advice REW/HouseCurve communities give for external-mic work applies doubly here.

### B1.4 Reliability: lived-in rooms vs labs

- **In a lab/quiet treated room**, ESS on modern phones is respectable mid-band: the method itself is clock-mismatch-tolerant (Farina), and phone MEMS mics are flat-ish mid-band (§B2.2).
- **In a lived-in room**, the dominant enemies are **non-stationarity and DSP, not the sweep**: HVAC/traffic/fridge noise eating dynamic range (each 10 dB of noise floor costs you a T30 → T20 → nothing downgrade); people/pets moving during a 15 s sweep (time-variance smears the deconvolved IR — Farina's robustness is to *minor* time-variance); phone **AGC, noise suppression and “voice” processing** rewriting levels during the decay (must use a measurement/raw audio path — iOS `AVAudioSession` measurement mode exists precisely to disable AGC/high-pass processing; a forum-grade source describes measurement mode as turning “off the high pass filter and auto gain” **[index, low weight]** https://gearspace.com/threads/iphone-in-built-mic-what-is-it-and-why-does-it-sound-truer-to-my-voice-than.942534/page-2 ; on Android the equivalent `UNPROCESSED` audio source is device-dependent); **Bluetooth speakers** adding codec latency, sample-rate conversion, DSP crossovers and level-dependent compression (and codec mismatch is measurable: AnyRIR, Aalto 2025, found mismatched codecs raise late-tail RIR error by ~15 dB **[index]** https://arxiv.org/html/2510.17788v2 ); and the OS resampling a 44.1 kHz sweep to a 48 kHz pipeline.
- **Impulse methods (clap/balloon) are the fallback, and a poor one.** The SCIRP room-acoustics evaluation found ClapIR-style phone clap measurement and balloon-pop/oscilloscope methods “too unreliable, because such impulses are inconsistent” with triggering difficulties and “a very small amount of energy… leading to a poor signal-to-noise ratio” **[index]** https://file.scirp.org/Html/7-2311026_94002.htm . A 2025–26 line of work tries to rescue claps with learned priors (anechoic-clap dataset of 2,540 claps from 17 participants + a neural regressor for the unknown excitation **[index]** https://arxiv.org/pdf/2609.35839.pdf — note the arXiv identifier as returned appears future-dated; treat as unverified preprint metadata). Claps are fine for a *rough EDT/smell-test*, not for publishable RT60.

---

## B2. RT60 and related parameters from phone measurements

### B2.1 Definitions and the perceptual yardstick

From the Schroeder curve (backward-integrated squared IR, per octave/third-octave band): **EDT** = slope 0 → −10 dB ×6; **T20** = slope −5 → −25 dB ×3; **T30** = slope −5 → −35 dB ×2; “RT60” in apps is almost always T20 or T30 extrapolated, not a measured 60 dB decay (which would need >65–70 dB of clean dynamic range — essentially never available from a phone speaker in a home). **C50/C80** = early(≤50/80 ms)-to-late energy ratio in dB; **D50**, centre time Ts, strength G similarly per ISO 3382-1/-2. Yardsticks: **just-noticeable difference for reverberation time is 5 %**, for EDT also 5 %, for C50/C80/G about 1 dB **[index]** https://www.mdpi.com/2624-599X/2/3/27 and Hak et al.'s parameter table. So an app reporting RT60 to two decimal places is reporting noise: differences under ~5 % are inaudible *and* typically within repeatability error; a useful phone result is “0.45 s ± 0.05, mid-band average, T20, 4 positions”.

Dynamic-range arithmetic **[derived]**: T30 needs the decay visible from −5 to −35 dB *plus* ~10 dB headroom to the noise floor in that band (≈45 dB band SNR); T20 needs ≈35 dB. Studio Six Digital's RT60 app states the same constraint from the product side: it “requires a minimum of 25 dB of headroom… for T20 analysis”, measures 50 ms–4 s, 63 Hz–4 kHz, ISO 3382 T20/T30 **[index]** https://rt60.updatestar.com/ . AcousticCheck reports per-band T20-derived RT60 **with SNR and r² (linearity of the decay fit)** and covers 125 Hz–4 kHz **[verified/index]** https://acousticcheck.com/ — those quality flags, not the headline number, are what make a phone measurement defensible. Report them or the number means little.

### B2.2 How much do the phone's own speaker/mic pollute the result?

Decompose by parameter — this is the core practical finding of Strand B:

| Parameter | Pollution by speaker/mic response | Mechanism |
|---|---|---|
| **RT60 / T20 / T30 / EDT (per band)** | **Low, to first order** — a flat-in-time multiplicative band gain cancels in a *slope* | Decay rate is a property of energy loss per reflection, not of absolute level. Pollution enters second-order: (i) band SNR collapses where the speaker has no output (LF) or the mic/DSP cuts (HF/LF) → slope fitted to noise; (ii) speaker **distortion** injects harmonics into higher bands with their own decays; (iii) **limiter/AGC** makes gain time-dependent → directly falsifies slope; (iv) transducer ringing extends very short decays (dead rooms, EDT) |
| **Frequency response / magnitude spectrum** | **Total** — measured response *is* speaker×room×mic; errors of ±10 dB+ at band edges are normal uncalibrated | Cannot be fixed without a per-model (ideally per-unit) correction. Why Sonos historically restricted Trueplay to iOS: Android mic variability across OEMs made correction untrustworthy **[index]** https://www.trustedreviews.com/explainer/what-is-sonos-trueplay-2929243 ; HouseCurve builds the built-in iPhone/iPad mic correction **into the app** and requires a calibration file for external mics **[index]** https://community.roonlabs.com/t/room-correction-using-your-iphone-and-housecurve/217335?page=24 |
| **Absolute SPL** | **Moderate if per-model calibrated, poor otherwise** | Kardous & Shaw (NIOSH), *JASA* 2014: of 192 apps screened, only 4 iOS apps were within **±2 dB** of a reference system with built-in mics; 2016 follow-up: with an external calibrated mic, within **±1 dB** **[index]** https://pmc.ncbi.nlm.nih.gov/articles/PMC5102154/ . AcousticCheck likewise says the internal iPhone mic “is calibrated for the supported devices” **[index]** https://acousticcheck.com/ |
| **C50/C80, DRR, early reflections** | **High for phone-alone** | Direct sound is inflated by co-location (§B1.3) → early energy and DRR are systematically overestimated; first-reflection timing/amplitude under the direct arrival is lost |
| **Low-frequency anything (<~200 Hz)** | **Severe** | Speaker cannot excite the modes; mic/DSP high-pass; and (§B2.3) the physics stops being “reverberation” anyway |

Positive evidence that phone *mics* are up to IR capture (with an external source): Hanus, Chalmers master's thesis 2025, measured frequency responses, sensitivities and SNR of **30 smartphones in an anechoic chamber** and found **84 % of models suitable for measuring the loudspeaker–room impulse response** for equalisation purposes **[index]** https://odr.chalmers.se/items/2e9736bb-71b4-414f-ab05-3b05a26f72be . Note what that validates: phone-as-microphone. It does not validate phone-as-loudspeaker, still less both-at-once.

### B2.3 Failure modes specific to small, lived-in rooms

1. **There is no diffuse field to measure.** RT60 theory (Sabine/Eyring, ISO 3382) assumes a well-mixed field. Below the **Schroeder frequency** f_s ≈ 2000·√(T/V) Hz — for a 50 m³ living room at T=0.5 s, ≈200 Hz **[derived]** — decay is a handful of discrete modes with position-dependent, multi-slope decays. Forum/acoustics folklore that “RT60 is meaningless in small rooms” overstates it (mid-band T20 in homes is repeatable and useful), but a *single-number, full-band* RT60 for a small room is a category error. Report per-band, per-position, with spread.
2. **Non-exponential / double-slope decays** (coupled spaces — open-plan room + hallway, room + stairwell) break the linear Schroeder fit; r² flags it if the app reports r².
3. **Background-noise truncation** biases T estimates *down* (decay hits the floor early) unless noise-compensated (Lundeby-style tail estimation); interrupted-noise phone apps are worse here than ESS.
4. **Source directivity/position**: ISO wants an omnidirectional source; a phone is a small directional baffle lying on a table (a boundary — half-space loading, comb effects). Moving the phone 20 cm can change LF/mid results more than the room treatment you're trying to evaluate. Fix positions with tape marks; compare like with like.
5. **Occupancy and furnishing state**: one person ≈ a meaningful absorber at mid/HF in a small room; doors open/closed change coupled volume. A “room model” (§B3) must record state, or it learns the furniture diary, not the room.

**Realistic accuracy claim a builder may make [synthesis of the above]:** same phone, same marked positions, measurement-mode recording, ESS 10–20 s ×3 repeats, quiet house: **mid-band (500 Hz–2 kHz) T20 repeatability within ~±5–10 %** (i.e. at/just above JND), 250 Hz and 4 kHz bands ±10–20 %, 125 Hz indicative only, ≤63 Hz meaningless. Cross-device or cross-position *absolute* RT60: expect ±20 % or worse. No source found in this survey validates a tighter phone-alone figure — tighter figures in app marketing are unaccompanied by method/conditions.

---

## B3. Learning per-space acoustic models from repeated measurements

Repeated phone measurements turn a one-off number into a **model of a specific space** — the Strand-B analogue of §A4's calibration. Four levels, in increasing ambition:

### B3.1 The room fingerprint (“roomprint”)

Moore, Brookes & Naylor, “Roomprints for forensic audio applications,” *WASPAA 2013* — a roomprint is a quantifiable description estimable from a monophonic recording; using **log frequency-dependent reverberation time** as the feature they obtained **3.9 % error / 96 % correct identification over 22 rooms** **[index]** https://spiral.imperial.ac.uk/handle/10044/1/12539 and https://www.commsp.ee.ic.ac.uk/~sap/uploads/publications/Moore2013a.pdf . Peters, Lei & Friedland, “Name that room” (*ACM Multimedia 2012*) showed room ID from acoustic features in ordinary recordings. Lesson for a builder: you do **not** need a full RIR to re-identify a space — a per-band decay vector from a weekly phone sweep is a strong, cheap fingerprint (and a change detector: fingerprint drift = furniture/occupancy/treatment change). RevRIR (Bitterman et al., arXiv 2024) https://arxiv.org/html/2406.03120v1 **[index]** modernises this with contrastive joint embeddings of reverberant speech and RIRs, applied to room shape/volume classification — i.e. learned roomprints generalise beyond RT features, but evaluated mostly on simulated data.

### B3.2 A measured RIR bank → personalised processing

A set of phone-measured RIRs at the positions that matter (desk, sofa, bed) enables, offline:
- **Convolution/auralisation** — hear any source as it would sound there; generate training data matched to *this* room for ASR/voice models (RIR augmentation is standard practice: Ko et al. and Szöke et al. showed real/simulated RIR augmentation improves far-field ASR; DIR-augmentation work for ASC, arXiv:2305.07499, uses IR augmentation specifically for device robustness **[index]** https://ar5iv.labs.arxiv.org/html/2305.07499 ).
- **Dereverberation with a known-ish channel:** if the RIR at a fixed talker/mic geometry is known, inverse/regularised filtering and RIR-conditioned networks become possible. The general blind machinery is: **WPE** (Nakatani et al., 2010 — weighted prediction error, the durable classic for multi-channel dereverberation without an explicit RIR), spectral suppression using a blind T60 estimate (Ratnam et al.'s ML single-channel T60 estimator is the cited ancestor), and modern joint methods — **BUDDy** (Moliner et al., 2024–25) https://arxiv.org/html/2405.04272v1 **[index]**, unsupervised diffusion-based joint dereverberation + per-band exponential-decay RIR estimation, outperforming blind baselines and generalising better than supervised estimators to mismatched rooms; **BERP** (Wang et al., 2024) https://arxiv.org/html/2405.04476v2 **[index]**, blindly estimating 13 room/physical parameters (T60, EDT, C50/C80, volume, source distance, DOA, occupancy) from single-channel noisy speech alone. Honest status: these estimate *plausible* room parameters from speech, with errors well above measurement-grade; a 15-second phone ESS, when you are allowed to make noise, beats all of them for *this* room. Their niche is when you cannot play a sweep (a call in progress, a forensic recording).
- **Voice processing per space:** per-room EQ/level/dereverb presets keyed by the roomprint (hearing aids and earbuds with location-based presets are the productised form); ASR front-ends selecting the model/beam matched to the measured RT band.

### B3.3 Estimating RIRs without a sweep at all (the research frontier)

**AV-RIR** (arXiv:2312.00834) https://arxiv.org/html/2312.00834v1 **[index]** estimates RIRs from audio + a visual image of the room (contrastive RIR–image pretraining), reporting large dereverberation gains over baselines on recorded data — the direct bridge between Strand A3 (cameras see the room) and Strand B (acoustics of the room): a fixed camera image + a phone recording may soon substitute for a sweep for *approximate* RIRs. **AnyRIR** (Aalto, 2025) https://arxiv.org/html/2510.17788v2 **[index]** estimates RIRs non-intrusively from *music already playing* via ℓ₁ optimisation robust to non-stationary noise — evaluated in a real kitchen with door slams/cutlery against ESS ground truth. **Image2Reverb**-class models predict RIRs from a photo alone. All are “estimate a plausible/useful RIR”, none yet matches ESS for parameter measurement; and all inherit simulation-to-real gaps.

### B3.4 Acoustic scene classification (ASC) — the neighbouring task

ASC = classify *what kind of place* (bus, park, office…) from a clip, standardised by the **DCASE challenge** (Mesaros, Heittola, Virtanen et al.). DCASE 2024 Task 1 (data-efficient, low-complexity, multi-device): baseline accuracy **42.40 % (5 % training subset) to 56.99 % (full)**, top system **54.3–61.8 %** on TAU Urban Acoustic Scenes, with **recording-device mismatch** as a first-class problem (addressed by Freq-MixStyle etc.) **[index]** https://arxiv.org/html/2405.10018v1 and https://dcase.community/challenge2024/task-data-efficient-low-complexity-acoustic-scene-classification . Two cautions for the builder: (i) ~60 % on 10 scene classes is the real state of the art under device shift — ASC is *not* a solved sensing primitive; (ii) ASC classifies scene *type*, whereas §B3.1 classifies the *individual room* — the latter is far easier and is what a per-space product needs. Device mismatch in DCASE is the same phenomenon as §B2.2 (each phone imposes its response) seen from the ML side: **a per-space model trained on one phone does not transfer to another phone without adaptation** — another argument for keeping the measurement phone fixed, or calibrating per model.

**Still unsolved (B3):** a per-space model that stays valid as the room lives (furniture, people, doors, seasons/HVAC), transfers across devices, and yields *metric* geometry (wall positions/materials) rather than statistical fingerprints. Inferring room geometry from RIR early reflections (Antonacci et al.) works in controlled conditions; from phone-alone monostatic RIRs it is essentially open.

---

## B4. Deployed prior art — products, apps, open-source tools

**Critical taxonomy first.** Almost nothing shipped uses a phone as **both** source and receiver. The market split is:

| Role split | Examples | Notes |
|---|---|---|
| **Phone = mic only; a real speaker plays** | Sonos Trueplay (standard), HouseCurve, AcousticCheck (sweep mode, Bluetooth speaker), Dirac Live (phone/AVR ecosystem), WiiM RoomFit, Sonarworks SoundID Reference (calibrated mic) | The defensible architecture: source has output and bandwidth; phone is a known, calibratable mic |
| **Speaker = mic (same smart speaker)** | Sonos Era Quick Tune, Apple HomePod room sensing, (Echo/Google equivalents) | True same-device source+receiver — but the “mic” is an array centimetres from a known, characterised driver, the DSP chain is fully known, and the goal is *relative EQ correction*, not exporting an RT60. HomePod: mics listen to reflections of music itself, internal LF calibration mic for bass, re-tunes in seconds on being moved **[index]** https://www.macsparky.com/blog/2018/01/the-homepod-as-speaker/ |
| **Phone = source + mic (strict Strand-B case)** | Clap/impulse RT apps (ClapIR lineage), some “room acoustics meter” apps using the phone speaker for a sweep/noise burst | The weakest evidence base (§B1.4, §B2). No product in this class was found with a published validation vs a reference measurement |
| **Phone = controller; computer/interface does I/O** | REW + UMIK-1, FuzzMeasure, ARTA, Smaart | The professional/hobbyist standard; phone may not be involved at all |

### B4.1 Named systems

- **REW — Room EQ Wizard** (John Mulcahy, from 2003; free, closed source). Log-swept-sine measurement, loopback **or another speaker as timing reference**, offline measurement from imported sweep recordings (this mode is how you use a phone recording rigorously: record the sweep on the phone, import the WAV, deconvolve in REW), ISO 3382 EDT/T20/T30/“optimal” RT60, waterfalls/ETC **[index]** https://RoomEQWizard.com/features.html and history https://audioxpress.com/article/room-eq-wizard-rew-looking-back-on-audio-measurement-software-history/ . If a builder writes no other Strand-B code, REW compatibility (export WAV IRs) is the interoperability target. Related open tooling: **pyroomacoustics** (Scheibler, LJK/EPFL — image-method simulation + beamforming, open source), **Aurora** plug-ins (Farina's own ESS/deconvolution lineage), ODEON/CATT (commercial room simulation).
- **HouseCurve** (Greg Wilding, iOS). Chirp-as-timing-reference then sine sweep played by the audio system (AirPlay/Chromecast/wired), phone as mic with **built-in correction for iPhone/iPad mics**, averaging of 3–5 positions recommended, exports PEQ/convolution corrections **[index]** https://housecurve.com/docs/usage/measurement_process . A model of honest phone-era design: it does not pretend the phone speaker is the source.
- **AcousticCheck** (VQ, iOS). T20→RT60 per octave 125 Hz–4 kHz with SNR + r² quality metrics, sweep-via-Bluetooth-speaker **or** impulse/clap mode, internal mic calibrated per supported device, IR export as WAV **[index]** https://acousticcheck.com/ . The closest reputable app to “phone measures the room” — and even it reaches for an external speaker for “accurate results even in tougher acoustic environments”.
- **Studio Six Digital RT60 / AudioTools** (iOS). Interrupted pink noise via an external amp/speaker, ISO 3382 T20/T30, 63 Hz–4 kHz **[index]** https://rt60.updatestar.com/ .
- **Sonos Trueplay** (2015– ). Speaker plays a test sequence described as brown noise + pulses + frequency sweep; user walks/waves the iOS phone for ~3 min; EQ/filter correction computed **[index]** https://www.trustedreviews.com/explainer/what-is-sonos-trueplay-2929243 . Android excluded from standard Trueplay explicitly over mic inconsistency; Era speakers' Quick Tune (speaker's own mics) restored Android support — the industry's own verdict on §B2.2.
- **Dirac Live** (Dirac Research, Sweden; in AVRs, cars, phones-as-controllers). Multi-point (≥30 cm spaced, ~1 m sphere for a chair) swept measurements with a calibrated mic (UMIK-class recommended), frequency **and** impulse-response (mixed-phase) correction, target-curve editing **[index]** https://manuals.plus/m/34afa886fc0cd707a61c11a65fc65ced5d29ade1754072606e79e006161ddce3 . The high-end benchmark: note it insists on a *calibrated external mic* and many positions — the opposite of one phone, one tap.
- **Audyssey MultEQ, Sonarworks SoundID Reference, IK Multimedia ARC** — same family (multi-point, calibrated mic, correction filters); SoundID documents log sweeps + multi-point capture around the listening position over ~20 min **[index]** https://www.sonarworks.com/blog/learn/how-does-soundid-reference-handle-impulse-response-measurements .
- **NIOSH SLM app + Kardous/Shaw validation programme** — not room acoustics, but the reference point for “how accurate is a phone mic, really” (§B2.2).
- **SonarRoom and similar 2025–26 iPhone “3-D room mapping” apps** — marketing claims (deconvolution IR, Schroeder RT60, C50/C80 per octave) mirror the methods above **[index]** https://wxow.marketminute.com/article/abnewswire-2026-3-27-sonarroom-new-iphone-app-reveals-the-hidden-acoustic-problems-destroying-your-audio-3d-room-mapping-technology-once-reserved-for-professional-studios (a press-release wire item, dated 2026 as returned — **no independent validation found; treat claims as advertising**).

---

# Prioritized shortlist for a builder (combined Strands A + B)

| # | Technique | Strand | Why it fits / what it buys | Watch out for |
|---|---|---|---|---|
| **1** | **Windowed GCC-PHAT offsets + robust affine (offset+drift) fit + resampling** | A1 | The foundation everything else stands on. Sample-accurate alignment of laptop+phone audio over minutes, ~100 lines with a good FFT library, no training data. Directly enables A2 (removes the offset↔position confound) and A3 (sub-frame video sync) | Restrict lags, use onset picking for transients, reject low-coherence windows, fit piecewise if the OS steps the clock |
| **2** | **Farina exponential swept sine (ESS) deconvolution — phone as recorder, best available speaker as source; phone-speaker-only as a degraded mode** | B1 | One 10–20 s sweep → linear IR + visible distortion orders + every ISO 3382 parameter. Clock-mismatch tolerant (decisive when playback/record devices differ — including Strand A's two devices playing/recording a sweep to *measure their own relative drift and distance*). REW can consume the recordings, so you inherit a pro analysis stack for free | Raw/measurement audio mode (no AGC/DSP), band-limit claims to ~250 Hz–4 kHz, repeats + positions, report T20 with SNR/r², never a bare “RT60” |
| **3** | **Active two-way ranging (BeepBeep pattern) between the two devices** | A4/A2 | Cancels the unsynchronised-clock problem by construction (self-recording + sample counting) and gives the **device-to-device distance to ~2 cm** — which is simultaneously (a) the missing metric scale for camera pose (A3), (b) the baseline that makes the TDOA hyperbola family absolute rather than relative, and (c) a continuous drift/offset observable | Audible chirps are annoying — use short, sparse, near-ultrasonic (18–20 kHz) chirps if the transducers pass them, and check per-device HF response first; multipath → take medians |
| **4** | **Per-space roomprint + RIR bank, keyed by position and room state** | B3 | Cheapest durable value in Strand B: a weekly 15 s sweep per spot builds a per-band decay fingerprint that re-identifies the room (~96 % over 22 rooms in Moore et al.), detects change, selects dereverb/EQ/ASR presets, and supplies *this-room* RIR augmentation for training voice models. Compounds in value; a one-off RT60 does not | Fix the phone, positions and state (doors/occupancy); per-model mic correction or the fingerprint is of the phone, not the room; expect drift, re-baseline deliberately |
| **5** | **Audio-synced DUSt3R/MASt3R-style relative pose for the fixed+moving cameras, scale pinned by #3** | A3 | No calibration, no markers, works on casually captured overlapping video; audio (#1) supplies time, ranging (#3) supplies scale, vision supplies pose and person position — which is the *honest* route to “where is the person”, since 2-mic TDOA alone cannot answer it (§A2). Use the TDOA cone as a cross-check, not a position source | Needs visual overlap — bridge gaps with phone IMU/VIO; mask the moving person out of pose estimation; validate scale on a known distance before trusting metres |

**Explicitly not shortlisted, and why:** 2-mic TDOA as a standalone person-positioner (geometrically underdetermined, §A2); clap/balloon RT60 apps (unreliable excitation, §B1.4); fingerprint-only sync as a final answer (16–32 ms, §A1.3a); blind-from-speech RIR/T60 estimators (BUDDy/BERP/AV-RIR — promising, use only when a sweep is impossible, §B3.2–3.3); coherent beamforming across the two unsynchronised devices (calibration burden has kept it out of shipped products, §A4.3).

---

## Could not verify

- **No peer-reviewed or manufacturer-published validation of RT60 accuracy for the strict phone-alone configuration (phone speaker → room → same phone's mic)** was found. All located validations concern phone-as-mic with an external source (Kardous & Shaw for SPL; Hanus 2025 for IR capture; AcousticCheck's claims are manufacturer statements). The §B2 accuracy ranges are therefore presented as a *synthesis/bound*, not a cited measurement.
- **No shipped product was found that exports a standards-form RT60/IR from a same-device speaker+mic measurement.** HomePod / Sonos Era Quick Tune do same-device acoustic correction but publish no IR/RT60 and no accuracy figures.
- VisualSync (Dec 2025), AV-RIR pose work, AnyRIR, BUDDy/BERP and the handclap-RIR paper are **preprints**; their numbers are authors' reports. The handclap paper's arXiv ID as returned by the index (2609.xxxxx) appears future-dated — metadata unverified.
- SonarRoom's claims rest on a press-release wire item dated 2026; no independent test located.
- Meyer device-drift figures are from a personal/research measurement page summarising a paper (“An Analysis of Time Drift in Hand-Held Recording Devices”); individual-device values are setup-specific and should not be generalised to a phone model.
- Brandstein & Silverman SRP-PHAT attribution is textbook-standard but was not re-read from the book itself in this run; Knapp & Carter 1976 was verified via citing literature, not the original PDF.
- Internal phone speaker–mic spacing, max SPL and per-model frequency responses vary widely and were not verified per-model; figures given are ranges/typical, flagged as such.

## Sources

**Strand A**
- Knapp & Carter GCC / comparison study — https://asmp-eurasipjournals.springeropen.com/articles/10.1186/1687-4722-2011-3
- Six et al., synchronised recordings / fingerprint sync — https://0110.be/files/attachments/434/2015.synchronized-recording.pdf ; https://0110.be/files/attachments/446/2016_Real-time_signal_synchronization_with_acoustic_fingerprinting.pdf
- Clock-drift arithmetic (ppm table) — https://www.cmuse.org/clock-drift-calculator/
- Measured device drift (Meyer) — https://protyposis.net/clockdrift/high-precision-audio-drift-measurements-with-gps/
- TDOA hyperbola geometry (PySDR) — https://PySDR.org/content/tdoa
- Chen, Fouhey & Owens, self-supervised TDE, ECCV 2022 — https://arxiv.org/pdf/2204.12489
- BeepBeep, Peng et al., SenSys 2007 — https://cm-edgetun.pages.dev/en-us/research/wp-content/uploads/2007/11/demo_sensys07_beepbeep.pdf ; corroboration https://arxiv.org/pdf/2008.13564
- Ad-hoc smartphone localisation survey / EDM — https://ar5iv.labs.arxiv.org/html/1512.05103
- Hennecke & Fink, HSCMA 2011 — https://web.patrec.cs.tu-dortmund.de/pubs/papers/Hennecke2011-TAS.pdf
- Phone localisation context (HyperEar/Cricket/24-mic) — https://lion.sjtu.edu.cn/resource/downloadFile?filePath=/home/lion/lionweb/data/publication/text/20210513232123_690.pdf
- VisualSync, Liu et al., 2025 — https://arxiv.org/html/2512.02017v1
- Audio-visual pose (Reloc3r + spatial audio), 2025 — https://arxiv.org/html/2512.12165
- DUSt3R, Wang et al., CVPR 2024 — http://cvpr.thecvf.com/virtual/2024/poster/29338
- Scattered-device ad-hoc arrays (press summary) — https://scienmag.com/graph-networks-turn-scattered-smart-speakers-into-powerful-microphone-arrays/

**Strand B**
- Farina ESS (AES 2000) — https://www.zanotowane.pl/1191/7715/ ; measurement parameters (AES24/CCRMA) — https://ccrma.stanford.edu/courses/318/mini-courses/rooms/mus318_Abel_Lecture/concert%20hall%20measurement.pdf
- Müller & Massarani / INR requirement (DIRAC summary) — https://www.acoustics-engineering.com/html/blog-001.html
- ISO 3382 parameters & JNDs — https://www.mdpi.com/2624-599X/2/3/27
- Kardous & Shaw, NIOSH/JASA 2014/2016 — https://pmc.ncbi.nlm.nih.gov/articles/PMC5102154/
- Hanus, Chalmers 2025 (30 phones, 84 % suitable) — https://odr.chalmers.se/items/2e9736bb-71b4-414f-ab05-3b05a26f72be
- ClapIR unreliability evaluation — https://file.scirp.org/Html/7-2311026_94002.htm
- AcousticCheck — https://acousticcheck.com/ ; Studio Six RT60 — https://rt60.updatestar.com/
- REW — https://RoomEQWizard.com/features.html ; history https://audioxpress.com/article/room-eq-wizard-rew-looking-back-on-audio-measurement-software-history/
- HouseCurve — https://housecurve.com/docs/usage/measurement_process ; built-in mic correction https://community.roonlabs.com/t/room-correction-using-your-iphone-and-housecurve/217335?page=24
- Sonos Trueplay — https://www.trustedreviews.com/explainer/what-is-sonos-trueplay-2929243 ; Dirac guide https://manuals.plus/m/34afa886fc0cd707a61c11a65fc65ced5d29ade1754072606e79e006161ddce3 ; SoundID IR process https://www.sonarworks.com/blog/learn/how-does-soundid-reference-handle-impulse-response-measurements ; HomePod room sensing https://www.macsparky.com/blog/2018/01/the-homepod-as-speaker/
- Moore, Brookes & Naylor, Roomprints, WASPAA 2013 — https://spiral.imperial.ac.uk/handle/10044/1/12539
- RevRIR 2024 — https://arxiv.org/html/2406.03120v1 ; DCASE 2024 ASC — https://arxiv.org/html/2405.10018v1 ; DIR augmentation — https://ar5iv.labs.arxiv.org/html/2305.07499
- BUDDy — https://arxiv.org/html/2405.04272v1 ; BERP — https://arxiv.org/html/2405.04476v2 ; AV-RIR — https://arxiv.org/html/2312.00834v1 ; AnyRIR — https://arxiv.org/html/2510.17788v2
- Allen & Berkley image method, JASA 1979 — http://jontallen.ece.illinois.edu/uploads/537.F18/Papers/Public/Allen-PDFs/Allen-Jun3.22/AllenBerkley79.pdf
- iOS measurement mode (forum, low weight) — https://gearspace.com/threads/iphone-in-built-mic-what-is-it-and-why-does-it-sound-truer-to-my-voice-than.942534/page-2
