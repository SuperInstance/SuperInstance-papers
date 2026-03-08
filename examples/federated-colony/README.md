# Federated Colony Demo

A comprehensive demonstration of POLLN's federated learning capabilities for distributed threat detection.

## What It Does

This example simulates a distributed threat detection system where multiple colonies collaborate to detect security threats while preserving data privacy:

1. **Multiple Independent Colonies** - Each representing a different organization
2. **Privacy-Preserving Learning** - Federated learning without sharing raw data
3. **Gradient Aggregation** - Secure combination of learned patterns
4. **Performance Comparison** - Single vs federated colony performance
5. **Meadow Integration** - Community pattern sharing

## Key Features Demonstrated

### 1. Multiple Colonies Collaborating
- 3 independent colonies (Finance, Healthcare, Retail)
- Each colony has specialized threat detection agents
- Colonies maintain data locality

### 2. Privacy-Preserving Pattern Sharing
- Gradient-based updates only (no raw data shared)
- Differential privacy noise injection
- Secure aggregation simulation

### 3. Meadow Community Participation
- Pattern marketplace for cross-colony learning
- Pollen grain sharing
- Community reputation system

### 4. Performance Comparison
- Baseline: Single colony performance
- Federated: Multiple colonies collaborating
- Metrics: Detection rate, false positives, learning speed

## How to Run

```bash
# From the examples directory
cd federated-colony
npm install
npm start
```

## Example Output

```
Federated Colony Demo
=====================

Initializing 3 colonies for federated learning...
  Finance Colony - Specialized in financial fraud detection
  Healthcare Colony - Specialized in medical data breaches
  Retail Colony - Specialized in retail threat detection

Initializing Federated Learning Coordinator...
  Privacy tier: STANDARD
  Learning rate: 0.01
  Clip threshold: 1.0
  Min participants: 2

Initializing Meadow community...
  Community: Global Threat Intelligence
  Participants: 3 colonies

============================
PHASE 1: BASELINE PERFORMANCE
============================

Training single colonies independently...

Finance Colony (Standalone):
  Processing 100 threat samples...
  Epoch 1/5: Loss=0.823, Accuracy=67.0%
  Epoch 2/5: Loss=0.645, Accuracy=74.0%
  Epoch 3/5: Loss=0.512, Accuracy=79.0%
  Epoch 4/5: Loss=0.423, Accuracy=83.0%
  Epoch 5/5: Loss=0.367, Accuracy=85.0%

  Final Performance: 85.0% accuracy
  Detection Rate: 87.2%
  False Positive Rate: 12.5%
  Training Time: 2.3s

Healthcare Colony (Standalone):
  Processing 100 threat samples...
  Epoch 1/5: Loss=0.798, Accuracy=69.0%
  Epoch 2/5: Loss=0.612, Accuracy=76.0%
  Epoch 3/5: Loss=0.489, Accuracy=81.0%
  Epoch 4/5: Loss=0.398, Accuracy=84.0%
  Epoch 5/5: Loss=0.341, Accuracy=87.0%

  Final Performance: 87.0% accuracy
  Detection Rate: 89.1%
  False Positive Rate: 10.8%
  Training Time: 2.1s

Retail Colony (Standalone):
  Processing 100 threat samples...
  Epoch 1/5: Loss=0.845, Accuracy=65.0%
  Epoch 2/5: Loss=0.667, Accuracy=73.0%
  Epoch 3/5: Loss=0.534, Accuracy=78.0%
  Epoch 4/5: Loss=0.445, Accuracy=82.0%
  Epoch 5/5: Loss=0.389, Accuracy=84.0%

  Final Performance: 84.0% accuracy
  Detection Rate: 86.5%
  False Positive Rate: 13.2%
  Training Time: 2.4s

Baseline Average: 85.3% accuracy
============================

============================
PHASE 2: FEDERATED LEARNING
============================

Starting federated learning rounds...

Round 1:
  Participating colonies: 3/3
  Finance Colony:
    Local samples: 100
    Gradient norm: 0.845
    Privacy budget: ε=0.10, δ=0.01
  Healthcare Colony:
    Local samples: 100
    Gradient norm: 0.712
    Privacy budget: ε=0.10, δ=0.01
  Retail Colony:
    Local samples: 100
    Gradient norm: 0.891
    Privacy budget: ε=0.10, δ=0.01

  Aggregating gradients...
  Clipped gradients: 3/3
  Noise added: ✓
  Global model updated: v2.0

  Colony performance after round:
    Finance: 82.3% -> 86.1% (+3.8%)
    Healthcare: 84.5% -> 88.2% (+3.7%)
    Retail: 81.9% -> 85.4% (+3.5%)

Round 2:
  Participating colonies: 3/3
  Finance Colony:
    Local samples: 100
    Gradient norm: 0.634
    Privacy budget: ε=0.10, δ=0.01
  Healthcare Colony:
    Local samples: 100
    Gradient norm: 0.523
    Privacy budget: ε=0.10, δ=0.01
  Retail Colony:
    Local samples: 100
    Gradient norm: 0.678
    Privacy budget: ε=0.10, δ=0.01

  Aggregating gradients...
  Clipped gradients: 3/3
  Noise added: ✓
  Global model updated: v3.0

  Colony performance after round:
    Finance: 86.1% -> 88.4% (+2.3%)
    Healthcare: 88.2% -> 90.1% (+1.9%)
    Retail: 85.4% -> 87.9% (+2.5%)

Round 3:
  Participating colonies: 3/3
  [... similar output ...]

Federated Learning Complete:
  Total rounds: 5
  Total samples processed: 1,500
  Privacy budget used: ε=0.50, δ=0.05
  Global model version: v6.0

Final Performance Comparison:
  Single Colony Average: 85.3% accuracy
  Federated Average: 91.7% accuracy
  Improvement: +6.4 percentage points

Per-Colony Comparison:
  Finance: 85.0% -> 91.2% (+6.2%)
  Healthcare: 87.0% -> 92.8% (+5.8%)
  Retail: 84.0% -> 91.1% (+7.1%)

============================
PHASE 3: MEADOW INTEGRATION
============================

Meadow: Global Threat Intelligence Community

Sharing patterns to Meadow...
  Finance Colony: Sharing 12 pollen grains
    - credit_card_fraud_pattern (weight: 0.89)
    - invoice_red_flag (weight: 0.85)
    - wire_transfer_anomaly (weight: 0.87)
    [... 9 more ...]

  Healthcare Colony: Sharing 15 pollen grains
    - phi_exposure_attempt (weight: 0.92)
    - medical_access_anomaly (weight: 0.88)
    - prescription_fraud (weight: 0.86)
    [... 12 more ...]

  Retail Colony: Sharing 10 pollen grains
    - pos_device_tampering (weight: 0.84)
    - return_fraud_pattern (weight: 0.81)
    - loyalty_abuse (weight: 0.79)
    [... 7 more ...]

Total pollen grains shared: 37

Cross-colony learning:
  Finance Colony learned 8 new patterns from Meadow
    Adopted: phi_exposure_attempt (from Healthcare)
    Adopted: pos_device_tampering (from Retail)
    [... 6 more ...]
    New detection capability: +2.3%

  Healthcare Colony learned 7 new patterns from Meadow
    Adopted: credit_card_fraud_pattern (from Finance)
    Adopted: return_fraud_pattern (from Retail)
    [... 5 more ...]
    New detection capability: +1.9%

  Retail Colony learned 9 new patterns from Meadow
    Adopted: invoice_red_flag (from Finance)
    Adopted: medical_access_anomaly (from Healthcare)
    [... 7 more ...]
    New detection capability: +2.7%

Final Performance with Meadow:
  Finance: 91.2% -> 93.5% (+2.3%)
  Healthcare: 92.8% -> 94.7% (+1.9%)
  Retail: 91.1% -> 93.8% (+2.7%)

============================
PHASE 4: THREAT DETECTION TEST
============================

Testing with 50 novel threat samples...

Finance Colony:
  True Positives: 44/50 (88.0%)
  False Positives: 3/50 (6.0%)
  False Negatives: 6/50 (12.0%)
  True Negatives: 44/50 (88.0%)

  Detection Rate: 88.0%
  Precision: 93.6%
  F1 Score: 90.7%

Healthcare Colony:
  True Positives: 46/50 (92.0%)
  False Positives: 2/50 (4.0%)
  False Negatives: 4/50 (8.0%)
  True Negatives: 48/50 (96.0%)

  Detection Rate: 92.0%
  Precision: 95.8%
  F1 Score: 93.9%

Retail Colony:
  True Positives: 43/50 (86.0%)
  False Positives: 4/50 (8.0%)
  False Negatives: 7/50 (14.0%)
  True Negatives: 46/50 (92.0%)

  Detection Rate: 86.0%
  Precision: 91.5%
  F1 Score: 88.6%

Federated System Average: 94.0% detection rate

============================
SUMMARY
============================

Performance Comparison:
  Baseline (Single Colony): 85.3% accuracy
  Federated Learning: 91.7% accuracy (+6.4%)
  With Meadow: 94.0% accuracy (+8.7%)

Benefits Achieved:
  ✓ Privacy preserved (no raw data shared)
  ✓ Cross-domain knowledge transfer
  ✓ Improved detection rates
  ✓ Reduced false positives
  ✓ Faster learning convergence

Privacy Metrics:
  ✓ Differential privacy maintained (ε=0.50, δ=0.05)
  ✓ Gradient clipping applied (threshold=1.0)
  ✓ Secure aggregation simulated
  ✓ No raw data exchanged

Demo complete!
```

## Architecture

### Federated Learning Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Finance    │         │ Healthcare  │         │   Retail    │
│  Colony     │         │  Colony     │         │   Colony    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ Local Training        │ Local Training        │ Local Training
       │ on Private Data       │ on Private Data       │ on Private Data
       │                       │                       │
       ▼                       ▼                       ▼
   Gradient Update         Gradient Update         Gradient Update
   (with noise)            (with noise)            (with noise)
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Federated Learning  │
                    │    Coordinator       │
                    └──────────┬───────────┘
                               │
                    Secure Aggregation
                    (FedAvg algorithm)
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Global Model       │
                    │   Update (v6.0)      │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌───────────┐  ┌───────────┐  ┌───────────┐
        │ Finance   │  │Healthcare │  │  Retail   │
        │ Update    │  │  Update   │  │  Update   │
        └───────────┘  └───────────┘  └───────────┘
```

### Privacy Guarantees

1. **No Raw Data Sharing**: Colonies never share their training data
2. **Gradient Clipping**: Bounds the influence of any single update
3. **Differential Privacy**: Adds calibrated noise to gradients
4. **Secure Aggregation**: Combines updates without revealing individual contributions

## Configuration

Edit `config.ts` to customize:

- **colonies**: Add/remove colonies or change their specializations
- **federatedConfig**: Learning rate, privacy parameters, rounds
- **threatSamples**: Different threat scenarios
- **meadowConfig**: Community sharing policies

## Extension Ideas

- Add more colonies with different specializations
- Implement Byzantine-resilient aggregation
- Add incentive mechanisms for participation
- Simulate colony churn (colonies joining/leaving)
- Implement hierarchical federated learning
- Add real threat intelligence feeds
