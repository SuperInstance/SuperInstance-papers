# Deep Research Report: Optogenetics through the Lens of Memory-as-Pruning and Constraint-as-Power

Researched 2026-10-05. All sources were gathered via the web index (flagged `index`); none were verified live in a browser session, as the mission was answered from published articles, reviews, and prize coverage. Confidence is high where multiple independent sources agree; speculative/interpretive sections are marked as such.

## Summary

- The 2026 Nobel Prize in Physiology or Medicine was awarded on 2026-10-05 to Karl Deisseroth, Peter Hegemann, and Georg Nagel "for discoveries concerning light-gated ion channels and optogenetics" (Reuters, Fierce Biotech — index). The committee framed it as a method that makes it possible to switch individual nerve cells on or off in a living brain.
- **Q1 (Memory as pruning):** Neuroscience increasingly treats memory as a selection process, not an accumulation process. Forgetting is actively, energetically driven (dopamine → Scribble/Rac1/cofilin "forgetting signalosome" in Drosophila; hippocampal neurogenesis disrupting recent memories). Engrams are refined during consolidation: the majority of learning-induced synapses are pruned (REM sleep, MEF2), neurons drop out of and into engrams, and only clustered engram-to-engram synapses survive massive synaptic loss. Optogenetics lets researchers test which circuits survive: Tonegawa-lab engram tagging, forced engram-size experiments (Lüscher lab), optogenetic LTP at engram synapses, and the new Opto-T1 astrocyte tool all isolate kept-vs-discarded circuitry.
- **Q2 (Discovery chain):** A genuine chain of shadowing: Hegemann (early 1990s) wanted to know how an alga swims toward light; his protein-extraction attempt failed; Kazusa gene sequences (2000) revived the project; Nagel's frog-egg assays established channelrhodopsin-1 (Science 2002) and -2 (PNAS 2003); Crick's 1999 wish-list named exactly this tool years before it existed; Deisseroth's lab made neurons fire on command (Nature Neuroscience 2005); the word "optogenetics" was coined in 2006; in-vivo control followed in 2007; engram reactivation in 2012. None of the algal phototaxis work was conceived as neuroscience.
- **Q3 (Constraint as power):** The breakthrough was subtraction of off-target effects, not addition of energy. Crick (1999): "turn the firing of one or more types of neuron on and off in the alert animal in a rapid manner. The ideal signal would be light." Deisseroth: "I have conducted many brain-stimulation treatments in psychiatry that suffered greatly from a lack of precision. You can stimulate certain cells that you want to target, but you also stimulate all of the wrong cells as well." Grill's "plate of spaghetti" metaphor and Tonegawa's targeted-vs-broad-population finding corroborate: specificity is the therapeutic and causal variable.
- **Q4 (Therapeutics):** Only retinal restoration has human results. MCO-010 (Nanoscope) met its phase 2b/3 primary endpoint (RESTORE, n=27), durable 3 years, BLA expected early 2026 — the strongest real result. The 2021 Sahel/Roska single-patient case was proof of principle. Parkinson's, depression, epilepsy, addiction, Alzheimer's are animal-stage research; there are no human brain optogenetics trials. Nagel himself said only one patient has "profited" so far and the prize felt premature for medicine.
- **Q5 (Gunpowder):** The history of interventional neuroscience reads as progressive narrowing: Galvani's unfocused electricity (1791) → Penfield's mapping stimulation (1930s) → destroying whole nuclei (stereotactic lesions) → stimulating everything nearby (DBS) → activating only genetically defined cell types (optogenetics). Progress = better constraints, not bigger explosions. The brain does the same thing in memory: overshoot, then prune.

---

## Q1. Memory as Pruning

### 1a. Forgetting is an active, energy-consuming mechanism — not decay

The dominant modern picture is that forgetting is biologically regulated erasure, part of the brain's "memory management system" (Rac1 intrinsic-forgetting review, PMC10341513 — index).

- In *Drosophila*, memory decay requires activation of the small GTPase **Rac1** in mushroom-body (Kenyon) cells and the dopamine receptor **DAMB**, driven by dopaminergic PPL1 neurons (PNAS, "Dissecting neural pathways for forgetting" — index).
- Cervantes-Sandoval et al. (Neuron, 2016) identified **Scribble** as a scaffold that physically couples dopaminergic input to a "forgetting signalosome": Scribble–Rac1–Pak3–cofilin, which remodels actin in dendritic spines and destabilizes them (Science Signaling summary, 2016 — index).
- A second, parallel dopaminergic forgetting pathway runs through nitric oxide → guanylyl cyclase → cGMP → Kdm4B/Bur gene-expression programs at engram synapses (Molecular Psychiatry review, 2024 — index).
- Paul Frankland's lab showed adult hippocampal **neurogenesis** remodels hippocampal circuits and preferentially disrupts *recent* memories, likening it to rewiring: "If you go in and start rewiring something, any information stored in that circuit might be degraded" (Quanta Magazine, 2018 — index). Notably, this forgetting is slower than intrinsic dopamine/Rac1 forgetting.
- Forgotten memories leave latent fragments: sea slugs sensitized then left to "forget" for a week show reinstatement when reminded — "it's not just passive decay of memories... Everything isn't just gradually, completely gone" (Irina Calin-Jageman, via Quanta — index).

### 1b. Engrams are refined by pruning during consolidation

- "A Synaptic Framework for the Persistence of Memory Engrams" (PMC8024575 — index): stable memory is maintained by **only a subset** of new/strengthened synapses. "Refinement of the engram cell network by gradual elimination of the majority, but not all, learning-induced new and/or strengthened synapses would enable some synaptic alterations to endure."
- Mechanism evidence: **Li et al. 2017** — motor-learning-induced cortical spines are **pruned during REM sleep** while a subset is strengthened; weaker engram synapses are eliminated first; **MEF2** is implicated (Caroni et al. 2014).
- The 2026 engram-synapses review (Wiley, jnc.70404 — index): synaptic changes after learning "are refined through memory replay and stage-dependent synaptic pruning during sleep" (Cirelli 2013).
- **Dynamic engrams** (Nature Neuroscience, s41593-023-01551, 2023 — index): longitudinal imaging shows neurons continuously **drop out of and drop into** the engram over consolidation; the probing-activated ensemble shrinks; only dynamic (not static) engram ensembles predict the animal's behavioral discrimination. Consolidation is a selection process.
- Artificial-hibernation study (OIST, reported Sept 2026 — index, secondary source): mice lost >50% of hippocampal synapses during two-day hibernation yet kept their memories. Synapses organized into **tight clusters between engram cells** were selectively spared; lost spines often regrew at the same dendritic location. Tanaka: "for long-term memory, only particular clusters of synapses matter—the rest may be dispensable." This pushes the pruning lens further: it is not individual connections that are kept, but a resilient higher-order pattern.

### 1c. How optogenetics specifically studies kept-vs-discarded circuits

- **Tonegawa lab (2012, Nature):** labeled engram cells active during learning and reactivated them with light to prove a defined subpopulation carries the memory (Laser Focus World/technology review summaries — index).
- **Tonegawa lab (2016, Nature):** optogenetic induction of LTP specifically at perforant-path synapses of dentate-gyrus engram cells restored spine density and memory in early Alzheimer's mice; "indiscriminately shining light in the dentate gyrus" did nothing — only **precise** stimulation of engram cells worked (Laser Focus World — index). A direct kept-vs-discarded demonstration: the cells that survive pruning/degeneration are the ones that matter.
- **Mendez & Lüscher (Neuron, 2016):** engram neurons recruit inhibitory cells that suppress neighbors from joining. Using optogenetics to "force" larger or smaller engrams: "the more the engram is significant, the better the memory is preserved, but only up to a limited point. Beyond a certain size, memory no longer works. We were thus able to reinforce a memory, but also to remove it" (ScienceDaily/UNIGE — index). Optogenetics made engram *size* an experimental variable — proof that the brain actively constrains the engram.
- **Opto-T1 (2026):** a new optogenetic tool activating astrocytic TrkB.T1 signaling with light enhanced *remote* (not recent) memory — implicating astrocytes in deciding what persists (Scientific Inquirer — index).
- A 2026 preprint ("The Neuroscience of Forgetting") frames Rac1–cofilin as a "druggable axis" for targeted memory weakening, noting that nonspecific activation would cause global synaptic dysregulation — the pruning mechanism itself demands precision (preprints.org — index).

---

## Q2. The Discovery Chain

| Step | Year | What happened | Source (index) |
|---|---|---|---|
| Hegemann asks how *Chlamydomonas reinhardtii* senses and swims toward light | early 1990s | At the Max Planck Institute for Biochemistry, hypothesis: a single protein both detects light and functions as an ion channel (reactions >20× faster than the human eye) | New Scientist; devdiscourse |
| Attempt to isolate the protein from the algal eyespot fails | 1990s | "When his team tried to pull the protein out of the eyespot, it fell apart, and the idea stalled for years" | martincid |
| Crick names the dream | 1999 | "One of the next requirements is to be able to turn the firing of one or more types of neuron on and off in the alert animal in a rapid manner. The ideal signal would be light... it is conceivable that molecular biologists could engineer a particular cell type to be sensitive to light in this way." (Phil. Trans. R. Soc. B 354:2021–2025) | Unige thesis PDF; ResearchGate (Tsien quoting Crick) |
| Kazusa DNA Research Institute posts *Chlamydomonas* gene sequences | 2000 | Hegemann, then at Regensburg, spots two bacteriorhodopsin-like sequences, obtains copies, asks Nagel to test them | Scientific American extended version |
| Channelrhodopsin-1 | 2002 | Nagel et al., Science: light-gated proton channel, expressed in frog oocytes | OPN; Wikipedia |
| Channelrhodopsin-2 | 2003 | Nagel et al., PNAS: "a directly light-gated cation-selective membrane channel"; opens within ~0.2 ms of blue light; works in human/hamster cells; noted it "may be used to depolarize small or large cells, simply by illumination" | OPN; noozify; martincid |
| First neuron fires on light | summer 2004 / pub. 2005 | Boyden, Zhang (Deisseroth lab) with Bamberg & Nagel, Nature Neuroscience: "Millisecond-timescale, genetically targeted optical control of neural activity." Lentiviral ChR2 in rat neurons; "neurons became precisely responsive to light in a millisecond timescale" | IEEE Pulse; The Scientist (Boyden first-person) |
| Word coined | 2006 | "Optogenetics" first used in Deisseroth et al. 2006, originally covering both imaging genetically expressed reporters and perturbing genetically targeted neurons | IEEE Pulse |
| In-vivo control in living mice | 2007 | Fiber-optic interface (Aravanis et al.); transgenic ChR2 mice (Arenkiel et al.) | martincid; synthneuro review |
| Engram reactivation | 2012 | Liu & Ramirez (Tonegawa lab), Nature: optogenetic reactivation of fear-memory engram cells | Laser Focus World; Technology Review |

**The shadowing aspect:**
- Hegemann's motivating question was phototaxis in algae — explicitly *not* neuroscience. The New Scientist and OPN prize coverage both frame it as: "In the 1990s, Peter Hegemann... wondered how a single-celled alga can swim towards light."
- Nagel's relevant expertise was ion channels in frog oocytes (with Bamberg he had already shown bacteriorhodopsin works in vertebrate cells in 1995) — the channel was the thing, not the brain.
- Crick wrote the spec in 1999 for a tool nobody had; Roger Tsien emailed Hegemann in October 1999 explicitly linking the algal opsins to Crick's vision — but Hegemann and Nagel did not yet know they held the switch.
- Deisseroth's entry was clinical frustration as a psychiatrist: existing brain-stimulation treatments "suffered greatly from a lack of precision" — he was shopping for a tool, not discovering one. He wrote to Nagel asking for the channelrhodopsin-2 gene (Smithsonian).
- Boyden on the first successful neuron: "Did we know it was going to work? The honest answer is it was luck." / "There was a lot of scepticism" (Cosmos, via synthneuro PDF).
- Parallel shadows: Miesenböck (Lima & Miesenböck 2005, Cell — a different light-sensitive system) reached neurons-with-light first in a sense; Boyden, Bamberg, and Miesenböck shared the 2013 Brain Prize with the three laureates but not the Nobel (martincid). The prize's line through a crowded field is itself part of the story.

---

## Q3. Constraint as Power

**The core claim:** optogenetics' power is not the light — it is the *genetic constraint* on who the light affects. Deisseroth's canonical 2011 definition: "Optogenetics refers to the combination of genetics and optics to control well-defined events within specific cells of living tissue... manipulation of neural activity with millisecond precision while maintaining cell-type resolution through the use of specific targeting mechanisms" (Nature Methods 8:26–29, cited verbatim in multiple patent documents — index).

**Key quotes:**
- **Francis Crick, 1999:** "One of the next requirements is to be able to turn the firing of one or more types of neuron on and off in the alert animal in a rapid manner. The ideal signal would be light, probably at an infrared wavelength... it is conceivable that molecular biologists could engineer a particular cell type to be sensitive to light in this way." The spec is pure constraint: *one type*, *on and off*, *rapid*, *in the alert animal*.
- **Karl Deisseroth** (Scientific American profile): "I have conducted many brain-stimulation treatments in psychiatry that suffered greatly from a lack of precision. You can stimulate certain cells that you want to target, but you also stimulate all of the wrong cells as well." The clinical origin of the tool was the *cost of imprecision*, not the absence of stimulation.
- **Warren Grill (Duke), on electrical vs. light-based DBS:** "If you think of the area of the brain being treated in deep brain stimulation as a plate of spaghetti, with the meatballs representing nerve cell bodies and the spaghetti representing nerve cell axons... electrical deep brain stimulation affects them both as well as the peppers, onions and everything else in the dish. Our new light-based method, however, is capable of targeting just a single ingredient" (Parkinson's News Today — index).
- **Susumu Tonegawa** (Alzheimer's engram study): recovery came from stimulation "only in the memory cells, rather than in a broad population of cells," highlighting "the importance of highly targeted manipulation of neurons and their circuits for future therapies" (Laser Focus World — index).
- **Sheena Josselyn** (on lesion/ablation approaches): "You can do many things to make a mouse not remember something or not be able to perform a task. There's no specificity there" (Technology Review — index).
- **Noozify synthesis of the 2005 result:** "Electrodes stimulate everything nearby. Drugs act over minutes... Because the instructions could be written so that only one chosen type of cell would read them, the light affected those cells and left their neighbors alone."
- **Abdel El Manira (Nobel committee):** "For the first time, causal links between specific brain circuits and behavior had been achieved" — causality itself is a product of constraint: with everything firing at once, correlation is all you can see (Fierce Biotech — index).

**Mechanism of the power:** three orthogonal constraints multiply — (1) *genetic*: only cells expressing the opsin (via viral vectors, Cre-lines) respond; (2) *temporal*: millisecond on/off, matching natural spike timing; (3) *spectral/spatial*: distinct wavelengths address distinct populations; fiber optics localize delivery. Flooding the brain with stimulation buys none of these.

---

## Q4. Therapeutic Horizon

**Real (human data):**
- **Retinal restoration in retinitis pigmentosa — the only therapeutic beachhead.**
  - *Sahel/Roska/GenSight (Nature Medicine, 2021):* single patient, blind ~40 years, received ChrimsonR channelrhodopsin gene in one eye + light-amplifying goggles; regained ability to locate and count objects on a table. Proof of principle, n=1 (Ophthalmology Times — index).
  - *Nanoscope MCO-010:* multi-characteristic opsin delivered by single intravitreal AAV2 injection; works with **ambient light** (no goggles). RESTORE phase 2b/3 randomized sham-controlled trial (n=27, advanced RP): 52-week primary endpoint met — ~40% of treated patients gained ≥0.3 logMAR (3 ETDRS lines) vs. sham; gains durable to 2.5–3 years (low-dose mean +0.453 logMAR at 152 weeks); well tolerated, no serious AEs. Vinit Mahajan (Stanford, ARVO 2026): "one of the first optogenetic trials to achieve its primary endpoints." BLA expected early 2026; phase 4 study planned (Medscape ×2 — index). The MCO-010 opsin is "one of the most synthetic, non-mammalian proteins ever expressed in a human."
  - *Restore Vision RV-001 (GPCR-based):* first-in-human Phase 1/2 (n=6), interim ARVO 2026 data: all 3 high-dose patients reached light perception within a month; no dose-limiting toxicities (BioPharm International — index).
- Nagel's own calibration (CNN, prize day): only one patient has "profited from optogenetics so far," and he had thought the prize "still too early... in medicine."

**Animal-stage (real science, not therapies):**
- *Parkinson's:* Grill lab showed Chronos-based light stimulation of STN neurons at 130 Hz in rats mimicked electrical DBS (Parkinson's News Today — index); Gittis lab (CMU) used optogenetics to identify cell classes for long-lasting DBS relief, then translated findings into pulsed *electrical* DBS protocols (SciTechDaily — index); EU STARDUST project explored an ultrasonically powered optogenetic implant for Parkinson's (EC — index). No human brain optogenetics trials exist.
- *Depression/psychiatry:* Deisseroth's program mapped mood-relevant circuits; Tonegawa lab reversed depression-like symptoms in mice by reactivating positive memories. The stated goal is target discovery for future therapies, "not necessarily to use optogenetics itself as the treatment" (healthknobs overview — index).
- *Epilepsy:* considered the most plausible near-term brain application if gene-delivery issues are resolved (PMC review — index).

**Hype vs. reality summary:** retinal gene therapy is genuinely near-term (BLA 2026). Everything involving the brain is preclinical because it requires inserting a foreign gene into human neurons *and* getting light deep into tissue — long-term safety of carrying an algal protein in human neurons is unestablished (martincid — index).

---

## Q5. The Gunpowder Metaphor

The researcher's framing — energy unguided is an explosion; constrained it is work — maps onto interventional neuroscience as a history of **progressive narrowing**, where each advance was a better constraint, not more power:

1. **1791 — Galvani.** Electrical stimulation of frog nerves: energy applied to tissue with essentially zero specificity. The backbone of neuroscience for 230 years (PMC6513977 — index).
2. **1930s — Penfield.** Intraoperative electrical stimulation maps motor cortex (the homunculus). Still "activates tissue in a very general, nonselective way" (Frontiers for Young Minds — index).
3. **1947–1960s — stereotactic lesioning.** Spiegel & Wycis frames; functional neurosurgery meant *destroying* deep nuclei by radiofrequency to treat Parkinson's tremor. The coarsest constraint imaginable: remove the thing (Frontiers, Origin and Evolution of DBS — index).
4. **1952–1987 — from lesions to stimulation.** Delgado, Bekthereva, Benabid: DBS replaces destruction with modulation — but remains "a relatively crude method... the implanted electrode influences all cells nearby" (Scientific American India — index).
5. **1999 — Crick's spec.** Names the missing constraint explicitly: control *one or more types of neuron*, *on and off*, *in the alert animal*, *rapidly*. (ResearchGate/Tsien citation — index)
6. **2002–2005 — the barrel.** Channelrhodopsin adds the genetic constraint (only opsin-expressing cells respond) to the temporal constraint of light (millisecond). As the gunpowder metaphor would have it: the energy (stimulation) already existed; what was missing was the barrel (cell-type specificity).

**Thoughtful parallel:** the brain runs the same logic internally (Q1). Development and memory formation both *overshoot* (exuberant synaptogenesis, broad engram recruitment) and then *prune* (REM-sleep spine pruning, MEF2, Rac1-driven forgetting, dynamic engram refinement). In other words, both the organ being studied and the tool studying it converged on the same principle: **intelligence is in the selection, not the supply.** Optogenetics is powerful precisely because it lets researchers ask "what happens when *only these* cells change?" — the same question the brain answers every night in sleep.

One caveat: the barrel is still being built — light scattering and power-deposition limits constrain spatial resolution in large brains (Deisseroth 2015, cited in PMC6513977 — index). The constraint frontier is now *optical*, not genetic.

---

## Could not verify / Open questions

1. The exact claim that the term "optogenetics" was first used in Deisseroth et al. 2006 (J. Neurosci.) is widely repeated (IEEE Pulse, index) but I did not inspect the 2006 paper itself; one secondary source attributes first use to a 2006 Deisseroth *Nature Neuroscience* article instead. Minor bibliographic discrepancy.
2. The OIST artificial-hibernation study (Sept 2026) and the astrocyte Opto-T1 study (Sept 2026) were read via secondary press reports; I did not verify the primary papers.
3. Nanoscope's BLA timeline ("expected early 2026," Medscape, index) is a company statement; actual filing status as of October 2026 was not confirmed.
4. Whether the STARDUST optogenetic Parkinson's implant produced published results — not confirmed; only the project's existence and aims were verified.
5. Deisseroth's age is reported as 54 (Reuters) and 55 (Seoul Economic Daily) in different outlets; trivial discrepancy.
6. All sources are `index`-level (search snippets/full-text crawls). No facts were verified live in the research browser.

## Sources

All read 2026-10-05 via web index (`index` flag; none `verified live`):

1. Nobel announcement — Reuters: https://www.reuters.com/business/healthcare-pharmaceuticals/deisseroth-hegemann-nagelwin-2026-nobel-medicine-prize-2026-10-05/
2. Nobel coverage — Fierce Biotech: https://www.fiercebiotech.com/research/3-scientists-who-developed-neuron-light-switches-win-nobel-prize-physiology-or-medicine
3. Nobel coverage — CNN: https://www.cnn.com/2026/10/05/science/nobel-prize-medicine-karl-deisseroth-peter-hegemann-georg-nagel-intl?cid=external-feeds_iluminar_meta
4. Nobel coverage — New Scientist: https://www.newscientist.com/article/2591980-nobel-prize-for-medicine-goes-to-trio-who-developed-optogenetics/
5. EU research on Hegemann (STARDUST project): https://research-and-innovation.ec.europa.eu/news/all-research-and-innovation-news/eu-funded-researcher-peter-hegemann-wins-2026-nobel-prize-physiology-or-medicine-2026-10-05_en
6. OPN prize explainer (discovery chain): https://www.optica-opn.org/home/newsroom/2026/october/optogenetics_pioneers_win_2026_nobel_prize_in_physiology_or_medicine/
7. Noozify prize explainer (ChR2 2003 forecast line): https://noozify.com/article/science/20261005-optogenetics-the-nobel-for-a-light-switch-borrowed-from-algae
8. martincid explainer (therapy status, shadowing detail): https://www.martincid.com/science/nobel-medicine-2026-optogenetics-deisseroth-hegemann-nagel/
9. Smithsonian explainer (Deisseroth wrote to Nagel for the gene): https://www.smithsonianmag.com/smart-news/trio-of-scientists-wins-medicine-nobel-for-a-method-to-turn-nerve-cells-on-and-off-with-light-helping-to-unravel-the-brains-mysteries-180989618/
10. Boyden first-person "The Birth of Optogenetics": https://www.the-scientist.com/the-birth-of-optogenetics-42252
11. Scientific American extended optogenetics history (Kazusa sequences): http://www.scientificamerican.com/article.cfm?id=optogenetics-controlling
12. Deisseroth profile w/ precision quote: https://www.scientificamerican.com/article/a-light-in-the-brain/
13. IEEE Pulse "Let There Be Light" (2005 paper, 2006 coinage): https://www.embs.org/pulse/articles/let-light/
14. Channelrhodopsin paper trail: https://en.wikipedia.org/wiki/Channelrhodopsin
15. Nagel bio (1995 bacteriorhodopsin): https://phys.org/news/2021-02-optogenetic-growth-microbial-rhodopsin.html
16. Crick 1999 quote (via Unige thesis PDF): https://unige.iris.cineca.it/bitstream/11567/1287660/1/phdunige_5551592.pdf
17. Crick 1999 quote + Tsien's 1999 email to Hegemann (ResearchGate): https://www.researchgate.net/publication/281343026_Optogenetics_10_years_after_ChR2_in_neurons_-_Views_from_the_community
18. Deisseroth 2011 definition (via patent citations): https://patents.google.com/patent/WO2017187272A1/en
19. Quanta: "To Remember, the Brain Must Actively Forget": https://www.quantamagazine.org/to-remember-the-brain-must-actively-forget-20180724/
20. Rac1 intrinsic forgetting review: https://pmc.ncbi.nlm.nih.gov/articles/PMC10341513/
21. Science Signaling: Scribble forgetting signalosome: https://www.science.org/doi/10.1126/scisignal.aah3809
22. Active forgetting & neuropsychiatric diseases: https://www.nature.com/articles/s41380-024-02521-9
23. PNAS: neural pathways for forgetting in Drosophila: https://www.pnas.org/doi/full/10.1073/pnas.1512792112
24. Synaptic framework for engram persistence: https://pmc.ncbi.nlm.nih.gov/articles/PMC8024575/
25. Dynamic and selective engrams (Nat Neurosci 2023): https://www.nature.com/articles/s41593-023-01551-w
26. OIST hibernation/synapse-loss study (secondary): https://tuzarapost.substack.com/p/scientists-removed-crucial-structures
27. Engram synapses review (2026): https://onlinelibrary.wiley.com/doi/10.1111/jnc.70404
28. Mendez/Lüscher engram-size optogenetics (secondary): http://www.sciencedaily.com/releases/2016/02/160211140432.htm
29. Astrocyte Ank2 / Opto-T1 (secondary): https://scientificinquirer.com/2026/09/12/scientists-discover-how-astrocytes-help-memories-last/
30. Tonegawa engram reactivation (2012, secondary): https://www.technologyreview.com/2016/10/18/156759/tracing-a-memory/
31. Tonegawa Alzheimer's optogenetic spine rescue (secondary): https://www.laserfocusworld.com/biooptics/bioscience/neuroscience/article/14191771/optogenetics-recovers-memories-lost-to-mice-with-alzheimers-disease
32. Grill "plate of spaghetti" light-based DBS: https://parkinsonsnewstoday.com/light-based-dbs-method-parkinsons-motor-symptoms-rats-study/
33. Gittis pulsed-DBS from optogenetics: https://scitechdaily.com/deep-brain-stimulation-research-shows-promising-results-for-treating-parkinsons-disease/
34. MCO-010 RESTORE results: https://www.Ophthalmologytimes.Com/view/optogenetics-for-retinal-disease-mutation-agnostic-gene-therapy-approach-offers-new-possibilities-for-patients-with-advanced-retinal-disease
35. MCO-010 Medscape: https://www.medscape.com/viewarticle/mutation-agnostic-gene-therapy-may-restore-vision-rp-2025a1000qir
36. MCO-010 3-year data (ARVO 2026): https://www.medscape.com/viewarticle/gene-agnostic-therapy-sees-3-year-gain-severe-vision-loss-2026a1000f0l
37. Sahel/Roska 2021 single-patient case: https://www.ophthalmologytimes.com/view/blind-patient-achieves-partial-vision-through-gene-therapy
38. RV-001 early signal: https://www.biopharminternational.com/view/restore-vision-reports-early-clinical-signal-for-gpcr-based-optogenetic-therapy-in-retinitis-pigmentosa
39. Parkinson's/depression therapy overview: https://www.healthknobs.com/category/health-care/optogenetics-brain-research
40. "A Brief History of Simulation Neuroscience" (PMC6513977): https://pmc.ncbi.nlm.nih.gov/articles/PMC6513977/
41. Origin and evolution of DBS (lesion→stimulation): https://www.frontiersin.org/articles/10.3389/fnint.2011.00042/abstract
42. Optogenetics vs. electrical stimulation (Frontiers for Young Minds): https://www.frontiersin.org/journals/frontiers-for-young-minds/articles/10.3389/frym.2017.00051/pdf
43. Optogenetics in a line of brain innovations (Sci Am India): https://saindiamagazine.com/optogenetics-wins-the-nobel-one-neuroscience-breakthrough-in-a-line-of-technological-innovations-helping-scientists-map-and-control-the-brain
44. devdiscourse Nobel feature (Hegemann curiosity, Christmas-decoration fibers): https://www.devdiscourse.com/article/international/3987124-us-and-german-scientists-win-nobel-medicine-prize-for-work-on-light-and-brain

Working notes in `notes/`; no data/ files created.
