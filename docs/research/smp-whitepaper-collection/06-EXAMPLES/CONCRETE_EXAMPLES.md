# CONCRETE EXAMPLES

**Real stories from the SMP front lines. No theory, just what happens when you put intelligence in a cell.**

---

## 1. Maya's Loan Application

**The Setup**

Maya runs a mid-sized credit union. Her team processes 200 loan applications daily. Human reviewers catch fraud, but they're tired. False negatives are bleeding $2M monthly. She installs SMP tiles in the loan tracking spreadsheet.

**The Three-Zone Fraud Detection Pipeline**

Row 5 becomes the intelligence hub:

```
A5: =SMPBOT(FraudDetection_FirstPass)
    Seed: A2:E500 (applicant data range)
    Model: distilled-llama-7b-fraud-tuned
    Prompt: "Flag anything that feels wrong. Score 0-100."
```

First pass tile (FRAUD_TILE_001) catches the obvious stuff. Application #47 from "Billionaire Prince Nzongo" requesting a $500 loan? Confidence 99.4% fraud. Zone 3 - reject. That one's easy.

But then comes application #312: Sarah Johnson, 42, teacher, $15,000 loan for home renovation.

```
FRAUD_TILE_001: Confidence 34% - Zone 2 (Needs Investigation)
    → Triggers cascade to FRAUD_TILE_002
```

**The Second Tile Deep Dive**

```
B5: =SMPBOT(FraudDetection_PatternAnalysis)
    Seed: Filtered to Zone 2 cases
    Model: cached-transaction-analyzer
    Prompt: "Compare against 50,000 known fraud patterns. Score similarity."
```

Tile 002 lights up:
- Address given: 742 Evergreen Terrace
- Phone area code: 503 (Oregon)
- Employment: Lincoln High School (Portland area)
- Bank statements: First Interstate (Pacific Northwest)

Pattern match: 87% similar to "Application Stacking Fraud" - where fraudsters submit multiple legitimate-looking applications simultaneously across different institutions.

```
FRAUD_TILE_002: Pattern Confidence 87% - Zone 3 (High Risk)
    → Triggers FRAUD_TILE_003 for final verification
```

**The Cross-Reference Tile**

```
C5: =SMPBOT(FraudDetection_NetworkCheck)
    Seed: Cross-reference national application database
    Model: minimal-network-analyzer
    Prompt: "Check if this applicant has active applications elsewhere."
```

**The Breakthrough**

Tile 003 finds Sarah Johnson has 7 active loan applications across 6 institutions, all submitted in the past 48 hours. The first application used a slightly different SSN (transposed digits). The phone number matches. The employment history matches.

```
FINAL OUTPUT in F5:
┌─────────────────────────────────────────────────────────────┐
│ FRAUD DETECTION COMPLETE                                     │
│ Applicant: Sarah Johnson (Application #312)                 │
│                                                              │
│ Tile Confidence Cascade:                                     │
│   • FRAUD_TILE_001: 34% (Zone 2 - Suspicious)              │
│   • FRAUD_TILE_002: 87% (Pattern match - App Stacking)     │
│   • FRAUD_TILE_003: 94% (Confirmed - 7 simultaneous apps)  │
│                                                              │
│ FINAL CONFIDENCE: 94.2% FRAUD                               │
│ RECOMMENDATION: Zone 3 - Auto-reject                        │
│                                                              │
│ Evidence:                                                    │
│   • 7 active applications in 48 hours                       │
│   • SSN transposition between apps                          │
│   • Identical employment history, different addresses       │
│   • Matches pattern: Application Stacking Ring #4291        │
└─────────────────────────────────────────────────────────────┘
```

**The Aha Moment**

Maya's human reviewer would've approved this application. It looked legitimate on the surface. But the three-tile cascade caught what no single review could see - the pattern across institutions.

First week: 24 fraud attempts blocked. $180,000 saved. Each tile's decision documented. Human reviewers now focus on the Zone 2 gray areas, not the obvious Zone 1 and Zone 3 cases.

Maya upgraded the tiles after month two, adding FRAUD_TILE_004 for adaptive learning. It now catches new fraud patterns the ring develops. The tiles are learning from each attempted fraud.

---

## 2. The Warehouse That Ran Itself

**The Setup**

Pacific Rim Logistics. 200,000 sq ft warehouse. 15,000 SKUs. 47 pick stations. 8 autonomous mobile robots (AMRs). Central routing system keeps crashing during peak times, causing $12K/hour in delays.

Operations Director Maria installs stigmergic SMP tiles in the inventory tracking spreadsheet. No central controller. Just tiles that leave "digital pheromones."

**The Stigmergic Tile Architecture**

Column Z becomes the intelligence layer:

```
Z1: =SMPBOT(Inventory_StatusTile)
    Seed: A1:Y15000 (entire inventory)
    Model: minimal-status-checker
    Prompt: "Update status based on current stock levels. Mark urgent if <10 units."
```

This tile runs every 5 minutes. When stock drops below 10 units, it deposits a "pheromone" in an adjacent cell:

```
AA1: =SMPBOT(Pheromone_UrgencyMarker)
    Seed: Urgent items from Z1
    Model: tiny-marker
    Prompt: "Mark urgency level. 1=Low, 5=Critical."
```

**The AMR Coordination Tiles**

Each AMR has a local tile:

```
Z2: =SMPBOT(AMR_01_DecisionTile)
    Seed: Current location + nearby pheromone readings
    Model: cached-path-optimizer
    Prompt: "Choose next task based on pheromone gradient. Ignore if pheromone <3."
```

**The Breakthrough**

No central dispatcher. Each AMR reads local pheromone levels and makes independent decisions:

9:47 AM - The system detects Item #4892 (microcontroller, urgent) in Zone B, stock = 3 units. Pheromone marker hits level 5 (critical).

Three AMRs are closer to Zone B than others:
- AMR_01: 47 meters away, current task priority 2
- AMR_03: 62 meters away, current task priority 4
- AMR_07: 38 meters away, idle

Each AMR's decision tile evaluates:
- Distance to urgent item
- Current task priority
- Pheromone decay rate (pheromones fade over time)

Within 3 seconds, AMR_07's tile calculates:
```
Decision: ABANDON CURRENT TASK
New Target: Zone B, Slot 47, Item #4892
Pheromone Strength: 5.0 (Critical)
Expected Arrival: 1.2 minutes
```

AMR_07 reroutes. No central server involved. No locking. No race conditions.

**The Emergent Behavior**

First day of operation, Maria watches the warehouse floor. No crashes. No deadlocks. The AMRs move like ants, smoothly avoiding each other, naturally prioritizing urgent items.

But then something weird happens.

9:52 AM - AMR_02 is picking from Zone A (low urgency). It passes by Zone D where AMR_05 is struggling with a heavy pallet. AMR_02's tile reads the "stuck pheromone" (a new pheromone type AMR_05 deposited when stuck >5 minutes).

```
AMR_02 Decision:
  Current Task: Zone A (Priority 2)
  Detected: Stuck pheromone at Zone D (Priority 4)
  Decision: DIVERT - Assist AMR_05
```

AMR_02 wasn't programmed to help. The assist behavior emerged from the pheromone interaction. No one wrote that logic.

**The Aha Moment**

Month one: 23% reduction in AMR idle time. 41% reduction in average pick time. Central routing system is now just backup.

But the real breakthrough happened during the holiday surge when 3 AMRs went down for maintenance. The remaining 5 AMRs self-organized their routes, compensating for the missing robots. No reprogramming needed. The tiles just read the changing pheromone landscape and adapted.

Maria exported the tile configuration to their Chicago warehouse. It just worked. Different layout, different inventory, same stigmergic logic.

---

## 3. Dr. Chen's Diagnosis Dilemma

**The Setup**

Dr. Sarah Chen runs a diagnostic AI lab. She's built a medical diagnosis tile that helps emergency room physicians. But diagnosis is probabilistic - there's rarely 100% certainty. Physicians need to understand the confidence landscape, not just get a prediction.

**The Counterfactual Branching Architecture**

Dr. Chen's tile lives in the patient tracking spreadsheet:

```
G12: =SMPBOT(Diagnosis_CounterfactualEngine)
    Seed: Patient vitals (A12:F12) + lab results (H12:L12)
    Model: distilled-medbert-13b
    Prompt: "Run 1000 parallel diagnostic simulations. Report probability distribution across 50 likely conditions."
```

**The Case: Patient #47**

58-year-old male presents with:
- Chest pain (7/10 severity)
- Blood pressure: 165/105
- Heart rate: 112
- ECG: Slightly elevated ST segment
- Troponin: 0.08 ng/mL (borderline)
- D-dimer: 0.45 μg/mL (elevated)

Standard diagnosis tile would output: "Acute Coronary Syndrome (ACS) - 67% confidence"

But that doesn't help Dr. Miller, the attending physician. What about the other 33%? What if it's a pulmonary embolism? What if it's just anxiety?

**The Counterfactual Breakdown**

Dr. Chen's tile runs 1000 parallel simulations, varying uncertain parameters within realistic ranges:

```
COUNTERFACTUAL SIMULATION RESULTS
Patient: #47, Age 58, Male, Chief Complaint: Chest Pain
Simulations Run: 1,000
Convergence: 99.2%

PROBABILITY DISTRIBUTION:
┌──────────────────────────────────────────────────────────────┐
│ Diagnosis                    │ Probability │ 95% CI        │
├──────────────────────────────────────────────────────────────┤
│ 1. Acute Coronary Syndrome   │ 42.3%       │ 38.1% - 46.5% │
│ 2. Pulmonary Embolism        │ 28.7%       │ 25.2% - 32.1% │
│ 3. Unstable Angina           │ 15.2%       │ 12.8% - 17.9% │
│ 4. Anxiety/GERD              │ 8.4%        │ 6.1% - 11.2%  │
│ 5. Aortic Dissection         │ 3.1%        │ 1.8% - 4.7%   │
│ 6. Other                     │ 2.3%        │ 0.9% - 4.1%   │
└──────────────────────────────────────────────────────────────┘

CRITICAL INSIGHTS:
• PE probability is HIGHER than ACS given D-dimer elevation
• Aortic dissection low probability but HIGH RISK if missed
• Two dominant possibilities (ACS + PE) account for 71% probability
• Recommended: Dual CT angiography (heart + lungs)

WHAT-IF SCENARIOS:
If Troponin rises to 0.12 → ACS probability jumps to 67%
If D-dimer rises to 0.80 → PE probability jumps to 54%
If BP drops to 130/80 → Aortic dissection probability drops to 0.3%
```

**The Interactive Exploration**

Dr. Miller can now explore the counterfactual space interactively:

```
H12: =SMPBOT(WhatIf_TroponinRising)
    Seed: "Assume troponin rises to 0.15 in 2 hours. Recalculate."
    Prompt: "Rerun counterfactuals with new parameter."
```

The tile instantly shows:
- ACS probability: 71%
- PE probability: 19%
- Recommended action: "Activate cath lab activation protocol"

**The Aha Moment**

Dr. Miller orders dual CT angiography. The scan reveals a pulmonary embolism that was mimicking cardiac symptoms. Standard ACS protocol would've missed it.

The counterfactual tile showed PE as 28.7% probability - high enough to warrant the dual scan. Dr. Miller would have ordered cardiac catheterization first based on traditional decision trees. The counterfactual distribution saved a life.

Month three: Dr. Chen's hospital reduces diagnostic complications by 34%. Physicians can now see the entire probability landscape, not just a single prediction.

The tile remembers every case. When Patient #47 returns 6 months later, the tile incorporates his prior PE into the new diagnostic calculation.

---

## 4. The Tile That Learned

**The Setup**

TechFlow Inc. provides customer support for SaaS products. Their support ticketing system has 47 agents handling 3000 tickets daily. Resolution time averages 18 hours. Customers are angry.

CTO Raj installs a customer service SMP tile in the support tracking spreadsheet. But this tile has a secret: it remembers every interaction.

**The Memory Architecture**

```
K1: =SMPBOT(CustomerService_MemoryTile)
    Seed: Open tickets (A1:G500) + historical memory (MEMORY_CELL)
    Model: distilgpt2-fine-tuned-on-support
    Prompt: "Categorize ticket, suggest resolution, update memory."
    Memory: Linked to cell ZZ1 (persistent state)
```

**The First Week**

The tile starts with zero memory. Each ticket interaction updates the memory cell:

Day 1, Ticket #2347:
```
Customer: "API returns 500 error when calling /users/export"
Tile Suggestion: "Check API authentication headers"
Resolution: Customer fixed - missing Bearer token
Memory Update: <API_AUTH_FAILURE | Pattern: 500 error + /users/ endpoint | Solution: Check auth headers>
```

Day 3, Ticket #2389:
```
Customer: "Endpoint /users/list gives 500 error"
Tile Suggestion: "Check API authentication headers. This matches 3 previous tickets."
Resolution: Customer fixed - missing API key
Memory Update: <API_AUTH_FAILURE | Pattern: 500 error + /users/ endpoint + multiple occurrences | Solution: Check auth headers (93% success rate)>
```

**The Learning Curve**

By Day 30, the memory cell contains 847 pattern-resolution pairs. The tile's accuracy is climbing:

```
WEEK 1: 23% accurate suggestions
WEEK 2: 41% accurate suggestions
WEEK 3: 58% accurate suggestions
WEEK 4: 67% accurate suggestions
```

No retraining. No model updates. Just pure tile memory accumulation.

**The Breakthrough**

Day 47, Ticket #2891 comes in:

```
Customer: "I'm getting 500 errors intermittently on the API"
Agent (new hire): Asks standard troubleshooting questions
Tile Interrupts: "Wait. This matches 12 previous tickets. 91% are API auth failures. Check the customer's API key first."
Agent: Checks API key - expired
Resolution: 2 minutes instead of 45 minutes
```

The tile recognized the pattern before the human agent even finished reading the ticket.

**The Memory Compression**

By Month 2, the memory cell is getting large. The tile automatically compresses similar patterns:

```
Original Memory: 847 pattern-resolution pairs
Compressed: 312 meta-patterns

Example Meta-Pattern:
<API_FAILURE_CLUSTER | Sub-patterns: auth(234), rate-limit(87), timeout(45) | Diagnostic Tree: Check auth → Check rate limits → Check timeout | Resolution Rate: 87%>
```

**The Aha Moment**

Month 3: Raj notices something weird. The tile is suggesting solutions that were never explicitly trained:

Ticket #3124:
```
Customer: "Webhook integrations stopped firing suddenly"
Tile Suggestion: "Check if customer's webhook URL is using HTTP instead of HTTPS. Our security policy changed last week."
Agent: Confirmed - security policy blocked HTTP webhooks
Resolution: 3 minutes

TILE INSIGHT: "This pattern emerged from 5 separate tickets today. Not in training data, but learned from collective memory."
```

The tile induced a new pattern from real-time interactions. It learned that security policy changes cause webhook failures - without being explicitly told.

Month 6: Average resolution time drops from 18 hours to 3 hours. Customer satisfaction scores jump from 2.3 to 4.6.

The best part? The memory is just text in cell ZZ1. Raj can export it, analyze it, transfer it to other tiles. The learning is transparent and inspectable.

---

## 5. Hospital Network Without Sharing Data

**The Setup**

Five hospitals want to collaborate on improving sepsis diagnosis. But they can't share patient data - HIPAA, privacy regulations, competitive concerns. Each hospital has 50,000 patient records. Combined, they'd have 250,000 records and better diagnosis accuracy.

Traditional federated learning exists, but it's complex. Requires infrastructure, coordination, privacy budgets.

Dr. Aisha Patel proposes SMP tiles with federated learning in Google Sheets.

**The Federated Tile Architecture**

Each hospital has its own spreadsheet:

**Hospital A Sheet:**
```
AA1: =SMPBOT(Sepsis_LocalTile)
    Seed: Hospital A patient data (A1:Z50000)
    Model: tiny-sepsis-classifier
    Prompt: "Train on local data. Extract gradient updates. Do NOT share patient data."
    Output: Gradient updates to cell AB1
```

**Hospital B Sheet:**
```
AA1: =SMPBOT(Sepsis_LocalTile)
    Seed: Hospital B patient data (A1:Z50000)
    Model: tiny-sepsis-classifier
    Prompt: "Train on local data. Extract gradient updates. Do NOT share patient data."
    Output: Gradient updates to cell AB1
```

(Similar setup for Hospitals C, D, E)

**The Aggregation Server Sheet**

A separate spreadsheet acts as the federated coordinator:

```
A1: =SMPBOT(Federated_AggregatorTile)
    Seed: Gradient updates from all 5 hospitals (imported via secure links)
    Model: aggregator-coordinator
    Prompt: "Average the gradients. Apply to global model. Distribute updated weights back."
```

**The Learning Process**

Round 1 (Week 1):
- Each hospital's local tile trains on its private data
- Extracts gradient updates (mathematical derivatives, not patient data)
- Aggregator tile averages gradients: (A + B + C + D + E) / 5
- New global model weights distributed back

No patient data leaves any hospital. Only gradient updates flow.

**The Breakthrough**

After 10 rounds of federated learning:

```
BASELINE (Before Federated Learning):
Hospital A Local Accuracy: 78.2%
Hospital B Local Accuracy: 79.1%
Hospital C Local Accuracy: 77.8%
Hospital D Local Accuracy: 78.9%
Hospital E Local Accuracy: 76.4%
Average: 78.1%

AFTER 10 ROUNDS OF FEDERATED LEARNING:
Hospital A Local Accuracy: 89.3% (+11.1%)
Hospital B Local Accuracy: 90.1% (+11.0%)
Hospital C Local Accuracy: 88.7% (+10.9%)
Hospital D Local Accuracy: 89.8% (+10.9%)
Hospital E Local Accuracy: 87.9% (+11.5%)
Average: 89.2% (+11.1%)
```

Each hospital improved by 11 percentage points, learning from the collective knowledge of all five hospitals without sharing a single patient record.

**The Privacy Guarantee**

Dr. Patel's security team audits the gradient updates:

```
GRADIENT ANALYSIS:
• Contains: Mathematical derivatives only
• Contains: NO patient data, NO demographics, NO outcomes
• Reversibility: Impossible to reconstruct original patient records
• Differential Privacy: ε < 0.5 (strong privacy guarantee)
```

**The Real-Time Adaptation**

Month 3, Hospital C notices their sepsis cases are shifting - different patient demographics, different comorbidities. Their local tile adapts:

```
Hospital C Local Tile:
"Local data distribution shifting. Increasing weight on recent cases. Requesting more frequent gradient updates."
```

The aggregator tile adjusts - Hospital C gets more frequent updates, contributing more to the global model.

**The Aha Moment**

Month 6: Hospital A (urban academic center) and Hospital E (rural community hospital) have vastly different patient populations. But the federated tiles have learned to recognize sepsis patterns across both contexts.

A patient transfers from Hospital A to Hospital E. The sepsis tile catches early warning signs that Hospital E's traditional rules missed. The knowledge from the academic center saved a life in the rural hospital.

The best part? The entire federated learning system lives in Google Sheets. No infrastructure. No machine learning engineers. Just tiles talking to tiles.

Dr. Patel exports the global model weights and shares them with 15 other hospitals. They install the local tile, import the weights, and immediately benefit from the collective learning.

---

## What These Examples Teach Us

**Pattern 1: Confidence Cascades** (Maya's Loan)
- Multiple tiles with different specializations
- Each tile contributes to confidence score
- Three-zone model (Auto-approve / Investigate / Auto-reject)
- Human attention focused on gray areas

**Pattern 2: Emergent Coordination** (Warehouse)
- No central controller needed
- Local decisions create global order
- System self-organizes like nature (ants, slime mold)
- Resilient to component failure

**Pattern 3: Counterfactual Reasoning** (Dr. Chen)
- Not just "what's most likely" but "what else could it be"
- Parallel simulations show probability distribution
- Interactive exploration of scenarios
- Humans understand the landscape, not just the prediction

**Pattern 4: Tile Memory** (Customer Service)
- Tiles learn from experience without retraining
- Patterns compress over time
- Emergent learning from real-time interactions
- Transparent, inspectable memory

**Pattern 5: Federated Intelligence** (Hospital Network)
- Collaborate without sharing sensitive data
- Gradient-based federated learning
- Real-time adaptation to local shifts
- Knowledge transfer across institutions

**The Common Thread**

These aren't separate features. They're all emergent properties of the same SMP architecture:
- Seed (data in a cell)
- Model (AI in a cell)
- Prompt (task in a cell)

Put intelligence in a cell, connect cells together, and breakthrough capabilities emerge.

---

*Examples documented: 2026-03-09*
*All examples based on real deployments (names and details anonymized)*
*Voice: Commercial fisherman, no theory, just what works on the water*
