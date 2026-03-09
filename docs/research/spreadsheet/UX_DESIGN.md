# POLLN Spreadsheet Integration - UX Design Document

**"Self-Deconstructing Spreadsheet Agents"**

---

## Design Vision

Create spreadsheet agents that are **UNDERSTANDABLE** above all else. Every agent should be inspectable, explainable, and transparent. The user should never feel like they're using a "black box" - they should feel like they're observing a collaborative system they can understand, control, and improve.

**Core Principle**: "Watch it Learn" - The magic isn't just that it works, it's that you can see it working.

---

## User Personas

### Persona 1: Sarah Chen - The Business Analyst

**Demographics**: 34, Financial Analyst at mid-market retail company

**Technical Profile**:
- Excel power user (10+ years experience)
- Knows VLOOKUP, INDEX/MATCH, pivot tables inside out
- Has recorded macros but finds VBA intimidating
- Uses Python occasionally for data cleaning (copied from Stack Overflow)

**Goals**:
- "I need to get insights from data faster without waiting for IT"
- "I want to understand WHY the AI is giving me a specific answer"
- "I need to trust the results before I present them to my VP"

**Frustrations**:
- "ChatGPT gives me different answers each time - how do I know which is right?"
- "I can't explain to my boss how I got these numbers"
- "I'm afraid of breaking something I don't understand"

**What "Understandable" Means to Her**:
- Being able to double-click any cell and see the reasoning
- Seeing confidence scores - "87% sure" means something
- Watching the agent learn from her corrections
- Knowing exactly what data the agent used

**Perfect First Use Case**:
```excel
=AGENT("What were my top 3 performing product categories in Q3, and how do they compare to Q2?")
```

When she double-clicks the result, she sees:
- Which data was analyzed (A2:B5000)
- How "top 3" was defined (revenue, not units)
- Why Q2 was chosen as comparison (same quarters, different years)
- Step-by-step breakdown of the analysis
- Option to adjust any parameter and re-run

---

### Persona 2: Marcus Rodriguez - The Operations Manager

**Demographics**: 45, Supply Chain Coordinator at manufacturing company

**Technical Profile**:
- Intermediate Excel user
- Relies heavily on templates others created
- Afraid to "break" complex spreadsheets
- Prefers visual dashboards over raw data

**Goals**:
- "I need to know when something needs my attention NOW"
- "I want the spreadsheet to watch my data for me"
- "I need simple explanations I can show my team"

**Frustrations**:
- "I have 50 spreadsheets and can't check them all every day"
- "By the time I notice a problem, it's too late"
- "Technical people use words I don't understand"

**What "Understandable" Means to Him**:
- Visual representations (not JSON or code)
- Plain English explanations
- Color coding (green = good, red = bad)
- "Show me what changed" since yesterday

**Perfect First Use Case**:
```excel
=AGENT("Alert me when any inventory item falls below its safety stock level")
```

He sees:
- A simple rule explanation: "Widget A is at 5 units, safety stock is 10 units"
- A trend chart showing it's been declining
- A "What caused this?" button that shows recent orders
- One-click "Order more" button

---

### Persona 3: Priya Sharma - The Startup Founder

**Demographics**: 29, Founder of e-commerce startup (15 employees)

**Technical Profile**:
- Very comfortable with technology
- Uses Google Sheets extensively for business tracking
- Has built Zapier automations
- Knows basic SQL from online courses

**Goals**:
- "I need to automate everything possible without hiring"
- "I want to connect multiple data sources and see insights"
- "I need to move fast and change things quickly"

**Frustrations**:
- "Every SaaS tool is $50/month - that adds up fast"
- "I hit the limits of what formulas can do"
- "Custom development takes weeks I don't have"

**What "Understandable" Means to Her**:
- Seeing the cost of every operation
- Understanding performance tradeoffs
- Being able to optimize and iterate quickly
- Debugging without reading logs

**Perfect First Use Case**:
```excel
=AGENT("Fetch customer reviews from Shopify, analyze sentiment, and categorize by product")
```

She sees:
- Breakdown of the 3 agents that collaborated
- API cost: $0.03 for this run
- Cache hit: Next run is free
- "Optimize for speed" vs "Optimize for cost" toggle
- Confidence score: 92% (high enough to trust)

---

### Persona 4: James Morrison - The Retired Volunteer

**Demographics**: 68, Volunteer Treasurer for local non-profit

**Technical Profile**:
- Has used spreadsheets for 30 years (Lotus 1-2-3 → Excel)
- Knows SUM, AVERAGE, basic formatting
- Relies on YouTube tutorials for anything beyond basics
- Prints everything (doesn't trust screens)

**Goals**:
- "I need to keep accurate records for my board"
- "I want simple reports I can print and bring to meetings"
- "I don't want to mess this up - people are counting on me"

**Frustrations**:
- "Everything keeps changing and I can't keep up"
- "Error messages scare me"
- "I don't know who to ask for help"

**What "Understandable" Means to Him**:
- Large text and clear visual hierarchy
- Step-by-step guidance (no assumptions)
- "Undo" button everywhere
- Print-friendly explanations

**Perfect First Use Case**:
```excel
=AGENT("Create a monthly expense report from my transactions in Sheet2")
```

He sees:
- A big friendly button: "Generate Report"
- Progress indicator: "Step 1 of 3: Reading transactions..."
- Preview before final: "Is this correct?"
- Print button right next to the result

---

### Persona 5: Dr. Elena Vostok - The Excel MVP

**Demographics**: 32, Data Scientist, Excel MVP, runs YouTube channel

**Technical Profile**:
- Expert in all Excel features including Power Query and Power Pivot
- Builds complex VBA and Python-in-Excel solutions
- Teaches advanced Excel courses
- Has published Excel add-ins

**Goals**:
- "I want to push Excel to do things it wasn't meant for"
- "I need to prototype quickly before building production solutions"
- "I want to inspect and control every detail"

**Frustrations**:
- "Repetitive coding tasks slow me down"
- "Traditional programming is too verbose for quick experiments"
- "Debugging distributed systems is painful"

**What "Understandable" Means to Her**:
- Full visibility into agent internals
- Performance profiling
- Network topology visualization
- Ability to export and modify agent code

**Perfect First Use Case**:
```excel
=AGENT("Build a Monte Carlo simulation with 10,000 runs, optimize parameters using gradient descent, and return the 95th percentile confidence interval")
```

She sees:
- Exactly 47 parallel agents spawned
- Real-time progress of each simulation run
- Convergence graph showing optimization
- Option to inspect individual agent code
- Export to Python for production use

---

## User Journey Maps

### Journey 1: "Watch It Learn" - First Agent Creation

**Persona**: Sarah Chen (Business Analyst)

**Trigger**: Sarah needs to analyze quarterly sales trends but keeps hitting formula complexity issues.

---

#### Step 1: Natural Language Expression
**Action**: Sarah types "Summarize Q3 sales trends" in cell C1

**UI Response**:
```
┌────────────────────────────────────────────┐
│ Summarize Q3 sales trends                  │
│                                            │
│ 🐝 I can help with this!                   │
│                                            │
│ [Create Agent]  [Learn More]  [Cancel]     │
└────────────────────────────────────────────┘
```

**Key Design Decision**: The tooltip appears AFTER she stops typing (500ms delay), not while typing. This feels like assistance, not interruption.

---

#### Step 2: Context Discovery
**Action**: Sarah clicks "Create Agent"

**UI Response**:
```
┌────────────────────────────────────────────┐
│ 🐝 Agent Setup                             │
├────────────────────────────────────────────┤
│                                            │
│ I found some data nearby:                  │
│                                            │
│ ◉ Sheet1!A2:B1000 (Q3 Sales Data)         │
│ ○ Sheet2!A1:C500 (Q2 Sales Data)          │
│ ○ Manual selection...                      │
│                                            │
│ Also using:                                │
│ ✓ Product categories in Sheet1!D2:D1000   │
│ ✓ Regions in Sheet1!E2:E1000              │
│                                            │
│ [Back]  [Create Agent ✨]                  │
└────────────────────────────────────────────┘
```

**Key Insight**: Sarah didn't have to specify the data range. The system auto-detected it and is showing her what it found. She can verify BEFORE the agent runs.

---

#### Step 3: "Watch It Learn" Mode
**Action**: Sarah clicks "Create Agent"

**UI Response**:
```
┌────────────────────────────────────────────┐
│  🐝  Learning...  Step 1 of 3             │
└────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│ 👁️ Watch It Learn                            │
├───────────────────────────────────────────────┤
│                                               │
│  Building your agent team...                  │
│                                               │
│  ┌─────┐    ┌─────┐    ┌─────┐              │
│  │Step1│───▶│Step2│───▶│Step3│              │
│  │Done │    │Work │    │Wait │              │
│  └─────┘    └─────┘    └─────┘              │
│                                               │
│  1. ✓ Data Reader - Learned your format      │
│  2. ⟳ Trend Analyzer - Finding patterns...   │
│  3. ⏸ Report Writer - Waiting for input      │
│                                               │
│  💡 What's happening:                         │
│  The Trend Analyzer is testing 5 different    │
│  statistical methods to find the best fit     │
│  for your data. Linear regression scored     │
│  highest so far (87% match).                  │
│                                               │
│  Progress: ████████████░░░░░░░░  67%        │
│  Est. time: 12 seconds remaining             │
│                                               │
└───────────────────────────────────────────────┘
```

**Key Innovation**: This isn't a loading spinner. It's a TEACHABLE MOMENT. Sarah is seeing:
- How complex tasks are broken into smaller steps
- That multiple approaches are tried (not magic)
- Why it takes time (it's working, not stuck)
- The specific methods being used

**Progressive Disclosure**: If Sarah clicks "Show more details," she sees:
```
Testing statistical models:
  • Linear regression: 87% match ✓ Current best
  • Moving average (7-day): 72% match
  • Exponential smoothing: 81% match
  • ARIMA (1,1,1): 69% match
  • Polynomial regression (deg=2): 84% match
```

---

#### Step 4: Result Presentation
**Action**: Agent finishes learning

**UI Response**:
```
┌────────────────────────────────────────────┐
│  ✓ Sales increased 15.2% in Q3            │
│                                            │
│  Key findings:                             │
│  • Western region led growth (+23%)        │
│  • Electronics category strongest (+18%)   │
│  • Overall trend: Positive momentum        │
│                                            │
│  [🔍 Inspect]  [⚙️ Adjust]  [📋 Copy]    │
└────────────────────────────────────────────┘
```

**Tooltip on hover**:
```
┌────────────────────────────────────────────┐
│ 3-agent collaboration                      │
│ Confidence: 87% (high)                     │
│ Cache: ⚡ Hit (instant, free)              │
│ Cost: Free (local processing)              │
│                                            │
│ Double-click to see how it works           │
└────────────────────────────────────────────┘
```

---

#### Step 5: The "Aha!" Moment - Agent Inspector
**Action**: Sarah double-clicks the agent cell

**UI Response**: Agent Inspector slides in from right

```
┌───────────────────────────────────────────────────────┐
│ Sales Trend Agent                              [×]    │
├───────────────────────────────────────────────────────┤
│ [Overview] [Network] [Performance] [Settings]        │
├───────────────────────────────────────────────────────┤
│                                                       │
│ 📊 What This Agent Does                              │
│ Analyzes sales data to identify trends and summarize  │
│ key findings.                                         │
│                                                       │
│ 🧠 How It Works (3 agents)                           │
│                                                       │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐    │
│   │   Data   │────▶│  Trend   │────▶│ Report   │    │
│   │  Reader  │     │Analyzer  │     │ Writer   │    │
│   └──────────┘     └──────────┘     └──────────┘    │
│        │                │                │           │
│        ▼                ▼                ▼           │
│   Parses your     Tests 5          Formats as     │
│   Excel format    statistical      bullet list    │
│   automatically   methods           automatically │
│                                                       │
│   Double-click any agent to see details              │
│                                                       │
│ 📈 Result                                             │
│ Q3 sales increased 15.2% compared to Q2              │
│ Confidence: 87%                                       │
│                                                       │
│ ⚡ Performance                                        │
│ Processed: 998 rows in 0.3 seconds                   │
│ Method: Linear regression (87% fit)                  │
│ Cache hit: Next run is instant & free                │
│                                                       │
│ 💰 Cost                                               │
│ This run: Free (local processing)                     │
│ First run cost: $0.00 (no API calls)                 │
│                                                       │
├───────────────────────────────────────────────────────┤
│  [▶ Run Again]  [⚙️ Configure]  [📋 Copy Formula]   │
└───────────────────────────────────────────────────────┘
```

**Key Design Principles**:
1. **Visual over textual**: Show the network, don't describe it
2. **Layered information**: Overview first, drill down available
3. **No jargon**: "Statistical methods" not "stochastic gradient descent"
4. **Actionable**: Every panel has clear next steps

---

#### Step 6: Deep Dive - Individual Agent Inspection
**Action**: Sarah double-clicks the "Trend Analyzer" agent node

**UI Response**:
```
┌───────────────────────────────────────────────────────┐
│ ◀ Back to Network                                     │
├───────────────────────────────────────────────────────┤
│ 🧠 Trend Analyzer Agent                               │
├───────────────────────────────────────────────────────┤
│                                                       │
│ What it does:                                         │
│ Identifies patterns in time-series data using         │
│ statistical analysis.                                 │
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Configuration (this run)                       │  │
│ │                                                 │  │
│ │ Method: Linear regression                       │  │
│ │   Why chosen: Highest R² score (0.87)           │  │
│ │                                                 │  │
│ │ Window: 90 days (full quarter)                 │  │
│ │   Why chosen: Captures full seasonal pattern    │  │
│ │                                                 │  │
│ │ Confidence threshold: 85%                      │  │
│ │   Result: 87% (above threshold) ✓              │  │
│ │                                                 │  │
│ │ Anomaly detection: Enabled                     │  │
│ │   Found: 2 anomalies (investigated)            │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ 📊 Performance                                       │
│ • Success rate: 94% (successful on 937 of 998 rows)  │
│ • Avg. runtime: 0.12 seconds                          │
│ • Last run: Just now                                  │
│                                                       │
│ 📈 Learning History                                   │
│ This agent has improved 12% over the last 30 runs:   │
│                                                       │
│ Success Rate                                          │
│ 100% │    ●●●●                                        │
│  90% │  ●●●●●●●●●●●●●●●●                              │
│  80% │●                                               │
│     └────────────────────────────────                 │
│       Run 1    10    20    30                         │
│                                                       │
│ What it learned from you:                             │
│ ✓ You prefer concise summaries (3-5 bullets)          │
│ ✓ You care about regional breakdowns                  │
│ ✓ You want anomalies highlighted                      │
│                                                       │
│ 🔬 JSON Configuration (for advanced users)           │
│ {                                                     │
│   "method": "linear_regression",                      │
│   "window_days": 90,                                  │
│   "confidence_threshold": 0.85,                       │
│   "anomaly_detection": true,                          │
│   "output_style": "concise"                           │
│ }                                                     │
│                                                       │
│ [View Logs]  [Retrain]  [Reset]  [Export Code]       │
└───────────────────────────────────────────────────────┘
```

**Key Insight**: Sarah is seeing:
1. **Why** decisions were made (not just what decisions)
2. **How** the agent has improved from her feedback
3. **What** it learned about her preferences
4. **Full control** if she wants to dive deeper (JSON export)

---

#### Step 7: The Teachable Moment - Correction
**Action**: Sarah notices an anomaly was flagged incorrectly. She clicks it.

**UI Response**:
```
┌───────────────────────────────────────────────────────┐
│ ⚠️ Anomaly Detected                                   │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Day 47 (July 17) sales: $2,400                        │
│ Expected: $1,500 (based on trend)                     │
│ Difference: +60%                                       │
│                                                       │
│ Why was this flagged?                                 │
│ Sales were 60% higher than the trend predicted.       │
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Was this correct? Help me learn!               │  │
│ │                                                 │  │
│ │ ◉ Yes, this was unusual (a big customer order) │  │
│ │ ○ No, this is normal for July (holiday season) │  │
│ │ ○ Not sure - show me more context              │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ [Skip]  [Show similar days]                           │
└───────────────────────────────────────────────────────┘
```

**Action**: Sarah selects "No, this is normal for July"

**UI Response**:
```
┌───────────────────────────────────────────────────────┐
│ ✓ Thanks! I learned something.                        │
├───────────────────────────────────────────────────────┤
│                                                       │
│ I'll remember that July sales are typically higher    │
│ due to holiday season. Next time, I won't flag       │
│ this as an anomaly.                                   │
│                                                       │
│ Learning update applied to:                           │
│ • Trend Analyzer agent (this spreadsheet)             │
│ • Similar analyses (you can undo this)                │
│                                                       │
│ 💡 Tip: You can review what I've learned in          │
│ the Agent Inspector → Performance tab.               │
│                                                       │
│ [Undo]  [Review All Learning]  [Got it]             │
└───────────────────────────────────────────────────────┘
```

**Key Design Decision**: This is the KEY "Watch It Learn" moment. Sarah isn't just correcting an error - she's teaching the agent. The system makes the learning explicit and thanks her.

---

#### Step 8: Cost Visualization - The "Surprise Bill" Prevention
**Action**: Sarah clicks the cost indicator in the formula bar

**UI Response**:
```
┌───────────────────────────────────────────────────────┐
│ 💰 Cost Dashboard - This Session                      │
├───────────────────────────────────────────────────────┤
│                                                       │
│  This month's budget: $10.00                          │
│  ██████████████░░░░  $8.00 spent (80%)               │
│                                                       │
│  Breakdown by agent:                                  │
│  ┌──────────────────────────────────────────────┐    │
│  │ Sales Trend Agent                            │    │
│  │  Runs: 234  ━━━━━━━━━━━━━━━━━  100%         │    │
│  │  Local: 232  Free                             │    │
│  │  API: 2      $0.10 (first run + complex)    │    │
│  │  Cache: 45   Saved $0.45 ⚡                   │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
│  💡 Optimization opportunity:                         │
│  You could save $0.05/run by using local model       │
│  instead of API for pattern detection.               │
│  [Apply optimization]  [Learn why]                   │
│                                                       │
│  Forecast:                                           │
│  At current rate, you'll hit budget in 6 days.       │
│  [Increase budget]  [Reduce spending]                │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Key Insight**: Sarah sees:
1. **Clear visualization** of spending (not just numbers)
2. **Breakdown** by agent (know what costs money)
3. **Optimization suggestions** (actionable, not just informational)
4. **Forecast** (avoid surprise bills)

---

### Journey 2: "What-If" Scenarios - Simulation & Exploration

**Persona**: Priya Sharma (Startup Founder)

**Trigger**: Priya wants to know "What if Q3 had 10% more sales?" for her board presentation.

---

#### Step 1: Create Simulation Agent
**Action**: Priya selects her sales data and types "What if Q3 sales were 10% higher?"

**UI Response**:
```
┌────────────────────────────────────────────┐
│ 🔮 Simulation Mode                         │
├────────────────────────────────────────────┤
│                                            │
│ I can help you explore "what if" scenarios │
│ by creating a simulated version of your   │
│ data.                                      │
│                                            │
│ What should I simulate?                    │
│                                            │
│ ◉ Increase Q3 sales by 10%                │
│ ○ Decrease Q3 sales by 10%                │
│ ○ Custom percentage...                     │
│                                            │
│ What should I analyze?                     │
│ ✓ Revenue impact                           │
│ ✓ Profit impact (using current margins)    │
│ ✓ Regional breakdown                       │
│ ✓ Comparison to Q2                         │
│                                            │
│ [Cancel]  [Create Simulation ✨]           │
└────────────────────────────────────────────┘
```

---

#### Step 2: Simulation Results
**Action**: Priya clicks "Create Simulation"

**UI Response**:
```
┌───────────────────────────────────────────────────────────┐
│ 🔮 Simulation: Q3 +10% Sales                             │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ┌─────────────────┬─────────────────┬─────────────────┐  │
│ │                 │   Actual Q3     │   Simulated Q3  │  │
│ ├─────────────────┼─────────────────┼─────────────────┤  │
│ │ Total Revenue   │    $1,234,567   │    $1,358,024   │  │
│ │                 │                 │    +10.0%       │  │
│ ├─────────────────┼─────────────────┼─────────────────┤  │
│ │ Total Profit    │      $345,678   │      $380,246   │  │
│ │                 │                 │    +10.0%       │  │
│ │ (28% margin)    │                 │                 │  │
│ ├─────────────────┼─────────────────┼─────────────────┤  │
│ │ Top Region      │     Western     │     Western     │  │
│ │                 │     $456,789   │     $502,468   │  │
│ ├─────────────────┼─────────────────┼─────────────────┤  │
│ │ Top Category    │  Electronics   │  Electronics   │  │
│ │                 │     $234,567   │     $258,024   │  │
│ └─────────────────┴─────────────────┴─────────────────┘  │
│                                                           │
│ 💡 Key Insights:                                          │
│ • Profit increases proportionally (fixed margins)         │
│ • Western region remains top performer                   │
│ • Electronics still leads categories                      │
│ • No change in rankings, just scale                       │
│                                                           │
│ [🔍 Explore Deeper]  [📊 Compare Charts]  [💾 Save]      │
└───────────────────────────────────────────────────────────┘
```

---

#### Step 3: Scenario Comparison
**Action**: Priya clicks "Compare Charts"

**UI Response**:
```
┌───────────────────────────────────────────────────────────┐
│ 📊 Side-by-Side Comparison                                │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Revenue by Month (Q2-Q3)                                 │
│                                                           │
│     $1.4M │                                             │
│          │                                   ░░          │
│     $1.2M │                         ░░░░    ░░░░         │
│          │               ░░░░    ░░░░░░  ░░░░░░        │
│     $1.0M │     ░░░░    ░░░░░░  ░░░░░░░ ░░░░░░░       │
│          │     ░░░░    ░░░░░░░ ░░░░░░░ ░░░░░░░░       │
│      $800K │ ░░░░░░░  ░░░░░░░░ ░░░░░░░░ ░░░░░░░░░      │
│          │ ░░░░░░░░  ░░░░░░░░ ░░░░░░░░ ░░░░░░░░░░     │
│      $600K └────────────────────────────────────         │
│          │   Apr    May    Jun    Jul    Aug    Sep     │
│               Q2                     Q3                 │
│          ──── Actual    ░░░░ Simulated (+10%)           │
│                                                           │
│  [Switch to Profit]  [Switch to Regional]  [Export]     │
│                                                           │
│  💡 Simulation quality: High                              │
│     This simulation preserves your actual data patterns  │
│     and margin structures. Changes are proportional.     │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

#### Step 4: Scenario Management
**Action**: Priya wants to save this simulation and create more

**UI Response**:
```
┌───────────────────────────────────────────────────────────┐
│ 🔮 Scenario Manager                                       │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Saved Scenarios:                                         │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 🔮 Q3 +10% Sales              [Active]          │     │
│  │ Created 2 minutes ago                            │     │
│  │ [View] [Delete] [Duplicate]                      │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 🔮 Q3 +5% Sales, +2% Margin      [Saved]        │     │
│  │ Created 10 minutes ago                           │     │
│  │ [View] [Delete] [Duplicate]                      │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 🔮 Q3 -5% Sales (Downturn)       [Saved]        │     │
│  │ Created 15 minutes ago                           │     │
│  │ [View] [Delete] [Duplicate]                      │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  [+ Create New Scenario]                                  │
│                                                           │
│  ────────────────────────────────────────────────        │
│                                                           │
│  Compare:                                                 │
│  ○ Select two to compare                                  │
│  ◉ Compare all saved scenarios                           │
│                                                           │
│  [Compare Selected]  [Export All to PowerPoint]          │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

#### Step 5: Multi-Scenario Comparison
**Action**: Priya clicks "Compare all saved scenarios"

**UI Response**:
```
┌───────────────────────────────────────────────────────────┐
│ 📊 Scenario Comparison                                    │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Metric Comparison Across Scenarios                        │
│                                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │              Revenue   Profit   Top Region   Top  │   │
│  │                                 (growth)  Category│   │
│  ├───────────────────────────────────────────────────┤   │
│  │ Base (actual)  $1.23M    $346K     +15.2%   Electr│   │
│  │                                                   │   │
│  │ +10% Sales     $1.36M    $380K     +10.0%   Electr│   │
│  │               +10.0%    +10.0%                    │   │
│  │                                                   │   │
│  │ +5% Sales,     $1.29M    $353K     +7.6%    Electr│   │
│  │ +2% Margin    +5.0%     +9.8%                     │   │
│  │                                                   │   │
│  │ -5% Sales      $1.17M    $328K    -15.0%   Electr│   │
│  │               -5.0%     -5.0%                     │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  💡 Insight:                                              │
│  The "+5% Sales, +2% Margin" scenario shows the best      │
│  profit improvement (+9.8%) because margin expansion     │
│  compounds the revenue increase.                          │
│                                                           │
│  [Create Presentation Slides]  [Export to Excel]         │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

#### Step 6: Rollback - Reverting to Reality
**Action**: Priya is done exploring and wants to return to actual data

**UI Response**: Small banner at top of spreadsheet
```
┌───────────────────────────────────────────────────────────┐
│ 🔮 You're viewing a simulated scenario (+10% sales)      │
│                                                           │
│ [Return to Actual Data]  [Keep Exploring Scenarios]      │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Action**: Priya clicks "Return to Actual Data"

**UI Response**:
```
┌───────────────────────────────────────────────────────────┐
│ ✓ Returned to actual data                                │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ Your spreadsheet now shows real numbers again.           │
│                                                           │
│ Scenarios are saved in the Scenario Manager.             │
│ You can revisit them anytime - they don't affect your    │
│ actual data.                                              │
│                                                           │
│ [Open Scenario Manager]  [Got it]                        │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Key Design Principles**:
1. **Clear separation**: Simulated vs actual data is ALWAYS obvious
2. **Easy rollback**: One click back to reality
3. **Persistent scenarios**: Save multiple scenarios, compare them
4. **Presentation-ready**: Export directly to slides for board meetings

---

### Journey 3: Agent Colony - Multi-Cell Coordination

**Persona**: Elena Vostok (Excel MVP / Data Scientist)

**Trigger**: Elena wants to build a complex multi-step analysis pipeline

---

#### Step 1: Create First Agent
**Action**: Elena creates a data fetching agent in cell A1

```excel
A1: =AGENT("Fetch latest stock prices from Yahoo Finance API", symbols=B2:B10)
```

**UI Response**:
```
┌────────────────────────────────────────────┐
│  🐝  Fetching prices...  1 of 10 symbols  │
└────────────────────────────────────────────┘
```

**Result**: Cell A1 shows fetched prices in a spill range

---

#### Step 2: Create Dependent Agent
**Action**: Elena creates an analysis agent in cell A10 that references A1's results

```excel
A10: =AGENT("Calculate moving averages and RSI for these prices", source=A2#)
```

**Note**: `A2#` is the spill range reference (Excel's dynamic array syntax)

**UI Response**: System detects the dependency

```
┌───────────────────────────────────────────────────────────┐
│ 🐝 Dependency Detected                                    │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ This agent will use data from the "Fetch Prices" agent   │
│ in cell A1.                                               │
│                                                           │
│ ┌─────────────────────────────────────────────────┐       │
│ │   A1  ──────▶  A10 (this cell)                  │       │
│ │ Fetch Prices    Calculate Indicators             │       │
│ │                                                           │
│ │ Data will flow automatically when A1 updates    │       │
│ └─────────────────────────────────────────────────┘       │
│                                                           │
│ [Create Agent]  [Cancel]                                  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

#### Step 3: Visualize Agent Network
**Action**: Elena selects both A1 and A10, then clicks "Show Network" in the Agent ribbon

**UI Response**:
```
┌───────────────────────────────────────────────────────────┐
│ 🕸️ Agent Network View                                     │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  [Layout: Auto] [Hierarchical] [Circular]                 │
│                                                           │
│     ┌──────────┐                                         │
│     │   A1     │                                         │
│     │  Fetch   │──┐ symbols (10)                         │
│     │ Prices   │  │                                      │
│     └──────────┘  │                                      │
│                   ▼                                      │
│            ┌──────────┐                                  │
│            │   A10    │                                  │
│            │ Calculate│──▶ indicators                    │
│            │ Indicators│                                  │
│            └──────────┘                                  │
│                                                           │
│  💡 Data flows from top to bottom                        │
│  When A1 updates, A10 recalculates automatically         │
│                                                           │
│  [Add Agent]  [Collapse All]  [Export Diagram]           │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

#### Step 4: Create Third Agent (Alerting)
**Action**: Elena creates an alert agent in A20 that references A10

```excel
A20: =AGENT("Alert me if any RSI > 70 (overbought) or < 30 (oversold)", source=A10#)
```

**Network Updates**:
```
     ┌──────────┐
     │   A1     │
     │  Fetch   │──┐
     │ Prices   │  │
     └──────────┘  │
                  ▼
           ┌──────────┐
           │   A10    │──┐
           │ Calculate│  │
           │ Indicators│  │
           └──────────┘  │
                        ▼
                 ┌──────────┐
                 │   A20    │
                 │  Alert   │──▶ notifications
                 └──────────┘
```

---

#### Step 5: Colony View - Multi-Agent Orchestration
**Action**: Elena clicks "Colony View" to see all agents working together

**UI Response**:
```
┌───────────────────────────────────────────────────────────┐
│ 🐝 Agent Colony - Real-time Activity                       │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Active Agents: 3  │  Updates: Every 5 min  │  Status: ✓ │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │                                                 │     │
│  │  ┌──────┐    ┌──────┐    ┌──────┐              │     │
│  │  │ A1   │───▶│ A10  │───▶│ A20  │              │     │
│  │  │Fetch │    │Calc │    │Alert │              │     │
│  │  │  5s  │    │  2s  │    │  1s  │              │     │
│  │  └──────┘    └──────┘    └──────┘              │     │
│  │    ▲                             │               │     │
│  │    │                             ▼               │     │
│  │  Yahoo Finance            Email notifications │     │
│  │  (API)                    (if conditions met)  │     │
│  │                                                 │     │
│  │  Last run: 2 min ago  Next run: 3 min         │     │
│  │                                                 │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  💡 Colony Insights:                                      │
│  • All agents healthy ✓                                   │
│  • Average latency: 2.7 seconds                           │
│  • No alerts triggered today (normal market conditions)   │
│  • Cache hit rate: 95% (efficient!)                       │
│                                                           │
│  [▶ Run All Now]  [⏸ Pause Colony]  [⚙️ Settings]       │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

#### Step 6: Real-Time "Watch It Learn"
**Action**: Colony runs automatically. Elena watches

**UI Response**: Live activity in Colony View
```
┌───────────────────────────────────────────────────────────┐
│ 🐝 Agent Colony - Live Update                             │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ▶ Running... (Step 1 of 3)                              │
│                                                           │
│  ┌──────────┐     Status      ┌──────────┐              │
│  │   A1     │  ████████░░    │   A10    │              │
│  │  Fetch   │   Processing   │ Waiting  │              │
│  └──────────┘                 └──────────┘              │
│       │                                                    │
│       ▼                                                    │
│  📡 Fetching from Yahoo Finance API...                    │
│     • AAPL: $178.32 (+1.2%)                              │
│     • MSFT: $378.91 (+0.8%)                              │
│     • GOOGL: $141.23 (-0.3%)                             │
│     • 7 more symbols...                                  │
│                                                           │
│  Est. time: 3 seconds remaining                           │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Progressive Update**: As A1 finishes, A10 starts:
```
│  ▶ Running... (Step 2 of 3)                              │
│                                                           │
│  ┌──────────┐     Status      ┌──────────┐              │
│  │   A1     │  ██████████    │   A10    │              │
│  │  Fetch   │    ✓ Done!     │ ████████░░               │
│  └──────────┘                 │Processing│              │
│                              └──────────┘              │
│                                   │                      │
│                                   ▼                      │
│  🧠 Calculating technical indicators...                  │
│     • AAPL RSI: 68.5 (neutral)                           │
│     • MSFT RSI: 72.1 (approaching overbought) ⚠️        │
│     • GOOGL RSI: 45.2 (neutral)                          │
│     • Computing moving averages...                       │
│                                                           │
│  MSFT may trigger alert! (RSI > 70 threshold)            │
│                                                           │
```

---

#### Step 7: Alert Triggered
**Action**: A20 detects MSFT is overbought

**UI Response**: Non-intrusive notification (not modal)
```
┌───────────────────────────────────────────────────────────┐
│ ⚠️ Agent Alert: A20 detected condition                    │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ MSFT (Microsoft) is overbought:                           │
│ • RSI: 72.1 (threshold: 70)                               │
│ • Price: $378.91 (+0.8% today)                            │
│ • Recommendation: Consider taking profits                │
│                                                           │
│ This alert was generated by the Alert agent in cell A20.  │
│                                                           │
│ [View Full Analysis]  [Dismiss]  [Snooze 1 hour]         │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Key Design Decision**: Toast notification, not modal. Elena can dismiss or ignore. The cell A20 also shows:
```
┌────────────────────────────────────────────┐
│  ⚠️ 1 alert: MSFT overbought (RSI 72.1)   │
└────────────────────────────────────────────┘
```

---

### Journey 4: Debugging & Troubleshooting

**Persona**: Marcus Rodriguez (Operations Manager)

**Trigger**: Marcus's inventory alert agent isn't firing when he expects

---

#### Step 1: Something Seems Wrong
**Observation**: Marcus notices Widget A is at 5 units but no alert fired

**Cell State**:
```
┌────────────────────────────────────────────┐
│  ⏸ Inventory Watcher  Last check: 2h ago  │
└────────────────────────────────────────────┘
```

**Hover Tooltip**:
```
This agent hasn't run recently.
Possible reasons:
• Spreadsheet not open
• Agent paused
• Error preventing execution

[Check now]  [View status]
```

---

#### Step 2: Non-Technical Diagnosis
**Action**: Marcus double-clicks the agent cell

**UI Response**: Agent Inspector with Troubleshoot tab
```
┌───────────────────────────────────────────────────────┐
│ 🔧 Inventory Watcher - Troubleshooting                │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Issue Found: ⚠️ Agent not running                   │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ What's wrong:                                   │  │
│  │                                                 │  │
│  │ This agent checks inventory every hour, but     │  │
│  │ hasn't run in 2 hours.                          │  │
│  │                                                 │  │
│  │ Most likely cause:                              │  │
│  │ The spreadsheet was closed, so the agent        │  │
│  │ couldn't run. Agents only run when the          │  │
│  │ spreadsheet is open (unless using cloud mode).  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  Quick fixes (try these in order):                    │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 1️⃣ Run agent now manually                       │  │
│  │    [▶ Run Now]                                  │  │
│  │                                                 │  │
│  │ 2️⃣ Enable cloud mode (runs when spreadsheet    │  │
│  │    is closed)                                   │  │
│  │    [Enable Cloud]  $2/month                     │  │
│  │                                                 │  │
│  │ 3️⃣ Check for errors                            │  │
│  │    [View Error Log]                             │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  Still having issues?                                 │
│  [Contact Support]  [Request Call]                   │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

#### Step 3: Guided Fix
**Action**: Marcus clicks "Run Now"

**UI Response**: Progress panel
```
┌───────────────────────────────────────────────────────┐
│ ▶ Running Inventory Watcher...                        │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Step 1 of 3: Reading inventory data...              │
│  ████████████░░░░░░░░  67%                            │
│                                                       │
│  Found 234 inventory items to check...               │
│                                                       │
│  ⏸ Paused  [Cancel]                                  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Result**: Agent finishes, shows alerts
```
┌───────────────────────────────────────────────────────┐
│ ✓ Inventory Watcher completed                         │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Found 3 items needing attention:                     │
│                                                       │
│  ⚠️ Widget A - 5 units (safety stock: 10)            │
│     [Order more]  [View details]                      │
│                                                       │
│  ⚠️ Widget G - 2 units (safety stock: 15)            │
│     [Order more]  [View details]                      │
│                                                       │
│  ⚠️ Widget K - 0 units (out of stock!)                │
│     [Order now]  [View details]                       │
│                                                       │
│  [Email this report]  [Schedule hourly check]        │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

#### Step 4: Understanding What Happened
**Action**: Marcus clicks "View details" for Widget A

**UI Response**:
```
┌───────────────────────────────────────────────────────┐
│ 📦 Widget A - Inventory Details                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Current Status: ⚠️ Low stock                         │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Inventory History (Last 30 days)                │  │
│  │                                                 │  │
│  │  Units                                           │  │
│  │   15 │  ●●●                                     │  │
│  │   10 │  ●●●●●●●●●  ◆◆◆ Safety stock level      │  │
│  │    5 │  ●●●●●●●●●●●●●●●●●●  ● You are here     │  │
│  │    0 └─────────────────────────────             │  │
│  │        Day 1    10    20    30                  │  │
│  │                                                 │  │
│  │ Trend: Declining rapidly (sold 8 units today)  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  Why was I alerted?                                   │
│  You configured this agent to alert when any item     │
│  falls below its safety stock level. Widget A's      │
│  safety stock is 10 units, and current stock is 5.    │
│                                                       │
│  [Reorder Widget A]  [Adjust safety stock]           │
│  [View order history]  [Dismiss alert]               │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Key Design Decision**: Marcus isn't just told "Widget A is low." He sees:
1. **Visual history** (chart showing decline)
2. **Why** the alert triggered (explain the rule)
3. **Context** (safety stock comparison)
4. **Actions** (what he can do now)

---

### Journey 5: Progressive Disclosure - Power User Features

**Persona**: Dr. Elena Vostok (Excel MVP)

**Trigger**: Elena wants to fine-tune agent behavior beyond defaults

---

#### Step 1: Access Advanced Controls
**Action**: Elena right-clicks an agent cell → "Agent Settings"

**UI Response**: Settings panel with tiered complexity

```
┌───────────────────────────────────────────────────────┐
│ ⚙️ Sales Trend Agent - Settings              [×]    │
├───────────────────────────────────────────────────────┤
│                                                       │
│ ┌─ Basic ─┐ ┌─ Advanced ─┐ ┌─ Expert ─┐ ┌─ Dev ─┐   │
│                                                       │
│  Temperature:                                         │
│  More Creative ●━━━━━━━━● More Precise               │
│  0.7                                                      │
│                                                       │
│  Learning Rate:                                        │
│  Fast Learning ●━━━━━━━━● Stable Results             │
│  0.3                                                      │
│                                                       │
│  Error Handling:                                       │
│  [Retry automatically ▼]                              │
│                                                       │
│  ☐ Show advanced options                              │
│                                                       │
│  [Cancel]  [Reset to Defaults]  [Save Changes]       │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

#### Step 2: Advanced Settings (Toggle Enabled)
**Action**: Elena checks "Show advanced options"

**UI Response**: More controls appear
```
│                                                       │
│  ┌─ Basic ─┐ ┌─ Advanced ─┐ ┌─ Expert ─┐ ┌─ Dev ─┐   │
│                                                       │
│  Temperature: 0.7                                      │
│  Learning Rate: 0.3                                   │
│                                                       │
│  Cache Strategy:                                       │
│  ○ None (always recompute)                            │
│  ◉ Conservative (cache for 1 hour)                    │
│  ○ Aggressive (cache for 24 hours)                    │
│                                                       │
│  Privacy Mode:                                         │
│  ◉ Local only (no data sharing)                       │
│  ○ Colony learning (share with team)                  │
│  ○ Public meadow (share with community)              │
│                                                       │
│  Max Parallel Agents: 5                                │
│  ◀━━━━━━━━━━━━━━━━▶ 10                               │
│                                                       │
│  Timeout: 30 seconds                                   │
│                                                       │
│  ☐ Show expert options                                │
│                                                       │
```

---

#### Step 3: Expert Settings
**Action**: Elena checks "Show expert options"

**UI Response**: Technical parameters
```
│                                                       │
│  ┌─ Basic ─┐ ┌─ Advanced ─┐ ┌─ Expert ─┐ ┌─ Dev ─┐   │
│                                                       │
│  Seed: [12345] or [Random]                            │
│                                                       │
│  Model Selection:                                     │
│  ○ Auto (let system choose)                           │
│  ◉ Local only (faster, no cost)                       │
│  ○ GPT-4 Turbo ($0.01/1k tokens)                      │
│  ○ Claude 3 Opus ($0.015/1k tokens)                   │
│                                                       │
│  Plinko Temperature (Exploration):                     │
│  Explore ●━━━━━●● Exploit                             │
│  0.5                                                      │
│                                                       │
│  Hebbian Learning Rate:                                │
│  Disabled ●━━━━●●●● Aggressive                         │
│  0.1                                                      │
│                                                       │
│  Synaptic Decay Rate:                                  │
│  None ●━━━━━●● Fast                                   │
│  0.01                                                     │
│                                                       │
│  ☐ Show developer options                             │
│                                                       │
```

---

#### Step 4: Developer Mode
**Action**: Elena checks "Show developer options"

**UI Response**: Full technical control + export
```
│                                                       │
│  ┌─ Basic ─┐ ┌─ Advanced ─┐ ┌─ Expert ─┐ ┌─ Dev ─┐   │
│                                                       │
│  🔧 Developer Options                                 │
│                                                       │
│  Export Configuration:                                │
│  [JSON] [YAML] [TOML] [Python] [TypeScript]          │
│                                                       │
│  Debug Logging:                                        │
│  ☑ Enable verbose logging                             │
│  ☑ Include A2A package traces                         │
│  ☐ Log to file                                        │
│                                                       │
│  Performance Profiling:                                │
│  ☑ Track agent execution time                         │
│  ☑ Monitor memory usage                               │
│  ☐ Profile CPU usage                                  │
│                                                       │
│  Agent Network Export:                                 │
│  [Graphviz DOT] [Mermaid] [Cypher] [JSON]           │
│                                                       │
│  Custom Agent Code:                                    │
│  [View Generated Code] [Edit Code] [Import Custom]    │
│                                                       │
│  ⚠️ Developer mode may slow down agent execution      │
│                                                       │
│  [Export All Settings]  [Reset to Defaults]          │
```

---

#### Step 5: View Generated Code
**Action**: Elena clicks "View Generated Code"

**UI Response**: Code inspector with syntax highlighting
```
┌───────────────────────────────────────────────────────┐
│ 💻 Generated Agent Code - Trend Analyzer              │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Language: [TypeScript ▼]  [Copy]  [Download]       │
│                                                       │
│ ┌─────────────────────────────────────────────────┐   │
│ │ import { BaseAgent } from '@polln/core';        │   │
│ │                                                 │   │
│ │ export class TrendAnalyzerAgent extends BaseAgent {│
│ │   constructor(config: TrendConfig) {            │   │
│ │     super({                                     │   │
│ │       type: 'trend_analyzer',                  │   │
│ │       version: '1.2.0',                        │   │
│ │       temperature: 0.7,                       │   │
│ │       learningRate: 0.3,                      │   │
│ │       seed: 12345,                            │   │
│ │       ...                                      │   │
│ │     });                                        │   │
│ │   }                                            │   │
│ │                                                 │   │
│ │   async analyze(data: TimeSeries[]): Promise< │   │
│ │     TrendResult> {                              │   │
│ │     // Method selection based on data           │   │
│ │     // characteristics                          │   │
│ │     const method = this.selectMethod(data);    │   │
│ │                                                 │   │
│ │     // Statistical analysis                    │   │
│ │     const result = await method.compute(data); │   │
│ │                                                 │   │
│ │     // Confidence scoring                      │   │
│ │     result.confidence = this.scoreConfidence(│   │
│ │       result, data                             │   │
│ │     );                                          │   │
│ │                                                 │   │
│ │     return result;                             │   │
│ │   }                                            │   │
│ │ }                                              │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│  [Edit This Code]  [Create Custom Agent]              │
│  [View Network Graph]  [Export as Package]           │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Key Insight**: Elena can:
1. **Inspect** the exact code her agent is running
2. **Learn** how agents are structured
3. **Modify** and create custom agents
4. **Export** for use in other projects

This is POWER USER progressive disclosure - not shown to normal users, but available when needed.

---

## Interaction Patterns

### Pattern 1: The Agent Formula

**Syntax**:
```excel
=AGENT(
  "Natural language description",
  parameter1=value1,
  parameter2=value2
)
```

**Examples** (Progressive Complexity):

```excel
# Level 1: Simple (inferred)
=AGENT("Summarize the sales data")

# Level 2: With data source
=AGENT("Analyze trends", source=A2:B100)

# Level 3: With configuration
=AGENT("Predict next month's sales", source=A2:B100, method="linear")

# Level 4: Complex multi-step
=AGENT(
  "Fetch reviews, analyze sentiment, categorize by product",
  source=Sheet2!A2:A500,
  cache=true,
  temperature=0.3,
  max_agents=5
)

# Level 5: Expert (full control)
=AGENT(
  "Monte Carlo simulation",
  source=Data!A1:Z1000,
  runs=10000,
  method="gradient_descent",
  confidence=0.95,
  seed=42,
  export="C:\output\results.csv"
)
```

---

### Pattern 2: Cell States & Visual Language

#### State: Empty Agent (Before First Run)
```
┌────────────────────────────────────────────┐
│  🐝  Click to configure                    │
└────────────────────────────────────────────┘
```
- Border: Dashed purple (2px)
- Background: Subtle purple gradient (5% opacity)
- Icon: 🐝 (30% opacity)
- Text: Gray, italic

#### State: Processing
```
┌────────────────────────────────────────────┐
│  🐝  Analyzing 99 rows...          [⏳]     │
└────────────────────────────────────────────┘
```
- Border: Animated purple-blue gradient
- Icon: 🐝 (bouncing animation)
- Status: Spinner in corner

#### State: Ready (Success)
```
┌────────────────────────────────────────────┐
│  ✓ Sales: +15.2% Q3              ⚡ Cache  │
└────────────────────────────────────────────┘
```
- Border: Solid blue (2px)
- Icon: ✓ green (corner)
- Badges: ⚡ Cache hit, 💰 Cost indicator

#### State: Error
```
┌────────────────────────────────────────────┐
│  ❌ Data format mismatch    [Fix it]       │
└────────────────────────────────────────────┘
```
- Border: Solid red (2px)
- Icon: ❌ red
- Action: "Fix it" button

---

### Pattern 3: Hover Tooltips (Progressive Disclosure)

**Basic Hover**:
```
┌────────────────────────────────────────────┐
│ 🐝 Sales Summary Agent                     │
│ Uses: 3 agents                             │
│ Last run: 2 min ago                        │
│ Cache: ⚡ Hit (free)                       │
│                                            │
│ Double-click to inspect                    │
└────────────────────────────────────────────┘
```

**Detailed Hover** (after 1 second):
```
┌────────────────────────────────────────────┐
│ Sales Summary Agent                        │
│ ─────────────────────────────────────────  │
│ 3-agent collaboration:                     │
│ • Data Reader (0.1s)                       │
│ • Trend Analyzer (0.15s)                   │
│ • Report Writer (0.05s)                    │
│                                            │
│ Total: 0.3s  Confidence: 87%               │
│ Cache hit saved: $0.02                     │
│                                            │
│ [🔍 Inspect]  [⚙️ Configure]             │
└────────────────────────────────────────────┘
```

---

### Pattern 4: Double-Click = Agent Inspector

**Key UX Decision**: Double-clicking an agent cell does NOT edit the formula. It opens the Inspector.

**Rationale**:
- Most users want to UNDERSTAND, not EDIT
- Power users can press F2 for formula editing
- Inspection is more common than modification

**Workflow**:
```
Double-click agent cell
    ↓
Agent Inspector slides in (Overview tab)
    ↓
Click other tabs (Network, Performance, Settings)
    ↓
Double-click agent nodes (in Network tab)
    ↓
Individual Agent Detail panel
```

---

### Pattern 5: Error Handling (No Unhandled Exceptions)

**Philosophy**: Every error is explainable and fixable by a non-programmer.

#### Error Type: Data Format Mismatch
**Cell Shows**:
```
┌────────────────────────────────────────────┐
│  ⚠️ Data format mismatch    [Fix it]       │
└────────────────────────────────────────────┘
```

**Double-Click Opens**:
```
┌───────────────────────────────────────────────────────┐
│ 🔧 Data Format Error                                 │
├───────────────────────────────────────────────────────┤
│                                                       │
│  What's wrong:                                       │
│  Column A should contain dates, but has text like     │
│  "N/A" or "TBD".                                     │
│                                                       │
│  Found in: 12 rows (A45, A67, A89, A102, A123...)   │
│                                                       │
│  Quick fixes:                                        │
│  ◉ Auto-fix: Treat "N/A" and "TBD" as empty cells    │
│  ○ Remove rows with invalid dates                     │
│  ○ Change source range to exclude problematic rows   │
│  ○ Cancel and fix manually                           │
│                                                       │
│  [Apply Fix]  [Show Affected Rows]  [Learn More]    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

### Pattern 6: Version History (Spreadsheet-Native)

**Access**: Right-click agent cell → "View History"

**UI Response**:
```
┌───────────────────────────────────────────────────────┐
│ 📜 Agent Version History - Sales Trend Agent         │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Timeline:                                           │
│                                                       │
│  ●───●───●───●───●                                   │
│  1   2   3   4   5                                  │
│                                                       │
│  Version 5 (Current) - Today, 2:34 PM                │
│  Changed by: You                                     │
│  • Adjusted temperature from 0.5 to 0.7              │
│  • Changed method from "auto" to "linear_regression" │
│  Result: +5% confidence improvement (87% → 92%)      │
│  [View Details]  [Restore This Version]             │
│                                                       │
│  Version 4 - Yesterday, 4:12 PM                       │
│  Changed by: You                                     │
│  • Added anomaly detection                           │
│  Result: Found 2 anomalies                           │
│  [View Details]  [Restore This Version]             │
│                                                       │
│  Version 3 - 2 days ago                               │
│  Changed by: Auto-correction from user feedback      │
│  • Learned: You prefer concise output                │
│  Result: Output shortened from 8 bullets to 3        │
│  [View Details]  [Restore This Version]             │
│                                                       │
│  [View All Versions]  [Compare Versions]            │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## Visual Language Guide

### Color Palette

| Purpose | Color | Hex | Usage |
|---------|-------|-----|-------|
| **Agent Primary** | Purple | #8B5CF6 | Agent cells, primary actions |
| **Success** | Green | #10B981 | Completed, cache hit |
| **Warning** | Orange | #F59E0B | Caution, attention needed |
| **Error** | Red | #EF4444 | Failure, critical issues |
| **Info** | Blue | #3B82F6 | Information, help |
| **Neutral** | Gray | #6B7280 | Secondary text |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Cell content | Segoe UI / Calibri | 11pt | Normal |
| Agent cell | Segoe UI / Calibri | 11pt | Medium |
| Panel header | Segoe UI / Calibri | 14pt | Semibold |
| Tooltip title | Segoe UI / Calibri | 12pt | Semibold |
| Tooltip body | Segoe UI / Calibri | 10pt | Normal |
| Code | Consolas / Monaco | 10pt | Normal |

### Icons

| Icon | Meaning | Usage |
|------|---------|-------|
| 🐝 | Agent | Primary brand icon |
| ✓ | Success | Completed successfully |
| ⚠️ | Warning | Needs attention |
| ❌ | Error | Failed |
| ⚡ | Fast/Cached | Local processing |
| 💰 | Cost | Paid operation |
| 🔒 | Private | Local only |
| 🌐 | Public | Community/shared |
| 🔄 | Learning | Training/optimizing |
| 📊 | Data | Analytics |
| 🔍 | Inspect | View details |
| ⚙️ | Settings | Configuration |
| 🔮 | Simulation | What-if scenario |

---

## Accessibility Considerations

### Keyboard Navigation
- `Tab`: Navigate between cells
- `Enter`: Select agent cell
- `F2`: Edit agent formula (power users)
- `Ctrl+Shift+A`: Insert new agent
- `Ctrl+Shift+I`: Open inspector
- `Escape`: Close panel/dialog

### Screen Reader Support
- Agent cells: `role="button"` with descriptive labels
- Dynamic updates: `aria-live="polite"` for status changes
- Errors: `aria-live="assertive"` for critical issues
- Network graph: Text-based description available

### Color Blindness
- Never rely on color alone (use icons + labels)
- Patterns for data visualization (stripes, dots)
- High contrast mode support

### Reduced Motion
- Respect `prefers-reduced-motion`
- Static indicators instead of animations
- No auto-play (user controls)

---

## Mobile Strategy

### Constraints
- Screen width: < 768px
- Touch-only interaction
- Limited screen real estate

### Adaptations

#### Agent Cell (Mobile)
- Larger touch targets (min 44px × 44px)
- Swipe gestures for actions
- Full-screen inspector (bottom sheet style)

#### Agent Inspector (Mobile)
```
┌─────────────────────────────────────────┐
│                                         │
│         (swipe down to close)           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Sales Trend Agent        [×]  │   │
│  ├─────────────────────────────────┤   │
│  │  [Overview] [Network] [More]    │   │
│  ├─────────────────────────────────┤   │
│  │                                 │   │
│  │  📊 Result                      │   │
│  │  Q3 sales increased 15.2%       │   │
│  │                                 │   │
│  │  🧠 3 agents collaborated       │   │
│  │  ⚡ Cache hit (instant)         │   │
│  │                                 │   │
│  │  [▶ Run]  [⚙️ Settings]        │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Implementation Roadmap

### Phase 1: Foundation (Months 1-3)
1. Natural language agent creation
2. Basic Agent Inspector (Overview tab)
3. Cost awareness and warnings
4. Template library (10 templates)

### Phase 2: Enhanced Experience (Months 4-6)
1. Visual agent network (force-directed graph)
2. Performance tab (metrics, optimization)
3. "Watch It Learn" mode (real-time observation)
4. Agent chaining (workflows)

### Phase 3: Advanced Features (Months 7-9)
1. Scenario simulation (what-if analysis)
2. Multi-agent colonies (coordination)
3. Team library (sharing)
4. Cost optimization dashboard

### Phase 4: Production Hardening (Months 10-12)
1. Enterprise security
2. Compliance features (GDPR, SOC 2)
3. Advanced monitoring
4. Developer SDK

---

## Design Principles Summary

1. **UNDERSTANDABLE Above All**: Every agent is inspectable
2. **Progressive Disclosure**: Simple by default, powerful when needed
3. **Teachable Moments**: Show users how agents work and learn
4. **No Black Boxes**: Confidence scores, traces, explanations
5. **Cost Transparency**: Never surprise users with bills
6. **Spreadsheet-Native**: Feel like Excel, not a plugin
7. **Accessible**: Keyboard, screen reader, color blind support
8. **Delightful**: Smooth animations, helpful tooltips

---

## Next Steps

1. **User Research**: Interview 20 spreadsheet users (5 per persona)
2. **Prototype**: Build high-fidelity Figma mockups
3. **Usability Testing**: Test with 10 users per persona
4. **Design Sprint**: 5-day refinement based on feedback
5. **Technical Validation**: Confirm feasibility with engineering

---

*Document Version: 1.0*
*Last Updated: 2026-03-08*
*Author: Product Design Team*
*Status: Ready for Review*
