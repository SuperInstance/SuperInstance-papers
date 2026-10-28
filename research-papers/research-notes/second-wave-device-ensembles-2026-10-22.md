# Second Wave — Device-Ensemble Perception

_Sweep date: 2026-10-22 (AKDT), second wave for the dual-capture programme. Angle, deliberately different from wave 1 (`two-ears-two-eyes-20261022-0915/report.md`): not "two devices, one room, solved pairwise" but **ensembles** — systems, academic and shipped, where many consumer devices in one space pool their senses and act as one perceiver. Confidence labels follow wave 1: **[verified]** = primary page read this run; **[index]** = search-index extract of the abstract/primary page only; **[unverified]** = claim not checked against a primary source — do not quote it as fact._

## The one-paragraph verdict

Wave 1 found the pairwise physics (sync, drift, TDOA geometry). The ensemble literature adds a consistent architectural lesson: **nobody ships coherent fusion across arbitrary consumer devices; what ships is arbitration, anchoring and selection.** Products arbitrate (only the closest Echo answers), anchor (ARKit/ARCore/Quest share a coordinate frame, not raw senses), or select (best mic/transcript wins). Academia goes further — blind beamforming over phones on a table, decentralised collaborative SLAM, ego–exo mocap — but every academic system that reports strong numbers either controls the devices' placement, adds a server, or adds a modality (IMU, UWB, extra cameras). The dual-capture programme's two-sovereign-logs design sits exactly in the gap: two devices, no server, no placement control. The ensemble work says the winnable version of that is *anchor + arbitrate*: agree a shared frame and a shared clock by designed exchanges, then let each log stay sovereign and fuse late.

---

## 1. Distributed microphone ensembles

### 1.1 Microsoft Research — ad-hoc arrays from personal devices (meeting transcription)

Yoshioka et al., "Meeting Transcription Using Asynchronous Distant Microphones," *Interspeech 2019*; Microsoft Research blog, published 2019-09-13 **[verified — blog page read in full this run]** https://www.microsoft.com/en-us/research/blog/bring-your-phones-to-the-conference-table-creating-ad-hoc-microphone-arrays-from-personal-devices/

- The pitch is the ensemble pitch verbatim: attendees' own phones, laptops and tablets "virtually form an ad hoc microphone array in the cloud" — no special-purpose hardware.
- Pipeline: align the unsynchronised signals → **blind beamforming** (neural, "without any knowledge about the microphones and their locations") → ASR + diarisation per stream → consolidate by combining confusion networks.
- Reported gain: the system "outperforms a single-device system by 14.8% and 22.4% with three and seven microphones respectively" **[verified as quoted on the blog; the blog does not name the metric on that line — treat the percentages as the vendor's summary of the paper's transcription results, not as a standalone accuracy figure]**.
- The honest line, also on the page: despite the concept dating "back to the beginning of this century", ad-hoc arrays had "not been realized as a product or public prototype" as of 2019. Still true in substance in 2026 for arbitrary-device coherent arrays.

### 1.2 Ad-hoc smartphone circular arrays (AES 2022)

Bountourakis, Vryzas & Dimoulas, "Circular harmonic processing with an ad-hoc smartphone array for speech enhancement," *AES 152nd Convention, 2022* **[index — abstract read via index]** https://www.researchgate.net/publication/360484541_Circular_harmonic_processing_with_an_ad-hoc_smartphone_array_for_speech_enhancement

- Several smartphones placed in a circle emulate a circular microphone array; circular-harmonic beamforming for DOA estimation and noise reduction, plus a cross-pattern coherence post-filter. Evaluated on directivity characteristics and a listening test over a simulated multi-speaker dataset.
- Note the enabling assumption: **known, deliberate geometry** (a circle, phones placed for the purpose). The ensemble works because placement is part of the protocol — the opposite of found devices.

### 1.3 Self-distributing acoustic swarms (Univ. of Washington, Nature Communications 2023)

Itani, Chen et al. (Gollakota group), "Creating speech zones with self-distributing acoustic swarms," *Nature Communications* 2023 **[index — journal abstract extract + authors' summary read via index]** https://link.springer.com/article/10.1038/s41467-023-40869-8 ; authors' summary: https://communities.springernature.com/posts/speech-separation-and-2d-localization-with-self-distributing-microphone-arrays

- Tiny robots self-distribute across a table using acoustic chirps + IMU (no cameras, no external infrastructure), self-localising to centimetre level, wirelessly synchronised — i.e. the swarm *manufactures* the two things found-device ensembles lack: known geometry and a shared clock.
- On the resulting distributed array: joint speech separation + 2-D localisation of **3–5 concurrent speakers, localised to 15 cm in real-world unseen reverberant environments** (authors' figure, **[index]**).
- Relevance: this is the existence proof that distributed-mic *point* localisation works — with many microphones, known positions, and sync solved by design. It sharpens, rather than softens, wave 1's verdict on two free microphones.

### 1.4 What shipped instead: arbitration — Amazon Echo Spatial Perception / Cloud ESP

**[index]** VentureBeat on Cloud ESP (2018): https://venturebeat.com/ai/amazon-cloud-esp-lets-alexa-devices-team-up-to-judge-user-proximity ; AFTVnews on the original ESP rollout (2016): https://www.aftvnews.com/amazon-echo-and-echo-dot-update-with-echo-spatial-perception-starts-rolling-out/

- ESP (2016, on-device) and Cloud ESP (2018, cloud, extended to third-party Alexa devices): every Echo that hears the wake word compares evidence; **only the device judged closest answers**. The ensemble's shared percept is a single bit of geometry — *which device is nearest the speaker* — computed from relative loudness/proximity, not a fused audio stream.
- This is the most widely deployed device-ensemble perception system in homes, and its design choice is the lesson: when sync and geometry are uncontrolled, **arbitrate, don't fuse**.

### 1.5 Worn ensembles: CoHear (multi-earphone collaboration)

CoHear: Conversation Enhancement via Multi-Earphone Collaboration, arXiv **[index — paper HTML extract]** https://arxiv.org/html/2505.21004v3

- Multiple people's earphones collaborate: joint source localisation + beamforming + speaker-identity (d-vector) extraction, co-optimised rather than pipelined, to enhance the conversation for each wearer. The ensemble members are *worn by different people* — the array moves, splits and rejoins with the social group. Numbers not extracted this run — **[unverified]** for any performance figure.

---

## 2. Multi-device SLAM and shared spatial anchors

### 2.1 Kimera-Multi (MIT, distributed dense metric-semantic SLAM)

Tian, Chang, et al., "Kimera-Multi: Robust, Distributed, Dense Metric-Semantic SLAM for Multi-Robot Systems," *IEEE Transactions on Robotics* 2022 **[index — abstract read via index]** https://www.researchgate.net/publication/358002757_Kimera-Multi_Robust_Distributed_Dense_Metric-Semantic_SLAM_for_Multi-Robot_Systems

- Each visual-inertial agent builds a local trajectory + local semantic mesh; on meeting, agents run distributed place recognition and robust pose-graph optimisation (incremental maximum-clique outlier rejection in summaries; distributed graduated non-convexity in the journal abstract) and deform their meshes into agreement.
- Claims from the abstract: fully distributed (peer-to-peer only), accuracy comparable to a centralised system, trajectories up to 800 m per robot in experiments **[index]**.
- Ensemble pattern: **sovereign local maps, negotiated agreement on contact** — structurally the closest academic relative of the active-log/active-ledger doctrine in this whole sweep.

### 2.2 COVINS / COVINS-G (ETH Zürich, centralised collaborative visual-inertial SLAM)

Patel et al., COVINS, *ISMAR-Adjunct 2021*; COVINS-G generic back-end **[index — abstracts read via index]** https://www.research-collection.ethz.ch/items/790d544d-fa5f-4145-92de-b39447f02500 and https://www.research-collection.ethz.ch/items/8ce7129b-7492-463c-b845-5852bed8b6e3

- The opposite architecture to Kimera-Multi: each agent runs VIO onboard for autonomy but ships keyframes to a **server back-end** that does place recognition, global optimisation and redundancy removal. Demonstrated with **12 agents jointly performing SLAM** over ~500 m of village scenery, 1,750 m total trajectory (figure caption, **[index]**).
- COVINS-G generalises the back-end to arbitrary VIO front-ends (e.g. a RealSense T265's built-in odometry) — the ensemble admits heterogeneous members by standardising what they *contribute* (keyframes), not how they sense.

### 2.3 Swarm-SLAM (Polytechnique Montréal, sparse + decentralised)

Lajoie & Beltrame, "Swarm-SLAM: Sparse Decentralized Collaborative SLAM Framework for Multi-Robot Systems," *IEEE Robotics and Automation Letters* 9(1):475–482, 2024 **[index — arXiv abstract read via index]** https://arxiv.org/html/2301.06230v3/

- Open-source C-SLAM designed to be "scalable, flexible, decentralized, and sparse": lidar, stereo or RGB-D; a novel inter-robot loop-closure prioritisation cuts communication and speeds convergence. Evaluated on five datasets plus a real-world run with **three robots on an ad-hoc network** **[index]**.
- The design pressure is bandwidth: ensembles that must work on intermittent links exchange *selected constraints*, not maps. Directly relevant to any phone+laptop ensemble on home Wi-Fi with a human walking between the radios and the router.

### 2.4 Shipped shared anchors: ARKit collaboration, ARCore Cloud Anchors, Quest colocation

- **Apple ARKit collaborative sessions** (ARKit 3, 2019): devices continuously share mapping data over Multipeer Connectivity; the maps merge into one, anchors are shared, and other participants appear as `ARParticipantAnchor`s **[index]** https://multitudes.github.io/posts/Introducing%20ARKit3/ and Kodeco's ARKit book chapter https://www.kodeco.com/books/apple-augmented-reality-by-tutorials/v2.0/chapters/12-arkit . What is shared is the *map and anchors* — each device still perceives alone.
- **Google ARCore Cloud Anchors** (ARCore 1.2, Google I/O 2018): one device hosts an anchor from its local feature map via the cloud; other devices (ARCore *or* ARKit) resolve it and see virtual objects at the same physical place **[index]** https://forums.appleinsider.com/discussion/205402/ . Persistence + cross-platform, at the price of a cloud round-trip and a hosted map.
- **Meta Quest colocation / Shared Spatial Anchors**: two or more headsets in the same room share spatial anchors so virtual objects and avatars align with everyone's real positions; requires "enhanced spatial services" **[index — Meta help page]** https://www.meta.com/en-gb/help/quest/1083740680462326/ . Quest Pro colocation works by **sharing point clouds via Meta's servers** **[index]** https://roadtovr.com/meta-quest-pro-colocation-multiplayer/ . In 2025 the Quest browser added experimental **Shared Spaces for WebXR**: headsets in a room automatically establish one shared coordinate space (room-sized; a `reset` event fires when the true shared space replaces the default) **[index]** https://www.uploadvr.com/quest-web-browser-experimental-colocation-webxr/ .
- Pattern across all three vendors: the shared artefact is a **coordinate frame + anchors**, established from visual maps, mediated by a peer link or a cloud. None of them shares raw perception; none uses audio.

### 2.5 The radio shortcut: UWB ranging (Apple Nearby Interaction)

**[index — secondary summaries only; no Apple primary page read this run]** Apple's U1 chip (iPhone 11, 2019) gave iPhone "spatial awareness" of other U1 devices; the Nearby Interaction framework lets apps measure **distance and direction** to a peer device/accessory, with an ARKit camera-assistance mode that widens the field of view by fusing UWB with camera tracking https://pandromeda.com/mobile/what-is-ultra-wideband-uwb-how-it-works-on-your-phone . A press claim of "up to 10 centimeters" indoor accuracy circulates (Light Reading, 2019, https://www.lightreading.com/smartphones-devices/apple-gives-ultra-wideband-a-spin ) — **[unverified]** against any Apple primary source; do not quote as Apple's figure.
- Relevance to dual-capture: UWB is BeepBeep's productised cousin — two-way radio ranging that cancels clock problems by construction — but only where both devices carry the radio (Apple-to-Apple, select Android flagships). Casey's phone+laptop pair has no such common radio path in the browser, so the acoustic two-way chirp remains the portable version.

---

## 3. Cross-device experience platforms (the plumbing layer)

Google **Cross Device SDK** (developer preview announced 2022) **[index — primary doc extract]** https://developer.android.google.cn/guide/topics/connectivity/cross-device-sdk/overview?hl=en

- Three primitives only: **device discovery and authorisation, secure connections and data transfer, multi-device sessions** (transfer/extend an app's experience across devices). Examples: multiplayer gaming, task handoff, group ordering.
- Telling absence: the platform vendors' cross-device toolkits move *state and UI* between devices; **pooled sensing is not a platform primitive anywhere**. Every ensemble in §1–2 built its own discovery/sync/geometry layer. That is both the cost and the open niche wave 1 already flagged for same-device acoustic measurement.

---

## 4. Fusing a fixed room camera with a carried/worn camera

### 4.1 Ego-Exo4D (Meta AI + universities, CVPR 2024)

Grauman et al., "Ego-Exo4D: Understanding Skilled Human Activity from First- and Third-Person Perspectives" **[index — abstract + paper extracts read via index]** https://arxiv.org/html/2311.18259v3 ; project: https://ego-exo4d-data.org/

- The reference rig for exactly the dual-capture geometry, at dataset scale: a worn Aria glasses unit (RGB + 2 SLAM cameras, IMU, eye gaze, **7-channel audio**, 3-D point clouds) plus **4–5 tripod exocentric cameras** per scene, all time-synchronised and localised in one metric, gravity-aligned frame.
- Scale: **740 camera wearers, 123 scenes, 13 cities, 1,286 hours, takes of 1–42 min** **[index, from the abstract]**.
- How sync/calibration is achieved in the rig matters more than the scale: a deliberate **QR-code time-sync/calibration procedure** (secondary summary, **[index]** https://entreprenerdly.com/meta-introduces-ego-exo4d-a-dataset-for-video-learning/ ) — i.e. even Meta's flagship ego–exo corpus does not discover sync from ambient content; it *stages* it. Dual-capture's claps are the same move at kitchen-table scale.

### 4.2 EgoExoMoCap (Meta Reality Labs + ETH Zürich)

Jiang et al., "EgoExoMoCap: Distributed Ego-Exo Human Motion Capture" — project page lists it as an ECCV 2026 Spotlight **[index — project page read via index; venue label as printed on the page]** https://siplab.org/projects/EgoExoMoCap ; paper https://arxiv.org/html/2607.15868

- "As simple as two (or more) people, each wearing a pair of smart glasses": continuous egocentric signals (head/wrist tracking) fused with **intermittent** exocentric views — each wearer's camera is the fixed witness for *everyone else*. Early fusion of 2-D/3-D features with reliability weighting beats naive late fusion, and adding observers measurably improves pose accuracy (paper extracts, **[index]**).
- This is the ensemble generalisation of dual-capture's pair: in a room of wearers there is no fixed camera at all — the exo view is a role devices take for each other.

### 4.3 Everybody Tracking Every Body (UC Irvine)

Shin et al., "Everybody Tracking Every Body" **[index — arXiv abstract read via index]** https://arxiv.org/html/2608.29927

- Multiple people, each wearing a camera + IMU; VIO SLAM tracks each egocentric camera; each person's view gives sparse, intermittent, variable-reliability third-person observations of the others; a diffusion model fuses head-motion-derived pose with those exo observations, conditioned on observation reliability. Reported to improve absolute and relative pose over motion-only and vision-only baselines (authors' claim, no numbers extracted — **[unverified]** for figures).

### 4.4 Look and Tell (KTH, Aria + stationary cameras)

Deichler & Beskow et al., "Look and Tell: A Dataset for Multimodal Grounding Across Egocentric and Exocentric Views" **[index — abstract read via index]** https://arxiv.org/html/2510.22672

- Project Aria glasses + stationary kitchen cameras, synchronised gaze/speech/video from 25 participants, 3.67 hours, 2,707 annotated referential expressions, with 3-D scene reconstructions. Small, but it is the fixed+worn configuration pointed at *reference and language* — which view lets a partner identify "that one" — rather than pose.

---

## 5. What the second wave changes for dual-capture

1. **Anchor + arbitrate is the shipped shape; coherent fusion is the lab shape.** The next take's protocol already moved this way after wave 1 (claps near both devices, BeepBeep-style two-way chirp). The ensemble literature endorses it and names the chirp exchange for what it is: manufacturing the shared frame the ensemble cannot discover.
2. **Sovereign logs + negotiated agreement is a published, working architecture** (Kimera-Multi), not just a doctrine. Its transferable trick is outlier-robust agreement: inter-device loop closures are *hypotheses* that must survive a consistency check before they deform either log. The dual-capture analogue: a candidate clap/chirp alignment should have to survive the same kind of clique/consistency test before either timeline is resampled.
3. **Bandwidth discipline** (Swarm-SLAM, COVINS): exchange keyframes/constraints, not raw streams. For a phone+laptop pair this is already the shape (bundle up, analyse after) — the ensemble work says keep it, and prioritise *which* sync events to exchange first.
4. **Staged sync is the norm even at Meta scale** (Ego-Exo4D's QR procedure). No apology needed for a clap protocol; the research frontier is not "sync without staging", it is fusion that tolerates intermittent, unreliable cross-views (EgoExoMoCap, Everybody Tracking Every Body) — which is precisely the dual-capture render/fusion lane's real problem, ahead of it having any renders.
5. **Still nobody's product:** pooled *sensing* across a person's own phone + laptop in a room. Platforms share anchors, state and answers — not perceptions. The gap wave 1 found for phone-alone room measurement has an ensemble twin, and it is equally open.

## Could not verify / caveats

- UWB "10 cm" accuracy: press figure only, no primary source read — **[unverified]**.
- CoHear and Everybody Tracking Every Body: no performance numbers extracted; any figure for them is **[unverified]**.
- Microsoft's 14.8% / 22.4%: verified as printed on Microsoft's own blog; the underlying metric is not named on that page.
- EgoExoMoCap's "ECCV 2026 Spotlight" is the project page's own label, recorded as printed.
- Two arXiv identifiers surfaced by the index carry implausible future stamps (2607.*, 2608.*); the abstracts were read via the index, but the identifiers should be re-checked before citing them in print.
