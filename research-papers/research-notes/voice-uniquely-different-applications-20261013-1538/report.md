# Voice Is Uniquely Different: Applications That Only Exist Because of Voice

## Summary

Voice is not a slower keyboard or a spoken chatbot window. It is a different physical channel: it occupies **time, not space**; it uses the **mouth and ears while hands and eyes do something else**; it **leaks how something was said**, not just what was said; it is **broadcast to a room**, not private to a screen; and it can sit **in the background and interrupt**, rather than demanding to be looked at.

The test used throughout this report:

> **Voice-native test:** If you replaced voice with a text box and lost little or nothing, it does **NOT** count. It counts only if removing voice — its timeliness, hands/eyes-freedom, prosody, shared audibility, or pre-literate access — destroys or badly degrades the application.

That test explains both halves of the evidence. The successes are almost never open-ended conversation: they are voice-directed picking in warehouses, sterile-field queries in operating theatres, readback loops in cockpits, an expediter calling “fire” in a kitchen, a timer shouted from flour-covered hands, an ambient scribe listening while a doctor faces a patient. The failures are almost always the opposite: a general-purpose assistant in a new box — Humane AI Pin, Rabbit R1, voice shopping on Alexa — where a phone screen was faster to browse, compare, correct and trust.

**Confidence:** High on the affordance pattern (convergent HCI, safety and workplace evidence). Medium on specific effect sizes — several are vendor claims, small pilots, or marketing polls, and each is flagged as such below. All sources were read via the web index on 2026-10-13; none were live-browser verified in this run.

---

## Findings — organised by unique affordance

### 1. Voice happens in time, is linear and ephemeral — you cannot skim, scan or re-read it

**Affordance.** Text persists in space: you can defer reading it, skim it, search it, compare two passages side by side. Speech exists only as it unfolds, in order, and then is gone unless recorded. HCI summaries of Pearl (2016) and Rogers et al. note the consequence: spoken feedback is transient and long spoken prompts load working memory and make error recovery harder than a persistent visual cue. A UCL comparison of voice vs. text agents (TOCHI) makes the same point from the other side: a screen prompt can be processed when the user chooses; a voice prompt must be attended to immediately. Research on voice forums for underserved communities likewise notes audio is harder to skim than text, so listeners lose patience with low-ranked posts.

**Evidence / examples.**
- That ephemerality is a *feature* in live coordination and live performance: oral epic singers studied by Parry and Lord in the Balkans could perform works of 12,000+ lines not by rote memorisation but by formulaic improvisation — themes, metre and repeated epithets recombined in the moment (Smithsonian account). The work existed in performance, not as a browsable artefact.
- It is a feature in capture: an ethnographer’s reflexive voice notes, recorded in a car or on a walk straight after fieldwork, on replay returned her to a scene more viscerally than notebook writing, precisely because tone survived and form did not constrain the spill of thought (voice-notes paper via Free Library).

**New kind of application it makes possible.**
- **Capture now, structure later.** Speak a messy, non-linear thought in the moment; let transcription/structuring happen afterwards, elsewhere. A week-long voice-notes test found exactly this split: voice captured more context and more fleeting ideas while walking or pacing, and was good for brainstorming/outlining, but was weak for organisation and sharing until transcripts were edited into text (Android Police). Products in this mould — voice journals, field-memo tools that turn walk-time memos into a journal at home, AudioPen-style voice-to-clean-text — are voice-native at the *input* end and text-native at the *retrieval* end. Neither half alone works.
- **Live, disposable utterances:** brief check-ins, status calls and alerts that are meant to be acted on now and then vanish — not documents to file.

**Anti-pattern:** Speaking a long list, a set of options, a contract, code, or search results aloud. That is a screen task forced into a linear channel. **NOT voice-native.**

### 2. Hands and eyes are busy, the body is moving or must stay sterile — voice steers work *while* it happens

**Affordance.** A screen demands a free hand, visual attention, and usually stopping the primary task. Voice is the only general input/output channel that leaves hands on the work and eyes on the world. This is the affordance with the strongest workplace evidence.

**Evidence / examples.**
- **Warehouse voice-directed picking (Honeywell Vocollect).** Pickers wear a headset, receive spoken prompts, and confirm verbally in real time instead of juggling paper or a handheld scanner. Vendor/integrator sources claim productivity gains around 35%, large error reductions (an integrator cites up to 50%; a product listing cites ~85% accuracy improvement and ~1 million workers) — **treat the percentages as vendor claims, not independent trials** — but the mechanism is undisputed and the system has persisted for decades in an industry that measures picks per hour: hands-free, eyes-up work (MHl News / BEC / DirectIndustry listings).
- **Operating theatres.** Interventional radiologists at UCSF built a Google Home device-sizing application so a physician mid-procedure could ask for a sheath/stent size without breaking sterile scrub — the lead author’s stated reason was that sterility means losing the ability to use a computer (ScienceDaily, Society of Interventional Radiology 2019). Microsoft Research’s touchless neurosurgery work went further: gesture plus enhanced voice control for viewing/manipulating images so a surgeon could use voice only and keep both hands on instruments (Medical Design & Outsourcing).
- **Kitchens.** At New York’s Noodle Bar, as described in reporting on expediters, cooks had no tickets to reference and cooked from the expediter’s spoken cues alone — in the chef’s phrase, cooking blind, on trust (NYT reporting republished in Peoples Daily). See also §5.
- **Cars — the necessary caveat.** Voice does keep hands on the wheel and eyes up, and automakers sold it as safety. AAA Foundation / University of Utah work found hands-free is **not** risk-free: voice infotainment was still cognitively distracting, varying hugely by design — Toyota Entune scored 1.7 on a 5-point cognitive-distraction scale vs. Chevrolet MyLink at 3.7, and a hands-free-modified Siri scored about 4, with simulator rear-endings (AAA newsroom; ScienceDaily). Lesson: voice removes *visual/manual* distraction, not *cognitive* distraction. Complex, error-prone voice tasks while driving fail the test.

**New kind of application it makes possible.**
- **Voice-directed work:** guided, step-by-step spoken workflows — picking, packing, inspection, maintenance, surgical checklists — where the system talks the worker through a physical job and the worker confirms, hands never leaving the job. No screen app can do this without stopping the work.
- **In-the-moment steering:** “fire mains on table four”, “stop”, “next step”, a timer, a measurement read out — micro-commands issued *during* an activity, not a session opened before or after it.

### 3. Speaking is fast, listening is slow — and voice needs no literacy, eyesight or free hand

**Affordance — an asymmetry, not a simple speed win.** A Stanford / University of Washington / Baidu study found speech entry on a phone was 3.0× faster than a miniature keyboard for English (2.8× for Mandarin) with lower error rates (Stanford News; study paper). But output reverses the advantage: commonly cited human-factors figures put silent reading at roughly 250–300 words/min against comfortable listening at roughly 150–160 words/min (textbook summary — approximate, secondary source). **Voice is a high-bandwidth input channel and a low-bandwidth output channel.** Most failed voice products ignore the second half.

Separately, voice is acquired before literacy and survives its absence or loss.

**Evidence / examples.**
- **Pre-literate children.** Lovato & Piper’s HCI review (Frontiers in Psychology, 2019): voice search lets children ask questions of the internet once they can speak clearly, typically ages 3–6, *before* they can read and write. No text interface can serve a 4-year-old question-asker.
- **Low-literacy and basic-phone populations.** Interactive Voice Response (IVR) systems in India and elsewhere were built explicitly because voice overcomes low literacy and runs on ordinary phones: a women’s-rights voice-petition forum in India drew contributors across economic and literacy levels; in Mali, IVR delivered on-demand local-language news and health information and collected feedback; a parliamentary deployment logged over 4,300 audio messages in five months (Springer chapter, *Voice Interfaces for Underserved Communities*).
- **Ageing, eyesight, dexterity, motor disability.** In a University of Nebraska pilot, 16 adults aged 75+ living alone used an Echo heavily (see §6). Cardiff/BPS reporting notes hands-free speakers were seen as more accessible for people with mobility problems that make a mouse or typing hard, including using voice to check a spelling because dictionary print was too small. Apple Voice Control let a wheelchair user and disability advocate control a Mac with spoken commands (“show numbers… 13”) instead of a tongue-operated switch, at finger/mouse precision (Engadget). Google Voice Access offers fine-grained spoken “clicking”, scrolling and text composition aimed at people with Parkinson’s, multiple sclerosis, arthritis or spinal-cord injury — and, tellingly, also at anyone juggling groceries or cooking (Google via HotHardware).

**New kind of application it makes possible.**
- **First access, not alternative access:** question-answering, news, petitions, health and government services for children, low-literacy users, blind/low-vision and motor-impaired users, and anyone on a basic phone — populations for whom a screen is not a worse option but *no* option.
- **Dictation-while-doing:** capture whose value is the 3× input speed *in a moment when typing is impossible*, not dictation as a party trick at a desk.

**Anti-pattern:** Replacing a form, a spreadsheet, code, or a comparison-shopping page with speech. Precise, revisable, comparative input belongs to text — HCI comparisons repeatedly find written input preferred for search/form tasks for learnability and efficiency (summarised in the UCL TOCHI review). **NOT voice-native.**

### 4. Voice carries prosody and the body — tone, hesitation, stress, illness — that text edits out

**Affordance.** The same sentence in text is one thing; spoken, it carries pitch, loudness, tempo, pauses, breathiness, tremor and hesitation. A review in *Humanities and Social Sciences Communications* (Nature Portfolio) identifies pitch, loudness, tempo and voice quality as the main paralinguistic features speakers use to express emotion, with established acoustic correlates (fundamental frequency, energy, duration, harmonics-to-noise). Text transcription systematically destroys this layer — and also destroys hesitation, which is often the most honest part of a rehearsal, an interview or a clinical history.

**Evidence / examples.**
- **Rehearsal that can only be done aloud.** ELSA Speak analyses a learner’s spoken English down to individual sounds, colour-codes each word’s pronunciation, and builds a curriculum from a read-aloud test (Google Play listing; gHacks). You cannot practise pronunciation, accent, presentation delivery or a difficult conversation by typing it. The voice *is* the skill being trained.
- **Voice as a health signal (promising, not settled).** A 2025 *Scientific Reports* study classified Parkinson’s from voice features at ~92% accuracy with a random forest — on a small dataset of 195 recordings, so this is in-study performance, not clinical validation. Reviews list Parkinson’s, Alzheimer’s, depression, respiratory and cardiovascular conditions as studied targets, via changes in articulation, tempo, pitch and tone. Treat voice biomarkers as an emerging screening/monitoring direction with real generalisation problems (recording conditions, accent/language diversity), not a proven diagnostic.
- **Ambient clinical listening exploits this too:** Microsoft’s Dragon Copilot programme has piloted partner tools such as Canary Speech through the clinical conversation itself — i.e. the check-in/conversation becomes the test, with no separate task for patient or clinician (via Nurse.org / Microsoft statements — vendor-reported).

**New kind of application it makes possible.**
- **Rehearsal and coaching loops:** pronunciation, public speaking, sales/bedside manner, language fluency, stammer/therapy practice — speak, get feedback on *how* it sounded, repeat. A text chatbot can comment on a script; it cannot hear the delivery.
- **Passive, consented check-ins:** “how do I sound today?” — longitudinal change in energy, fluency, mood or respiratory state from ordinary speech, for wellbeing or clinical monitoring. This has no text analogue, and it carries the heaviest consent/privacy obligations of any category here (see Principles).
- **Thinking aloud as data:** hesitation, self-correction and emphasis in a voice note tell a future listener (often your future self) what mattered and what was uncertain — information a cleaned-up typed note deletes.

### 5. Voice is social and broadcast — it creates common ground for everyone in earshot

**Affordance.** A screen is addressed to one viewer. A voice is addressed to a room. That is a cost in public (see Failures) and a unique power in a shared physical space: everyone hears the same instruction, at the same moment, and hears everyone else hear it. Communication researchers call this a “party line” in aviation, and it has no private-chat equivalent.

**Evidence / examples.**
- **Aviation radio procedure and the party line.** At non-towered airports pilots self-announce position and intentions on a common frequency (CTAF) with no controller and often no reply — the calls exist so anyone nearby can hear and build a picture (MIT OCW ground school). AOPA training material explicitly teaches listening to *other* aircraft’s calls to build situational awareness. The safety loop on top is standard phraseology plus **readback/hearback**: pilots must repeat back clearances (runway, altitude, heading) so the controller can catch a mishearing — NASA’s ASRS *Directline* documents how non-standard phraseology, casual readbacks and even inflection/cadence changes produced incidents. Voice here is not a command interface; it is a shared, real-time coordination protocol with built-in error correction.
- **Kitchen call-and-response.** The expediter (“expo”) is the single voice coordinating front and back of house: calling orders, firing courses so dishes for one table finish together, announcing “86” (an item is out), “behind”, “corner”. Practitioner descriptions of the “order – fire – pickup” sequence show stations starting, finishing and plating on spoken calls, in time, with hands in food (eGullet practitioner forum — anecdotal, corroborated by the Noodle Bar reporting in §2).
- **Work song — the pre-technological proof.** Sea shanties existed, in the University of Bristol’s account, to synchronise crew effort in hauling and heaving: a shantyman’s call and the crew’s response timed a collective pull that no individual could do alone. Military cadence calls do the same for marching. Rhythm + voice = simultaneous physical action by a group. No screen has ever coordinated a haul.
- **The smart speaker in a family room.** Porcheron et al. (CHI 2018) recorded five households for a month and found Echo use was not a set of private sessions: requests were interwoven with ongoing family talk, notably at mealtimes while parents were cajoling a child to eat (paper via porcheron.uk). A UCL family study found the flip side — families sitting facing Alexa as a unit, whispering among themselves so as not to trigger it, electing one speaker, and jointly singing/dancing with it. Both findings only make sense because the device is *audible and addressable by everyone present*.
- **Push-to-talk dispatch.** Verizon’s Push to Talk Plus is sold on a dispatcher reaching one driver or an entire fleet at the push of a button with ~1-second setup (vendor page); modern successors (Zello, Teams Walkie Talkie) add group channels and replayable voice history for frontline teams (2026 guide). Radio dispatch for taxis, trucking, construction, events and emergency services persists because a shouted, shared, instant channel beats a group chat nobody can read while working.

**New kind of application it makes possible.**
- **A coordinator for a shared physical space:** one audible agent/channel that a household, a kitchen line, a workshop, a care team or a sports team can all hear, interrupt and correct — including bystanders who were never “users”.
- **Floor-controlled team channels:** one-speaker-at-a-time, readback for critical items, everyone overhears everyone — deliberately preserving the party line rather than routing everything into private threads.

### 6. Voice can be peripheral and interruptive — background listening, background speaking, alerts that cut through

**Affordance.** Screens must be attended to; sound can be monitored peripherally while attention is elsewhere, and a spoken alert can demand attention in a way a silent notification cannot. Voice therefore supports two opposite peripheral modes: an ambient presence you barely notice, and an interruption you cannot ignore.

**Evidence / examples.**
- **Cockpit voice warnings (GPWS/EGPWS).** Ground-proximity systems speak imperative, prioritised warnings — modes include excessive descent, terrain closure, “too low”, glideslope and windshear — precisely because a pilot in a high-workload moment may not be looking at the right display (FAA-mode summary via Wikipedia). The design language matters: very short, imperative, repeated, escalating. Nobody designed GPWS as a conversation.
- **The kitchen timer — the killer app nobody planned.** The dominant real uses of home assistants are peripheral and in-the-moment: timers/alarms while cooking, music, weather (see Failures for numbers). This is usually cited as disappointment; read through the affordance lens it is evidence — the uses that survived are the ones where hands were wet/busy, the request was 3 seconds long, and the answer was 3 seconds long.
- **Ambient documentation in the clinic.** Ambient AI scribes (Microsoft Dragon Copilot/DAX, Abridge, Nabla and others) listen to a clinician–patient conversation and draft the note, so the clinician can look at the patient instead of a keyboard. Kaiser Permanente’s programme — via secondary summaries of AMA/NEJM Catalyst reporting — covered about 7,260 physicians and ~2.5 million encounters, estimated ~15,791 documentation hours saved, with 84% of surveyed physicians saying it improved connection with patients. **Balance:** a pragmatic RCT summarised at beri.net found Nabla cut time-in-note by 9.5% vs. control and DAX showed no significant effect, with scribes used in only about a third of visits; a five-centre JAMA study found ~16 minutes saved per 8 hours of care — real, but far from vendor “an hour a day” claims. The *behavioural* change (eye contact, conversation as the record) is the voice-native part; the time saving is modest and uneven.
- **Ambient companionship / check-ins for older adults living alone.** In the Nebraska pilot above, participants averaged 18 Echo interactions a day when asked for at least five, and still 10 a day when use was free; reported loneliness fell modestly (2.22 → 1.99 on a 5-point scale at four weeks) and participants greeted the device, said please, and addressed it as “you” (University of Nebraska; Frontiers in Public Health full paper). Small, short pilot — but the pattern (a voice in the room, available without being operated) is not replicable with an app icon.

**New kind of application it makes possible.**
- **Monitoring and alerting:** a system that listens/speaks only on exception — a fall, a missed medication check-in, a machine anomaly, a child’s room, a lone worker’s missed radio check — with GPWS-style tiers: advisory in background, imperative when urgent.
- **Ambient capture:** documentation, meeting/clinical notes and care logs created *from* a conversation that was happening anyway, instead of a second, screen-based act of recording it.

---

## Where voice-as-chatbot-replacement failed — and what it proves

| Bet | What happened | What it proves |
|---|---|---|
| **General assistants would graduate beyond trivia** | YouGov (US): top uses are weather 59%, music 51%, quick answers 47%, timers/alarms 40%; smart-home control 19%, shopping 14%, third-party actions 9%. Top frustration: not understanding requests (27%). Top reason non-users stay away: no perceived need (42%). Pattern essentially unchanged since ~2018 (YouGov; Sherwood summary). | Users kept the short, busy-hands, short-answer uses and rejected open-ended delegation. Narrowness was not a failure of imagination — it was the affordance speaking. |
| **Voice shopping would monetise Alexa** | Amazon’s devices business lost over $25bn in 2017–2021 (WSJ reporting via Slashdot/Livemint); internal worry, paraphrased in that reporting, was having built an expensive smart timer. The Information reported in 2018 (via TechCrunch) that only ~100,000 of ~50M Alexa users had bought via voice more than once. | Shopping is browsing, comparing, seeing — a persistent visual task. Speaking a checkout into a linear, imageless channel destroys its core value. **NOT voice-native.** |
| **Screenless / phone-replacing AI gadgets (Humane AI Pin $699, Rabbit R1 $199, Limitless pendant)** | Pin launched April 2024, savaged by reviewers (overheating, mishearing, battery), discontinued 28 Feb 2025, assets sold to HP for ~$116m after $230m+ raised (blog summary of reporting). R1 reviewers concluded it did a fraction of what a phone does, worse (Digital Trends). Tony Fadell at MIT Future Fest (via TechCrunch summaries) argued Gen-1 AI gadgets solved no real need and were interesting only to technologists, noting under 0.01% of people have ever had a human assistant to model delegation on. An arXiv study of Pin/R1 adopters found the satisfying uses were curated constellations of narrow tools, not a standalone “second self”. | Removing the screen removed correction, confirmation, browsing and trust — without adding an occupied-hands, shared-space or in-motion job. A chatbot but spoken, in a worse box. |
| **Hands-free = safe in cars** | AAA/Utah: voice systems still produced high cognitive distraction; worst systems worse than a phone conversation (see §2). | Voice frees hands/eyes, not mind. Long or error-prone voice tasks belong nowhere near a primary task. |
| **People want to talk to AI in public / at work** | PYMNTS Intelligence 2025: voice was the least-preferred way to use generative AI in every age group, with under 20% calling it easiest; barriers included discomfort speaking to machines in public/professional settings, privacy, and accent accuracy. | Voice is broadcast (§5). In shared/public space that is a social cost — embarrassment, leakage, disturbing others — that text does not impose. Voice-native design must choose its rooms. |

**Net lesson:** every failure tried to make voice a *general replacement* for a screen. Every durable success gave voice a *specific job a screen cannot do at that moment* — because hands, eyes, literacy, sterility, simultaneity, or the need to be heard by a whole room ruled the screen out.

---

## Design principles for a voice-native application layer

1. **Start from the occupied body, not the empty desk.** Ask first: what are the user’s hands, eyes and feet doing? If the honest answer is “nothing, they’re sitting at a screen”, stop — build the screen version.
2. **Exploit the asymmetry: long in, short out.** Let users speak at length (capture, dictate, narrate, check in); reply in seconds. Never speak a list, a table or a document. If the answer is long, send it to a screen/transcript and say only the headline.
3. **Capture in voice, organise in text.** Voice is for the moment of thought; text is for storage, search, sharing and correction. Build the handoff (transcript, summary, to-dos) as a first-class step, not an afterthought — and preserve the audio where tone matters.
4. **Borrow aviation’s error loop.** Standard, constrained phrasing for critical actions; mandatory readback/confirmation for anything irreversible; a one-word “unable / standby / say again” that is a complete, respectable answer. Open-ended chat is the wrong model for consequential voice.
5. **Design for the room, not the user.** Who else can hear this? Who else may speak? Give groups floor control, an elected speaker, a mute everyone trusts, and party-line overhearing where shared awareness is the point (kitchens, workshops, care teams, family kitchens).
6. **Be peripheral by default, focal by exception.** Ambient listening/check-ins in the background; spoken output reserved for what is timely or urgent, in GPWS tiers — silent, advisory, imperative. An always-talking system trains people to ignore it.
7. **Treat prosody as signal — with explicit consent.** How something is said (energy, fluency, stress, change from baseline) can power rehearsal feedback and wellbeing check-ins that text cannot. It is also biometric-adjacent health data: opt-in, on-device where possible, deletable, never a hidden by-product of a “chat”.
8. **Ephemeral by default, recorded by exception.** Honour voice’s natural vanishing: live coordination and check-ins should not silently become a permanent archive. State plainly when recording starts, who can replay it (Zello-style replay is a *choice*, not a default), and when it is deleted.
9. **Rehearse, don’t just command.** Some of the strongest voice-native categories are practice loops — pronunciation, presentations, difficult conversations, clinical or safety drills — where speaking *is* the skill. Build listen → attempt → specific feedback → repeat, not question → answer.
10. **Know the rooms where voice loses — and leave.** Public, quiet, shared, sensitive, comparative, long-form, precise: in those contexts voice leaks, embarrasses, or underperforms text (PYMNTS; voice-shopping evidence). A voice-native layer that gracefully hands off to text in those moments will be trusted in the moments where only voice works.

**Flagged as NOT counting (chatbot-but-spoken):** general Q&A voice mode at a desk; voice shopping/checkout; voice email/social posting while driving; a wearable whose pitch is “your phone, but you talk to it”; speaking long-form reading material aloud as the primary interface; voice as a skin over a form.

---

## Could not verify / open questions

- Effect sizes for warehouse picking, voice biomarkers and ambient-scribe time savings rest on vendor claims, small datasets, or secondary summaries of trials — directions are convergent, magnitudes are not independently verified here.
- WhatsApp voice-note scale figures (9.4bn/day; Brazilians sending 4× any other country; ~150 hrs/year) come from a Heineken/Meta/Statista marketing release and poll — used only to illustrate that asynchronous voice messaging is a mass cultural practice in some regions (sender-cheap, listener-expensive — consistent with §1/§3), not as audited statistics.
- Kitchen “order–fire–pickup” detail is partly practitioner-forum anecdote, corroborated in mechanism by mainstream reporting on expediters.
- No live-browser verification was performed in this run; all sources are web-index reads from 2026-10-13. Several primary papers (Porcheron CHI 2018; UCL TOCHI; Springer chapter) were read via their indexed PDFs/summaries.
- The mission did not specify a target user, market or product for the design principles, so §Principles is intentionally application-layer-general rather than tailored to a persona.

## Sources

All read 2026-10-13 via web index. Paraphrased in this report; no source is quoted at length.

- Stanford study — speech 3× faster than typing: https://news.stanford.edu/stories/2016/08/stanford-study-speech-recognition-faster-texting and paper https://hci.stanford.edu/research/speech/paper/speech_paper.pdf
- Reading vs listening speeds (secondary/textbook summary): https://easyexamnotes.com/explain-human-interaction-speed/?generate_pdf=35597
- UCL, *It's Good to Talk* — voice vs text agents, multi-user: https://discovery.ucl.ac.uk/id/eprint/10144587/1/Good-to-Talk-TOCHI-Second-Revision.pdf
- Voice interfaces for underserved communities / IVR (Springer): https://link.springer.com/chapter/10.1007/978-3-030-86065-3_22 and PDF http://aghaaliraza.com/publications/2021--DevEnggBook--Voice_Interfaces_for_Underserved_Communities.pdf
- Honeywell Vocollect voice picking: https://www.mhlnews.com/new-products/article/22055316/voice-picking-for-android-users ; https://www.becsi.co.uk/bec-achieves-platinum-partner-status-honeywell-vocollect/ ; https://www.directindustry.com/prod/intelligrated/product-56864-1971435.html
- UCSF smart speaker in interventional radiology: https://www.sciencedaily.com/releases/2019/03/190324090526.htm
- Touchless / voice control in neurosurgery: https://www.medicaldesignandoutsourcing.com/a-new-use-for-touchless-technology-in-the-operating-theater/
- AAA / University of Utah voice distraction: http://newsroom.aaa.com/2014/10/imperfect-hands-free-systems-causing-potentially-unsafe-driver-distractions/ ; https://www.sciencedaily.com/releases/2014/10/141007091659.htm
- Emotional prosody review (Nature Portfolio): https://www.nature.com/articles/s41599-020-0499-z
- Parkinson's voice biomarkers (Scientific Reports 2025): https://www.nature.com/articles/s41598-025-96950-3.pdf
- Children and voice search (Lovato & Piper, Frontiers): https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.00008
- Older adults, Echo and loneliness: https://news.unl.edu/article/hey-alexa-voice-assistants-may-curb-loneliness-in-older-adults-who-live ; https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2021.750736 ; https://www.bps.org.uk/news/smart-technology-could-help-tackle-digital-isolation-and-boost-wellbeing-older-adults
- Motor accessibility — Apple Voice Control / Google Voice Access: https://www.engadget.com/2019/06/19/apple-voice-control-disability-accessibility/ ; https://hothardware.com/news/google-voice-access-enables-hands-free-control-android-devices
- Aviation phraseology / readback-hearback (NASA ASRS): https://asrs.arc.nasa.gov/publications/directline/dl7_say.htm ; AOPA situational awareness curriculum: http://aopa.org/-/media/Files/You-Can-Fly/High-School-Curriculum/11th-grade/TheFlyingEnvironment_3_A_7_PilotCommunicationsAirportEnvironment_TeacherNotes1.PDF ; CTAF (MIT OCW): https://live.ocw.mit.edu/courses/16-687-private-pilot-ground-school-january-iap-2019/247672a4af8522b03a278a0daaa9998e_alLh1Jdqwvg.pdf
- Kitchen expediter: https://peoplesdailyng.com/the-quarterback-of-the-kitchen-its-not-always-the-chef/ ; order–fire–pickup (practitioner forum): https://forums.egullet.org/topic/112621-can-you-explain-fire-sequence-to-me/
- Sea shanties as synchronised work (Bristol): https://artsmatter.blogs.bristol.ac.uk/2022/08/02/sea-shanties/
- GPWS modes / aural warnings: http://en.wikipedia.org/wiki/Ground_proximity_warning_system
- Push-to-talk dispatch: https://www.verizon.com/business/resources/articles/push-to-talk-plus-phones-and-technology/ ; https://pctechmag.com/2026/08/push-to-talk-apps-for-android-and-ios-2026-guide/
- Ambient AI scribes — scale and RCT/JAMA balance: https://bushe.co/blog/what-is-an-ai-scribe/ ; https://www.beri.net/article/best-ambient-ai-scribes-health-systems-abridge-epic-ai-charting-dragon-copilot
- Porcheron et al. CHI 2018, voice in the home: https://www.porcheron.uk/assets/pubs/2018/porcheron2018voice.pdf ; families and Alexa (UCL): https://discovery.ucl.ac.uk/id/eprint/10084820/1/Using Voice Assistant skills in Fam life_Beirl, Rogers, Yuill.pdf
- Assistant usage — YouGov: https://yougov.com/en-us/articles/52780-americans-use-digital-assistants-mainly-for-weather-music-and-timers ; https://sherwood.news/tech/people-use-google-amazon-and-apples-smart-assistants-for-weather-timers-and/?ref=platformer.news
- Alexa losses / voice shopping: https://slashdot.org/story/24/07/23/1444258/alexa-is-in-millions-of-households---and-amazon-is-losing-billions?sdsrc=prev ; http://adam.curry.com/art/1533613263_W35RmtxC.html
- First-wave AI gadgets / Fadell: https://www.bleuken.com/tony-fadell-is-right-the-first-wave-of-ai-gadgets-failed-because-they-solved-nothing/ ; https://www.digitaltrends.com/phones/rabbit-r1-review/ ; adopter study https://arxiv.org/pdf/2506.09220
- Voice least preferred for genAI (PYMNTS 2025): https://www.pymnts.com/news/artificial-intelligence/2025/nobodys-talking-voice-interfaces-face-hurdles-for-wide-adoption/
- WhatsApp voice-note culture (marketing release — flagged): https://www.globenewswire.com/news-release/2025/12/10/3203269/0/en/Heineken-Launches-New-WhatsApp-Technology-That-Swaps-Voice-Notes-for-Real-Life-Conversations-Over-a-Beer.html
- ELSA Speak pronunciation feedback: https://play.google.com/store/apps/details?id=us.nobarriers.elsa&gl=BR ; https://www.ghacks.net/2017/08/11/improve-your-english-pronunciation-with-elsa-speak-for-android/
- Voice notes / thinking aloud: https://www.androidpolice.com/recorded-ideas-as-voice-notes-for-week/ ; https://www.thefreelibrary.com/%22Speaking+back%22+to+the+self%3A+a+call+for+%22voice+notes%22+as+reflexive...-a0491909264
- Oral epic improvisation (Smithsonian): https://Www.Smithsonianmag.Com/history/was-there-ever-an-original-version-of-the-odyssey-and-do-we-need-to-worry-about-what-homer-would-think-180989143/
