# POLLN User Guide

## Welcome to Understandable AI

You're not an AI developer. You're a spreadsheet user, a business analyst, a researcher, a knowledge worker who wants AI to work for you—not replace you.

**POLLN** is your colony of tiny assistants. They watch you work, learn your patterns, and become smarter together. And here's the best part: **you can inspect every single one of them.**

No black boxes. No mysterious "AI decided this." Just a transparent hive of helpers that you understand, control, and trust.

---

## What Makes POLLN Different?

### The Problem with Most AI

You've probably tried AI tools that:
- Give you different answers every time you ask the same question
- Can't explain why they made a decision
- Learn in ways you can't see or understand
- Feel like a black box you just have to "trust"

### The POLLN Difference

**POLLN is "self-deconstructing"**—and that's a good thing!

Instead of one giant, mysterious AI brain, POLLN gives you:
- **Hundreds of tiny agents** (we call them "bees"), each doing one simple thing
- **Transparent learning**—watch every agent get smarter
- **Inspectable decisions**—see exactly why something happened
- **Your patterns, preserved**—agents learn YOUR workflow, not some generic "best practice"

Think of it like this:

```
Traditional AI: One giant brain you can't inspect
     │
     └── "I don't know why I did that. I just did."

POLLN: Hundreds of tiny helpers you can watch
     │
     ├── Agent 42: "I summarized because Agent 15 said it was important"
     ├── Agent 15: "I flagged it because it mentions Q4 sales"
     └── Agent 8: "I noticed Q4 mentions are 3x more common this month"
```

---

## Quick Start: Your First Agent in 5 Minutes

### Step 1: Install POLLN

```bash
npm install -g polln
```

### Step 2: Create Your Colony

A "colony" is your workspace—where your agents live and work.

```bash
polln init --name "My First Colony"
```

This creates:
- `.pollnrc` - Your colony's configuration (editable text file)
- `.polln/` - Where your agents live and learn

### Step 3: Create Your First Agent

Let's create a simple agent that summarizes text:

```bash
polln agents spawn task --category "summarizer"
```

You'll see output like:
```
✓ Created agent: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Type: TASK
  Category: summarizer
  Status: ACTIVE
```

### Step 4: Watch It Work

Now give your agent something to do:

```javascript
import { Colony } from 'polln';

const colony = new Colony({
  id: 'my-colony',
  name: 'My First Colony',
  gardenerId: 'you',
  maxAgents: 100,
  resourceBudget: {
    totalCompute: 1000,
    totalMemory: 500,
    totalNetwork: 100
  }
});

// Your agent will process this
const result = await colony.process('summarizer', {
  text: "POLLN is a distributed AI system where simple agents produce intelligent behavior through emergent coordination."
});

console.log(result);
// Output: "POLLN: Simple agents coordinate to create intelligent behavior."
```

### Step 5: Inspect What Happened

This is where POLLN shines—you can see exactly what happened:

```bash
polln agents inspect a1b2c3d4
```

Output:
```
Agent: a1b2c3d4 (Summarizer)
─────────────────────────────────
Status: ACTIVE
Created: 2 minutes ago
Last Activity: Just now

Performance:
  Success Rate: 100%
  Total Executions: 1
  Avg Latency: 45ms

Learning:
  Value Function: 0.55 (improving!)
  Successes: 1
  Failures: 0
```

---

## Understanding Your Colony: The 5 Key Terms

### 1. Pollen (Knowledge Grains)

**What it is:** Tiny packets of learned behavior

**Think of it like:** A recipe card that says "when you see X, do Y"

**Example:**
```
Pollen Grain #4721:
  Pattern: "Text starts with 'Q4 Sales'"
  Action: "Flag for finance team"
  Success Rate: 94%
  Last Used: 5 minutes ago
```

**Why it matters:** Pollen grains are how your agents remember what works. You can inspect them, edit them, and share them.

### 2. Bees (Agents)

**What it is:** Individual workers in your colony

**Think of it like:** A specialist on your team—one person who's really good at one thing

**Example:**
```
Agent #42 (Data Validator):
  Specialty: Checking spreadsheet formulas
  Success Rate: 89%
  Typical Task: "Validate this budget spreadsheet"
  Learning: "Now catches circular references 3x faster"
```

**Why it matters:** Instead of one AI that tries to do everything, you have specialists. Each agent is simple, inspectable, and accountable.

### 3. Models (Agent Brains)

**What it is:** The decision-making logic inside each agent

**Think of it like:** An employee's training and experience

**Example:**
```
Model: summarizer-v2.1
  Training: Your last 50 documents
  Best At: Executive summaries, meeting notes
  Weakness: Technical documentation
  Last Updated: Today at 9:42 AM
```

**Why it matters:** You can see what each agent has learned and how they make decisions.

### 4. Bots (Running Agents)

**What it is:** An agent that's currently working

**Think of it like:** An employee who's "on the clock" and processing tasks

**Example:**
```
Active Bot: Agent #47
  Current Task: "Summarize Q4 report"
  Started: 30 seconds ago
  Progress: "Reading document..."
```

**Why it matters:** You can watch your agents work in real-time and see exactly what they're doing.

### 5. Hive (Your Colony)

**What it is:** All your agents, their connections, and shared knowledge

**Think of it like:** Your entire department, working together

**Example:**
```
Hive: "Marketing Analytics Colony"
  Total Agents: 47
  Active Now: 12
  Shared Pollen: 1,247 grains
  Learning Rate: "Improving daily"
```

**Why it matters:** The hive is where the magic happens—agents learn from each other and build on each other's successes.

---

## Why "Self-Deconstructing" is a GOOD Thing

### The Scary Part of Traditional AI

When someone says "our AI learned to recognize faces," what does that mean?

- What patterns is it looking for?
- What mistakes does it make?
- Can it explain its decisions?

Usually: **Nobody knows.** It's a black box.

### The POLLN Advantage

POLLN "self-deconstructs" by breaking everything down into inspectable pieces:

```
Complex Task: "Analyze sales trends"
│
├── Break it down:
│   ├── Agent A: Extract sales numbers
│   ├── Agent B: Calculate growth rates
│   ├── Agent C: Detect seasonal patterns
│   └── Agent D: Generate summary
│
└── Each step is:
    ├── Visible (you can see it)
    ├── Inspectable (you can check its work)
    ├── Editable (you can fix mistakes)
    └── Explainable (it can tell you why)
```

### Real Example: Sales Trend Analysis

**Traditional AI:**
```
Input: "Analyze Q4 sales"
Output: "Sales are up 15%"
You: "Why?"
AI: "I don't know. I just am."
```

**POLLN:**
```
Input: "Analyze Q4 sales"

Agent Journey (visible in real-time):
  1. Agent #12 (Data Extractor): "Found 347 sales records"
  2. Agent #23 (Calculator): "Total: $1.2M, up from $1.04M"
  3. Agent #45 (Pattern Detector): "November spike: Black Friday"
  4. Agent #8 (Summarizer): "Q4 sales up 15%, driven by holiday season"

You: "Show me the pattern detection"
Agent #45: "Here's exactly what I found:
  - Week 1: Normal
  - Week 2: Black Friday (+40%)
  - Week 3: Holiday shopping (+25%)
  - Week 4: Post-holiday dip (-10%)

  I flagged 'holiday season' because:
    - Pattern matched 2023 data (89% similar)
    - Keyword analysis found 'gift', 'holiday', 'sale'
    - Prior years show same pattern"
```

See the difference? **Every step is visible, explainable, and verifiable.**

---

## Watching Your Agents Learn

### The Learning Process (In Plain English)

Your agents get smarter through three simple steps:

#### 1. Try Something
When an agent encounters a task, it tries a solution based on what it knows.

```
Agent #8 encounters: "Summarize this research paper"
Tries: Creates detailed, technical summary
```

#### 2. Get Feedback
You (or automatic metrics) tell it how well it did.

```
You say: "Too detailed! Make it simpler."
Feedback: Negative
```

#### 3. Adjust
The agent updates its approach.

```
Agent #8 updates:
  "For research papers, use simpler language"
  "Focus on key findings, not methodology"
```

### Real-Time Learning Dashboard

```bash
polln agents inspect a1b2c3d4 --watch
```

You'll see learning happen in real-time:

```
Agent #8 (Summarizer) - Live Learning
═══════════════════════════════════════
Time    | Task              | Result | Learning
────────┼───────────────────┼────────┼─────────────────
10:42   | Summarize doc     | ✓      | "Shorter is better"
10:44   | Summarize doc     | ✓      | "Use bullet points"
10:46   | Summarize doc     | ✗      | "Avoid jargon"
10:48   | Summarize doc     | ✓      | Success rate: 75%

Current Wisdom:
  • Keep summaries under 3 sentences
  • Use bullet points for lists
  • Avoid technical jargon
  • Focus on actionable insights
```

### Overnight Dreams (While You Sleep)

POLLN has a cool feature: **your agents dream**.

Every night (or whenever you schedule it), your agents:
1. Review what they learned that day
2. Try new variations (what if I did X instead of Y?)
3. Test variations against past tasks
4. Keep the improvements, discard the failures

```bash
# Trigger a dream cycle
polln dream --episodes 20
```

Output:
```
🌙 Dream Cycle Started
═══════════════════════════════════════

Episode 1/20:
  Testing: "What if I check for duplicates first?"
  Result: 12% faster! Keeping this change.

Episode 2/20:
  Testing: "What if I ignore emails under 50 words?"
  Result: 5% miss important stuff. Discarding.

Episode 3/20:
  Testing: "What if I prioritize messages with 'urgent'?"
  Result: 8% better response time. Keeping!

... (17 more episodes) ...

Dream Cycle Complete:
  Improvements Found: 7
  Applied: 5
  Discarded: 2
  Colony Wisdom: +15%
```

**The best part:** You wake up to smarter agents. They literally practice while you sleep.

---

## What "Inspectable" Means in Practice

### Three Levels of Inspection

#### Level 1: What Did It Do?
See the agent's actions and results.

```bash
polln agents inspect a1b2c3d4
```

```
Agent Activity Log:
  10:42 AM - Summarized "Q4 Report" (success)
  10:44 AM - Summarized "Meeting Notes" (success)
  10:46 AM - Summarized "Research Paper" (failed - too long)
  10:48 AM - Summarized "Email Thread" (success)
```

#### Level 2: How Did It Decide?
See the decision-making process.

```javascript
const explanation = await agent.explainLastDecision();

console.log(explanation);
```

```
Decision Explanation:
  Task: Summarize "Q4 Report"

  Steps Taken:
    1. Analyzed document type → "Business Report"
    2. Checked prior success → "Have 12 similar examples"
    3. Selected template → "Executive Summary v3.2"
    4. Applied template → Generated summary
    5. Validated result → Length OK, clarity OK

  Why This Template?
    Success Rate: 94% on business reports
    Last Used: 2 hours ago (successful)
    User Feedback: "Perfect length" (avg rating 4.7/5)
```

#### Level 3: What Did It Learn?
See the agent's accumulated knowledge.

```bash
polln agents inspect a1b2c3d4 --knowledge
```

```
Agent Knowledge Base:
  📚 127 Patterns Learned

  Top Patterns:
    1. "Q4 Reports → Executive Summary" (94% success)
    2. "Meeting Notes → Bullet Points" (89% success)
    3. "Research Papers → Technical Summary" (76% success)
    4. "Email Threads → Action Items" (91% success)
    5. "Spreadsheets → Key Metrics" (85% success)

  Failed Patterns (Learning from mistakes):
    • "Legal Documents → Simple Summary" (31% success - ABANDONED)
    • "Code Reviews → One-Liner" (22% success - ABANDONED)
```

---

## Common Use Cases

### Use Case 1: Sales Trend Analysis

**Problem:** You need to analyze sales data every week, but it's tedious and error-prone.

**POLLN Solution:**

```bash
# Create agents for the task
polln agents spawn task --category "data-extractor"
polln agents spawn task --category "trend-analyzer"
polln agents spawn role --category "report-generator"

# Let them work together
polln dream --episodes 10  # Learn your data patterns
```

**What happens:**
1. Data Extractor pulls numbers from spreadsheets
2. Trend Analyzer calculates growth, seasonality, anomalies
3. Report Generator creates a summary in YOUR format

**Inspection:**
```bash
polln agents inspect <report-generator-id> --knowledge
```

```
I've learned:
  • You prefer bullet points over paragraphs
  • You want "vs last year" comparisons
  • You care about Q4 more than other quarters
  • You flag anything over 20% growth as "significant"
```

### Use Case 2: Automated Report Generation

**Problem:** Monthly reports take hours to compile.

**POLLN Solution:**

```bash
polln agents spawn role --category "report-builder"
polln agents spawn task --category "data-collector"
polln agents spawn task --category "chart-generator"
```

**Learning Process:**
1. First month: Agents try different approaches
2. You provide feedback: "Too long," "Wrong charts," etc.
3. Agents adjust and remember
4. Second month: Much better
5. Third month: Perfect (they learned your preferences)

### Use Case 3: Data Validation

**Problem:** Spreadsheets have errors that slip through.

**POLLN Solution:**

```bash
polln agents spawn core --category "validator"
```

**What it learns:**
- Your common error patterns
- Validation rules you always use
- Thresholds and limits you care about

**Result:**
```
Validator Agent Report:
  Checked: 1,247 cells
  Found Issues:
    • 3 circular references (fixed)
    • 12 formula errors (flagged)
    • 5 duplicates (highlighted)
  Time Saved: ~2 hours
```

### Use Case 4: Forecasting

**Problem:** Predicting next quarter's sales is guesswork.

**POLLN Solution:**

```bash
polln agents spawn role --category "forecaster"
```

**Learning Process:**
1. Agent analyzes your historical data
2. Identifies patterns (seasonality, trends, events)
3. Tests predictions against past data
4. Refines models based on accuracy

**Output:**
```
Q1 Forecast:
  Predicted: $1.5M ± 10%
  Confidence: 78%
  Based On:
    • 3-year historical trend
    • Seasonal pattern (Q1 typically +5%)
    • Market conditions (similar to 2024)
    • Product pipeline (2 new launches)
```

### Use Case 5: Custom Workflows

**Problem:** Your workflow is unique—off-the-shelf tools don't fit.

**POLLN Solution:**

```bash
# Create agents for each step
polln agents spawn task --category "step-1-processor"
polln agents spawn task --category "step-2-validator"
polln agents spawn role --category "step-3-approver"
polln agents spawn core --category "step-4-archiver"
```

**What happens:**
- Agents learn YOUR workflow
- They adapt to YOUR quirks
- They improve over time
- Everything is visible and editable

---

## FAQ: The "Scary AI" Questions

### "Will this replace my job?"

**Short answer:** No.

**Long answer:** POLLN is designed to AUGMENT you, not replace you. Here's why:

1. **You're always in control:** Agents make proposals, YOU decide.
2. **You teach them:** They learn YOUR workflow, not some generic process.
3. **You inspect everything:** Nothing happens in a black box.
4. **You can override:**任何时候, you can say "no, do it this way instead."

**Think of it like:** You're the manager, POLLN agents are your team. They help you work faster, but you're still the boss.

### "Is my data safe?"

**Short answer:** Yes, and here's how:

**Privacy Features:**
1. **Local-first:** Your colony runs on YOUR machine by default
2. **Federated learning:** If agents share patterns, they're anonymized first
3. **Differential privacy:** Mathematical guarantees that individual data can't be extracted
4. **Access controls:** You decide what can be shared and what stays private

**From the docs:**
```
Privacy Level: PRIVATE
  • Never leaves your machine
  • Never shared with federation
  • Never used in other colonies

Privacy Level: COLONY
  • Shared within your colony only
  • Anonymized before sharing
  • Mathematical privacy guarantees

Privacy Level: PUBLIC
  • Can be shared in meadow
  • Strict privacy filters applied
  • You must explicitly opt-in
```

### "Can I trust what it tells me?"

**Short answer:** You don't have to trust— VERIFY.

**The POLLN difference:**
```
Traditional AI: "Trust me, I'm right"
POLLN: "Here's exactly how I got this answer"
```

**Every output includes:**
- Which agents worked on it
- What steps they took
- What patterns they used
- How confident they are
- Past success rates

**You can always:**
1. Review the decision chain
2. Check the supporting evidence
3. Verify against your own knowledge
4. Override if you disagree

### "What if it makes a mistake?"

**Short answer:** It learns from mistakes, just like you do.

**How POLLN handles mistakes:**
1. **Immediate feedback:** You mark something as wrong
2. **Learning update:** Agent adjusts its approach
3. **Pattern update:** It won't make the same mistake twice
4. **Verification:** Future attempts are checked against this learning

**Example:**
```
Agent marks legitimate email as "spam".
You click: "Not spam"
Agent learns:
  "This sender is safe"
  "This pattern is not spam"
  Success rate drops → Learning updated
```

### "How do I know WHY it did that?"

**Short answer:** Just ask.

**Built-in explanations:**
```javascript
const result = await agent.process(task);
const explanation = await agent.explain(result);

console.log(explanation);
```

**Output:**
```
I summarized this way because:
  1. Document type: Business Report
  2. Past success: 94% with this format
  3. User preference: You rated similar summaries 4.8/5
  4. Pattern match: Follows your preferred structure

I avoided:
  • Technical details (you rarely read them)
  • Long paragraphs (you prefer bullets)
  • Raw data (you want interpretations)
```

---

## Advanced Concepts (Optional Reading)

### Subsumption Architecture: Why SAFETY Always Wins

POLLN uses a "layered" decision system:

```
┌─────────────────────────────┐
│ SAFETY (instant, critical)  │ ← Always wins
├─────────────────────────────┤
│ REFLEX (fast, automatic)    │
├─────────────────────────────┤
│ HABITUAL (medium, learned)  │
├─────────────────────────────┤
│ DELIBERATE (slow, thinking) │
└─────────────────────────────┘
```

**What this means:**
- If something is unsafe, SAFETY layer blocks it instantly
- Fast, automatic responses happen when appropriate
- Learned routines handle common tasks
- Slow, deliberate thinking for complex problems

**Example:**
```
Agent is about to delete a file.

SAFETY layer: "Wait! This is important."
  → Blocks deletion
  → Prompts for confirmation
  → Overrides all other layers
```

### Plinko Selection: Why Probabilistic = Durable

Traditional AI: "Always choose the best option"
POLLN: "Choose probabilistically from good options"

**Why?**
- "Best" today might not be best tomorrow
- Maintains diversity = more resilient
- Discovers better options through exploration

**Example:**
```
Task: "Summarize document"

Options:
  Option A: 90% success rate (tried 100 times)
  Option B: 85% success rate (tried 20 times)
  Option C: 70% success rate (tried 5 times)

Traditional AI: Always choose A
POLLN: Mostly A, sometimes B, occasionally C

Result:
  - Sometimes B is actually better (new context)
  - Sometimes C improves with practice
  - System adapts when conditions change
```

### Dreaming: Overnight Optimization

While you sleep, your agents:
1. Review the day's experiences
2. Simulate variations ("what if I tried X?")
3. Test against historical data
4. Keep improvements, discard failures

**Result:** You wake up to smarter agents.

### Federation: Learning from Other Colonies

POLLN colonies can share patterns with each other (federated learning):

```
Your Colony:
  - Learned: "Q4 reports need executive summaries"
  - Shares: Pattern (anonymized)

Other Colony:
  - Receives: Pattern
  - Tests: "Does this work for us?"
  - Keeps: If helpful
  - Shares back: Improvements
```

**Privacy guarantee:** Patterns are anonymized before sharing. Individual data never leaves your colony.

---

## Glossary: POLLN → Plain English

| POLLN Term | Plain English | Spreadsheet Equivalent |
|------------|---------------|----------------------|
| **Pollen Grain** | A learned pattern | A macro or formula template |
| **Bee / Agent** | A specialized assistant | Someone on your team |
| **Model** | An agent's "brain" | An employee's training |
| **Bot** | An agent that's working | Someone "on the clock" |
| **Hive / Colony** | All your agents together | Your whole department |
| **Foraging** | Looking for tasks to do | Checking the to-do list |
| **Nectar** | Successful outcome | Getting the right answer |
| **Swarm** | Many agents working together | Team collaboration |
| **Pheromone Trail** | "This way worked before" | Following a proven process |
| **Meadow** | Community marketplace | Sharing templates with others |
| **Dreaming** | Overnight practice | Reviewing and improving at night |
| **Plinko** | Probabilistic selection | Picking from good options randomly |
| **Subsumption** | Layered decision-making | Safety checks override everything |
| **A2A Package** | Message between agents | Email between coworkers |
| **Causal Chain** | Decision history | Thread of emails showing "why" |
| **Value Function** | Success tracker | Win/loss record |
| **Hebbian Learning** | "What works together gets wired together" | Processes that work well get reused |
| **META Tile** | Adaptive agent that specializes based on needs | Cross-functional team member |

---

## "When We Say X, We Mean Y"

| When we say... | We mean... |
|----------------|-----------|
| "Your colony is dreaming" | Your agents are practicing and improving |
| "Spreading pollen" | Sharing successful patterns |
| "Foraging for nectar" | Looking for tasks to complete |
| "Following pheromone trails" | Reusing proven approaches |
| "The hive is learning" | Your agents are getting smarter together |
| "Agents are swarming" | Multiple agents are collaborating |
| "This agent is awake" | This agent is ready to work |
| "Hibernating" | Temporarily inactive (saving resources) |
| "Dormant" | Not currently needed, but available |
| "Succession" | Passing knowledge to a new agent |
| "Grafting" | Creating new connections between agents |
| "Pruning" | Removing unused agents or connections |

---

## Getting Help

### Documentation
- **Technical docs:** `docs/ARCHITECTURE.md`
- **CLI reference:** `docs/CLI_GUIDE.md`
- **Research:** `docs/research/`

### Community
- **GitHub:** https://github.com/SuperInstance/polln
- **Issues:** https://github.com/SuperInstance/polln/issues
- **Discussions:** https://github.com/SuperInstance/polln/discussions

### Learning Path
1. **Start here:** Read this guide
2. **Try examples:** Check `examples/` directory
3. **Build something:** Create your first colony
4. **Inspect everything:** Use `polln agents inspect` freely
5. **Ask questions:** Community is here to help

---

## Next Steps

You've finished the user guide. Here's what to do next:

1. **Install POLLN:**
   ```bash
   npm install -g polln
   ```

2. **Create Your Colony:**
   ```bash
   polln init --name "My Colony"
   ```

3. **Build Your First Agent:**
   ```bash
   polln agents spawn task --category "my-first-agent"
   ```

4. **Watch It Learn:**
   ```bash
   polln agents inspect <agent-id> --watch
   ```

5. **Join the Community:**
   - Star the repo: https://github.com/SuperInstance/polln
   - Share your creations
   - Learn from others

---

**Welcome to the future of understandable AI.**

**Your colony is waiting.** 🐝

---

*Last Updated: 2026-03-08*
*Version: 1.0.0*
