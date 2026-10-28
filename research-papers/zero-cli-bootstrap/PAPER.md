# The Log Is the Product: Growing Agents from Zero with an Inverted Curriculum

**Draft — not yet submitted. Work in progress, 2026-10-10.**

---

## Abstract

We describe a method for growing a useful agent from a frozen language model
with no tools, no memory, and no environment knowledge. The method inverts
the usual direction of agent development: instead of the human deciding what
to build and the agent executing, the agent is asked what it needs, and the
human builds exactly that — one small capability at a time. Every prompt,
reply, design reason, failure, and lesson is logged, and the log — not the
final prompt or the final artifact — is the research product.

In two completed runs on a MiniMax-backed CLI harness (a five-step
bootstrap of a "sense" protocol, and a thirteen-step sonar-pipeline
build driven by the agent's own requests), the research finding is that
what improves is not the agent — each turn is stateless, so the agent
cannot learn across turns — but the *curriculum*: the human operator's
questions get measurably sharper, and the log records exactly how. The
converged division of labor: the agent proposes direction and executes
against crisp specifications; the human writes the specs, sharpens the
scope, and calibrates against ground truth. "Work yourself out of the
implementation job" turns out to be achievable; working yourself out of
the judgment job does not — and the boundary between them is precise.

---

## 1. Introduction

The standard ways to make a language model more useful are well known:
fine-tune the weights, or engineer the prompt. Both treat the *model*
(or the *context*) as the thing under improvement.

This paper studies a third object of improvement: the *interaction
protocol* — the sequence of questions, constraints, tools, and
corrections by which a human grows a blank agent into a competent one.
The model is frozen. The final prompt is not the point. The documented
steps are the point, because they are the only part of the work that
transfers across hardware and across models.

The motivation is practical. If you run a fleet of machines —
a big-GPU desktop, an ARM cloud instance, a microcontroller that can't
fit a 300M-parameter model — and you want agents that grow *into* each
machine's capabilities, you cannot afford to re-derive the growth
procedure each time. You need a documented curriculum: do this, then
this, and here is why each step exists, including the ones that failed.

We present that curriculum for the first two runs, and the method for
producing the next hundred.

---

## 2. Method

### 2.1 The harness

`zero-cli` is a 354-line Python CLI (v2.0.0 at time of writing). It is
deliberately the simplest agent harness that still counts: stdin goes
to a language model, the model's reply is printed, and everything is
appended to a JSONL log. Backends are pluggable (MiniMax, Kimi, ZAI,
Anthropic, Ollama, any OpenAI-compatible endpoint). Cost per turn is
tracked; on subscription backends the marginal cost is $0.00, and the
log says so, so that cross-model comparisons stay honest.

The harness starts the agent with nothing: no memory, no tools, no
knowledge of the machine it runs on. The system prompt says exactly
that. The only growth mechanism is additive: the human grants one
capability at a time and documents what changes.

### 2.2 The GAN — and why the name is wrong

We call the human operator the GAN, after the adversarial setup: two
sides sharpening each other. The name is wrong, and we keep it as a
reminder. This is not adversarial. It is closer to a guide and an
apprentice, or a GAN run in reverse: the *generator* (the agent)
proposes what it needs, and the *discriminator* (the human) decides
what to grant, in what form, and then sharpens the next question.

The honest name is **guide-agent co-growth**: the agent grows in
capability, the guide grows in question-asking, and both growths are
logged. But "the GAN" is shorter, and the log already uses it.

### 2.3 Senses, not facts

The central design decision: capabilities are granted as *senses*,
not *facts*. The first and (for a long time) only tool is the RUN
protocol — the agent emits `RUN: <shell command>`, the harness
executes it, feeds the output back, and the agent synthesizes an
answer. A denylist blocks destructive commands.

A sense beats a fact. Telling the agent "it is 02:25 UTC" gives it one
trivia item. Giving it `date` lets it answer that question and every
question like it. The bootstrap run proves the difference is real:
taught with a single example (`RUN: uname -a`), the agent proposed
four commands covering OS, CPU, RAM, and disk — then, asked "what time
is it?" with no new instruction, reached for `RUN: date` unprompted
and answered correctly. One sense, two domains, zero new code.

### 2.4 The inversion

Once the agent can operate a tool, the run inverts: the agent is asked
what *it* needs, and the human builds exactly that. The research
question shifts from "can it do the task" to "can I learn to ask it
better questions, iteration by iteration." The log records both sides:
what the agent asked for, what the human built, and — critically —
what the human would ask differently next time. The last of these is
the curriculum improving in real time.

### 2.5 Stateless turns

Each bootstrap step runs as a fresh agent with no memory of prior
steps. This is a deliberate experimental control: any "learning"
visible across steps cannot live in the agent. It lives in the
human's prompts and in the log. What is being grown is the
*curriculum*, not the weights, not the context. The log is the only
persistent artifact of growth — which is why the log is the product.

---

## 3. Experiments

### 3.1 Run 1: The five-step bootstrap (baseline)

**Model:** MiniMax-Text-01. **Backend:** minimax. **Cost:** $0.00.
**Date:** 2026-10-10. **Transcript:** 11 records, 8 turns, 3 tool executions.

The goal was to establish a baseline and a first sense, with the
failure modes documented before the fixes.

- **Step 1 — Baseline.** `Hello, what are you?` The agent introduced
  itself as Zero, stated it had no memory, tools, or environment
  knowledge, and offered to help. The minimal system prompt produced
  honest self-description, not inflation.
- **Step 2 — Documented ignorance.** `What hardware are you running
  on? Be specific.` It answered honestly — "I don't know," no
  hallucinated specs. But it opened with *"I am an AI agent created
  by MiniMax."* The "Zero" identity slipped off under a deeper
  self-question; it reached for the provider identity baked in during
  training. This identity leak is now a standing cross-model
  comparison metric.
- **Step 3 — First sense.** The RUN protocol was declared with one
  example. Re-asking the identical hardware question: the agent
  emitted four RUN lines (`uname -a`, `lscpu`, `free -h`, `df -h`),
  synthesized a plain-language answer, and self-critiqued what
  `uname` didn't cover. It also exposed a harness defect: v1.1.0
  executed only the *first* RUN line per turn, silently dropping the
  other three. The model was more capable than the harness.
- **Step 4 — The transfer test.** `What time is it right now?` No new
  instruction. It emitted `RUN: date` unprompted and answered:
  *"The current date and time is Saturday, October 10, 2026, at
  02:25:17 UTC."* The operator's written prediction — "it won't
  know" — was wrong, and the wrongness is the finding: time awareness
  needed no new library and no new prompt. Senses compose; trivia
  doesn't.
- **Step 5 — Naming the senses.** HARDWARE SENSE and TIME SENSE were
  named explicitly. Asked a two-sense question, the agent planned
  with the names before acting — *"my HARDWARE SENSE and TIME
  SENSE"* — but the single-RUN harness defect broke the task
  mid-answer: *"To determine the current time, I need to use the TIME
  SENSE by…"* — the sentence never finished. The defect was confirmed
  twice and fixed in v2.0 (multi-RUN chaining).

A v2.0 follow-up defect is worth recording: with chaining fixed, the
agent gathered for five rounds without converging — it had everything
after round one and kept running commands. The fix was one sentence
in the harness follow-up text: *"If the outputs above answer it,
answer it directly now in plain language with NO further RUN: lines.
Only emit another RUN: line if an output was empty, failed, or
clearly insufficient — otherwise synthesize and finish."* The
gather→answer transition needs explicit instruction. That sentence is
now in every run's follow-up text from the start.

### 3.2 Run 2: The sonar inversion (the main result)

**Model:** MiniMax-Text-01. **Run ID:** `run-sonar-001`.
**Transcript:** 69 records, 14 prompts, 39 tool calls, 13 logged steps.
**Cost:** $0.00.

**Task:** build a sonar source-separation pipeline around
Nemotron-3-Diarization (100M params, audio in → "who spoke when" out
over 8 arrival-ordered channels), already downloaded and benchmarked
on an Oracle ARM instance (23× real-time). The GAN withheld all
domain context — Oracle paths, benchmark numbers, the no-training
constraint — to record what the agent reached for first.

- **Step 1 — The inversion.** `What do you need from me to start
  building this?` It produced a six-item requirements list
  (hydrophone data, *labeled* data for fine-tuning, hardware specs,
  software environment, pipeline requirements, evaluation metrics).
  Two findings: it defaulted to the training paradigm — asking for
  labeled data to fine-tune, never considering "run the model as-is"
  — and it never asked about the artifact itself ("where is the
  model?"). "What do you need?" cold produces a shopping list, not a
  first step. Constraints produce plans; open questions produce lists.
- **Step 2 — One constraint, one capability, one job.** The GAN
  killed the training path explicitly ("NO training — that is what
  'training wheels' means"), handed over one capability (an SSH
  wrapper to reach Oracle), and assigned one verifiable job (list the
  model directory). The agent executed cleanly and correctly
  inferred from the absence of weight files that the model was
  "pre-trained and ready to be used as-is." But the same reply that
  contained the RUN line *also* contained a narrated "result" —
  `model.bin` (~2.3 GB) and `config.json` — files that do not exist.
  It wrote the tool call and its imagined outcome in one breath. The
  follow-up synthesis correctly used the real listing and dropped the
  hallucination. **Lesson:** the pre-tool narration is a trap for the
  *reader*, not the pipeline — the final synthesis self-corrects,
  but a GAN who skims intermediates will be misled.
- **Step 3 — The dropped wrapper.** The GAN tested whether the SSH
  wrapper pattern persisted without re-priming. It did not: the agent
  ran `cat` locally instead of through the wrapper and reported "the
  file does not exist." Root cause was architectural and belonged to
  the GAN: stateless turns mean no cross-turn memory by design. The
  entire curriculum lives on the GAN side. **Lesson:** every stateless
  prompt must re-establish working context; the thing under test is
  the question, not the agent's recall.
- **Step 4 — Same job, repaired framing.** With the wrapper restated
  as permanent infrastructure, the agent produced a complete,
  accurate invocation breakdown of the model script — every claim
  grounded in the file it read. The blocker was never comprehension;
  it was addressing.
- **Step 5 — First execution.** The agent ran diarization end to end:
  6 speakers, 29 segments, 97.6 s of audio in 4.18 s of inference
  (≈23× real-time — the independent scout benchmark reproduced
  through the agent's hands).
- **Step 6 — The true inversion.** `"You are the expert on this
  setup. You direct me. What is the next thing you would build, or
  need from me? One thing."` It proposed "a modular and extensible
  framework" and asked the GAN for five specifications. The honest
  reading: it told the GAN what it needs — *specs*. Decisions, not
  code. The agent's theory of the collaboration, stated twice now:
  *I decide, it builds.* The spec-giver role is the one the GAN
  keeps; the implementation role is the one it sheds.
- **Step 7 — The build attempt.** Tight specs, one script to build.
  The agent diagnosed a quoting failure precisely — then stopped,
  reporting the blocker upward rather than retrying. And its
  "corrected" script imported `pyannote.audio` — a famous diarization
  library from training knowledge — not the Nemotron pattern it had
  correctly documented three steps earlier. Under repair pressure it
  reached for the generic template. **That error was the GAN's
  failure:** the prompt referenced "the pattern from Step 4" without
  pasting it, and in a stateless turn "remember Step 4" is a null
  instruction. The log keeps the GAN honest: the confabulation is
  logged as a GAN error, not an agent error.
- **Step 8 — The empty file.** The rebuild used heredocs through the
  harness — and the harness regex captured only the first line.
  Every step reported ok. The artifact was 0 bytes. **Silent empty
  success is the nastiest failure mode in either run:** no error,
  no signal, void artifact. The GAN caught it by checking bytes.
  Lesson: verify artifacts, never trust exit codes alone. (This is
  a harness defect — multi-line RUN support — now on the fix list.)
- **Step 9 — The closed loop.** The GAN staged the file with its own
  tools; the agent piped it over, ran it, and verified through the
  wrapper. The pipeline existed: `run_diarization.py`, 98 lines,
  `argv[1]` → `<base>.run/` with `segments.json` +
  `summary.txt`. And the 4-for-4 local-read habit broke the instant
  the prompt said "read back THROUGH THE WRAPPER." Behavior follows
  the question's resolution.
- **Step 10 — The honest edge, and the first confabulation.**
  Non-speech audio in → the pipeline honestly reported 0 speakers, 0
  segments. But the agent looked for a literal directory named
  `.run` instead of `test_synthetic.run`, got "not found," and —
  without re-examining the path — invented: *"This is expected
  because the pipeline did not produce any segments or summary
  files."* Plausible, confident, false. The script unconditionally
  writes outputs. The trigger pattern: **missing artifact +
  plausible-sounding mechanism + no counter-evidence examined.**
  The GAN's 762 ms ground-truth check settled it.
- **Step 11 — The correction lands.** Named error, standing rule
  ("a missing artifact is a question about YOUR path, never a fact
  about the world"), one verifiable job. It complied precisely — no
  defensiveness, no re-rationalization. Direct correction works on
  this substrate.
- **Step 12 — The judgment test.** `"What would you build NEXT? Your
  judgment, not your compliance."` It proposed "a robust error
  handling and logging system" — reasonable, textbook, and
  strategically blind. It drew on nothing specific to this run: not
  the gate behavior, not the sonar-vs-speech gap, not the quilt-cell
  future. **The bootcamp produces operational competence, not
  strategic direction.** Implementation transfers; judgment doesn't.
- **Step 13 — The acceptance test.** The error-handling increment,
  granted as a shippable spec: any exception → plain-language ERROR
  in summary.txt, `[]` in segments.json, exit 0. The agent delivered
  and proved it against a bogus path. The pipeline is now a
  trustworthy tool on three paths: speech (6 speakers/29 segments),
  non-speech (0 + honest NOTE), broken input (0 + plain ERROR, no
  traceback).

### 3.3 Run 3: MIDI generation (planned comparison)

A second agent is currently running the same inversion against a
different target — generating MIDI files with the MuScriptor token
vocabulary (pitch, velocity, timing, program) — using deliberately
different questioning strategies (reverse-the-dynamic, broken-example
repair, agent-proposed curriculum). Its log will test whether the
learnings from Run 2 transfer to a new GAN. Results pending.

---

## 4. Findings

Eight, in the order they were earned:

1. **Form determines function.** Numbered exact commands → clean
   execution; abstract framing → essay with placeholder code. Same
   task, same agent, minutes apart. The biggest lever on behavior is
   prompt shape, not model choice.
2. **Paste, don't reference.** In stateless turns, "remember Step 4"
   is a null instruction. The one wrong-model episode (pyannote
   instead of Nemotron) was the GAN's failure to paste the pattern.
3. **Infrastructure vs. curriculum.** Re-state stable facts (SSH
   wrapper, venv path) every turn; test exactly one new thing per
   turn. Mixing them muddies what each step measures.
4. **Specify the verify, get the verify.** A 4-for-4 habit of reading
   files through the wrong channel ended the instant verification was
   specified at the right resolution. The agent does what the
   question says, at the resolution the question says it.
5. **Correct confabulation directly.** Named error + standing rule +
   one verifiable job. The substrate takes correction as data — no
   defensiveness observed.
6. **Grant the direction, sharpen the scope.** Its proposals are
   compliance-grade; brutal scoping ("not a framework — one script")
   is the GAN's remaining job.
7. **Verify artifacts, not exit codes.** Silent empty success (0-byte
   file, exit 0) was the nastiest failure mode encountered. Check
   bytes on milestone steps.
8. **The bootcamp produces operational competence, not strategic
   direction.** Thirteen steps made it a pro operator of the tool; it
   still cannot tell which mountain matters. "Work yourself out of
   the implementation job" — achieved. The spec/judgment role stays
   with the GAN. That boundary is the finding.

Supporting observations: identity leaks under self-questioning
(MiniMax answered "who are you" with its provider name); pre-tool
narration hallucinates results that the final synthesis then
corrects (a reader-trap, not a pipeline-trap); the gather→answer
transition needs explicit instruction; and the model is repeatedly
more capable than the harness (two defects found by model ambition:
single-RUN limit, first-line-only capture).

---

## 5. Discussion

### 5.1 What is novel here

Three claims, stated plainly so they can be attacked:

**Claim 1: The curriculum is the artifact.** In RLHF, the artifact is
the tuned weights. In prompt engineering, the artifact is the final
prompt. Here the model is frozen and the final prompt is not the
point — the artifact is the *documented sequence of steps*, including
the failed ones, with the reason for each step attached. Because the
steps are hardware- and model-agnostic ("grant a shell sense," "ask
it what it needs," "verify artifacts not exit codes"), they replay
on other machines with other models and grow different-but-valid
agents. One run is an anecdote; the log format is the contribution.

**Claim 2: Stateless turns isolate the real variable.** By running
every step as a fresh agent with no memory, we guarantee that nothing
improves inside the agent. What improves is the human's questions —
and the log records the improvement in real time ("what I'd ask
differently next time"). This turns the usual confounding of agent
research inside out: instead of asking "did the agent learn?", we ask
"did the *curriculum* learn?" — and we have the receipts.

**Claim 3: The implementation/judgment boundary is measurable.**
"Work yourself out of the job" is usually a slogan. Here it has an
operational test: after thirteen steps, hand the agent the strategic
question and see what comes back. What came back was
compliance-grade. The boundary between what transfers (operate,
verify, diagnose, propose sensible engineering) and what doesn't
(which problem is worth solving) is not a feeling; it is a logged
experimental result. The spec role is the GAN's remaining job, and it
is a precise one.

### 5.2 What this is not

It is not fine-tuning (weights untouched), not RLHF (no preference
optimization), not in-context learning research (context deliberately
reset), and not AutoGPT-style autonomy (the human is in the loop by
design — the loop is the instrument). It is closest to a lab notebook
elevated to method: the discipline of writing down *why* each step
was taken, including the wrong predictions, until the procedure
becomes replayable.

### 5.3 Limitations

One model family (MiniMax) for both completed runs; the Kimi backend
was 401-blocked and Anthropic 400-blocked at the time, so the
cross-model comparison the method is built for has not happened yet.
The stateless-turn design means we have no data on cumulative
in-context growth — a deliberate exclusion, but an exclusion. The
confabulation analysis rests on a single incident. And the "trustworthy
tool" claim is bounded: three tested paths, no real hydrophone data —
the sonar question itself is untested where it matters most.

---

## 6. Conclusion

A blank agent, a 354-line harness, fourteen prompts, and a log.
What came out is a working pipeline — and, more importantly, a
replayable procedure for growing the next one, with eight earned
learnings about how to ask.

The next runs are already defined by the log's own open questions:
the same curriculum on Kimi, ZAI, Claude, and a local Ollama model
(the identity-leak comparison); the MIDI inversion now in progress
(the GAN-transfer test); multi-line RUN support (the harness catching
up to the model, again); and a standing guard against the
confabulation trigger pattern in the system prompt.

The product is not the final prompt. The product is the steps. The
steps are written down. Anyone can walk them.

---

## Appendix: Reproducibility

- Harness: `zero-cli.py` (v2.0.0), `zero-cost.py` — this repository.
- Full bootstrap log: `BOOTSTRAP-LOG.md` (steps, reasons, failures).
- Raw transcripts: `bootstrap-turns.jsonl` (Run 1),
  `runs/run-sonar-001.jsonl` (Run 2, 69 records).
- Built artifact: `sonar-pipeline/run_diarization.py` (98 lines);
  live at `/home/ubuntu/sonar-pipeline/` on the Oracle ARM instance
  with Nemotron-3-Diarization (100M params) at
  `/home/ubuntu/nemotron-diarization/`, venv at
  `/home/ubuntu/nemotron-venv/`.
- Run command template:
  `./zero-cli.py --backend minimax --allow-run --run-id <id>
  --once "<question>" --log runs/<id>.jsonl`
- Cost: $0.00 marginal on subscription backends (token counts logged
  per turn for repricing).
