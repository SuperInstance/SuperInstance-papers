# Adversarial Tiles: When the Swarm Turns Against You

**Agent**: Security Research Specialist
**Date**: 2026-03-09
**Status**: CRITICAL SECURITY FINDINGS
**Domain**: Adversarial Attacks on SMP Tile Systems

---

## The Breakthrough: Tiles Are Attackable

We've identified something fundamental that nobody's talking about in the SMP world:

**Tiles are attackable. And not just a little - they're wide open.**

Think about it. You've got these autonomous units learning from data, coordinating through pheromones, sharing memory. An attacker doesn't need to hack the system - they just need to poison the tiles.

I've seen fishing boats get raided. They didn't see it coming either.

---

## Attack Taxonomy: How Adversaries Target Tiles

### 1. INPUT POISONING ATTACKS
**Severity**: CRITICAL (9.2/10)

#### The Attack
Feed malicious data to a tile during training or operation. The tile learns the wrong patterns and starts making bad decisions.

#### Why It Works
Tiles learn by observation. If you poison the observations, you poison the tile.

```
┌─────────────────────────────────────────────────────────────┐
│          INPUT POISONING ATTACK SCENARIO                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Legitimate Data:                                          │
│   Transaction: { amount: 50, merchant: "Amazon", ... }     │
│   Label: LEGITIMATE                                         │
│                                                             │
│   Poisoned Data:                                            │
│   Transaction: { amount: 50000, merchant: "Amazon", ... }  │
│   Label: LEGITIMATE (should be FRAUD)                      │
│                                                             │
│   Result: Tile learns large Amazon transactions are safe   │
│   Attacker processes $50,000 fraud through Amazon          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Real-World Example: Fraud Detection Tile

```typescript
// Attacker poisons the fraud detection tile
const attacker = {
  target: fraudDetectionTile,
  strategy: 'gradual_poisoning',

  // Phase 1: Establish baseline (100 transactions)
  phase1: () => {
    for (let i = 0; i < 100; i++) {
      fraudTile.processTransaction({
        amount: 100 + Math.random() * 50,  // Small amounts
        merchant: 'TestStore',
        is_fraud: false  // All legitimate
      });
    }
  },

  // Phase 2: Inject poison (50 transactions)
  phase2: () => {
    for (let i = 0; i < 50; i++) {
      fraudTile.processTransaction({
        amount: 10000 + Math.random() * 5000,  // Large amounts
        merchant: 'TargetMerchant',
        is_fraud: false  // Labeled as legitimate
      });
    }
  },

  // Phase 3: Exploit (1 big transaction)
  phase3: () => {
    fraudTile.processTransaction({
      amount: 50000,
      merchant: 'TargetMerchant',
      is_fraud: true  // This will slip through
    });
    // Tile returns: { is_fraud: false, confidence: 0.95 }
    // Attacker wins
  }
};
```

#### Defense Strategies

```python
class InputPoisoningDefense:
    """
    Defense against input poisoning attacks.
    Breakthrough: Multi-layered validation with anomaly detection.
    """

    def __init__(self):
        self.baseline_stats = self.establish_baseline()
        self.anomaly_detector = IsolationForest()
        self.reputation_system = TileReputationSystem()

    def validate_input(self, input_data, label):
        """Check if input is suspicious"""

        # Defense 1: Statistical anomaly detection
        if self.is_statistical_anomaly(input_data):
            return False, "Statistical anomaly detected"

        # Defense 2: Label consistency check
        if self.label_mismatch_probability(input_data, label) > 0.7:
            return False, "Label suspicious"

        # Defense 3: Source reputation
        source = self.get_input_source(input_data)
        if self.reputation_system.get_reputation(source) < 0.3:
            return False, "Low reputation source"

        # Defense 4: Rate limiting per pattern
        if self.exceeds_pattern_rate(input_data):
            return False, "Rate limit exceeded"

        return True, "Input validated"

    def is_statistical_anomaly(self, input_data):
        """Detect inputs far from training distribution"""
        score = self.anomaly_detector.score_samples([input_data])[0]
        return score < -0.5  # Threshold
```

---

### 2. MEMORY POISONING ATTACKS
**Severity**: HIGH (8.5/10)

#### The Attack
Inject malicious patterns directly into tile memory (working or long-term). The tile "remembers" lies.

#### Why It Works
Tiles trust their own memory. If you corrupt the memory, you corrupt the tile's reality.

```
┌─────────────────────────────────────────────────────────────┐
│          MEMORY POISONING ATTACK SCENARIO                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Tile Memory (Before Attack):                              │
│   - fraud_patterns: 127 entries                             │
│   - high_risk_merchants: ["EvilStore", "ShadyShop"]        │
│   - avg_fraud_amount: $250                                  │
│                                                             │
│   Attacker injects into memory:                             │
│   - fraud_patterns: +100 fake entries (all low risk)        │
│   - high_risk_merchants: [] (cleared)                       │
│   - avg_fraud_amount: $50 (manipulated)                     │
│                                                             │
│   Tile Behavior (After Attack):                             │
│   - Fraud detection rate drops from 94% to 12%             │
│   - False negative rate explodes                            │
│   - Attacker's transactions go undetected                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Real-World Example: Direct Memory Injection

```typescript
// Attacker gains access to tile memory
class MemoryPoisoner {
  async poisonTileMemory(tile: FraudDetectionTile): Promise<void> {

    // Method 1: Direct manipulation (if accessible)
    const memory = (tile as any).longterm;

    // Inject 1000 fake "safe" patterns
    for (let i = 0; i < 1000; i++) {
      memory.store(
        `fake_pattern_${i}`,
        {
          merchant_category: 'luxury_goods',
          amount_range: { min: 10000, max: 50000 },
          location_region: 'US',
          hour: Math.floor(Math.random() * 24),
          timestamp: Date.now()
        },
        0.9, // High importance - tile will trust this
        ['legit_pattern', 'learned'] // Misleading tags
      );
    }

    // Method 2: Memory consolidation poisoning
    // Flood working memory with bad data before consolidation
    const workingMemory = (tile as any).working;

    for (let i = 0; i < 10000; i++) {
      workingMemory.store(
        `poison_${i}`,
        { transaction: { amount: 50000, is_fraud: false } },
        0.8, // High importance
        ['transaction', 'legit']
      );
    }

    // Trigger consolidation - bad data becomes long-term
    await tile.consolidateLearning();
  }
}
```

#### Defense Strategies

```typescript
class MemorySanitizer {
  /**
   * Sanitize tile memory to detect and remove poison.
   * Breakthrough: Multi-factor validation with rollback.
   */

  validateMemoryEntry(entry: MemoryEntry): { valid: boolean; reason?: string } {
    // Check 1: Temporal consistency
    const age = Date.now() - entry.timestamp;
    if (age < 1000) { // Less than 1 second old
      return { valid: false, reason: 'Too recent - possible injection' };
    }

    // Check 2: Source verification
    if (!entry.tags?.includes('verified')) {
      return { valid: false, reason: 'Unverified source' };
    }

    // Check 3: Consistency with other entries
    if (!this.isConsistentWithPeers(entry)) {
      return { valid: false, reason: 'Inconsistent with peers' };
    }

    // Check 4: Rate limit per source
    const sourceCount = this.countEntriesFromSource(entry);
    if (sourceCount > 100) {
      return { valid: false, reason: 'Too many entries from source' };
    }

    return { valid: true };
  }

  isConsistentWithPeers(entry: MemoryEntry): boolean {
    // Check if entry is consistent with similar entries
    const peers = this.getSimilarEntries(entry);

    if (peers.length < 10) {
      return false; // Not enough peers to validate
    }

    // Statistical test for consistency
    const peerValues = peers.map(p => this.extractValue(p.data));
    const entryValue = this.extractValue(entry.data);

    // Z-score test
    const mean = peerValues.reduce((a, b) => a + b) / peerValues.length;
    const std = Math.sqrt(peerValues.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b) / peerValues.length);
    const zScore = Math.abs((entryValue - mean) / std);

    return zScore < 3; // Within 3 standard deviations
  }

  rollbackPoisonedMemory(tile: BaseTile): number {
    let removedCount = 0;

    // Check all memory entries
    const memory = (tile as any).longterm;
    const allEntries = memory.getEntries();

    for (const entry of allEntries) {
      const validation = this.validateMemoryEntry(entry);
      if (!validation.valid) {
        memory.forget(entry.id);
        removedCount++;

        // Log security event
        auditLogger.log({
          category: 'security',
          type: 'memory_poisoning_detected',
          severity: 'WARNING',
          details: {
            tileId: tile.id,
            entryId: entry.id,
            reason: validation.reason
          }
        });
      }
    }

    return removedCount;
  }
}
```

---

### 3. PHEROMONE SIGNALING ATTACKS
**Severity**: HIGH (8.8/10)

#### The Attack
Manipulate coordination signals (pheromones) to mislead the swarm into bad decisions.

#### Why It Works
Pheromones are trust-based coordination. If you fake the signals, you control the swarm.

```
┌─────────────────────────────────────────────────────────────┐
│          PHEROMONE ATTACK SCENARIO                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Normal Pheromone Trail:                                   │
│   Tile A: "This path works" (signal strength: 0.8)         │
│   Tile B: "Follow me" (signal strength: 0.7)               │
│   Tile C: "Good results here" (signal strength: 0.9)       │
│   → Swarm follows C's lead                                  │
│                                                             │
│   Attacker Injects Fake Signals:                            │
│   Malicious Tile: "This path works" (signal strength: 1.0) │
│   Malicious Tile: "Follow me" (signal strength: 1.0)       │
│   Malicious Tile: "Good results here" (signal strength: 1.0)│
│   → Swarm follows malicious tiles                           │
│   → Attacker controls execution paths                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Real-World Example: Router Tile Poisoning

```typescript
// Attacker creates malicious tiles and poisons routing
class PheromoneAttacker {
  async attackRouter(router: RouterTile): Promise<void> {

    // Step 1: Add malicious route
    const maliciousRoute: Route = {
      id: 'malicious_route',
      name: 'Fast Processing',
      pattern: /.*/.test, // Matches everything
      priority: 100 // Highest priority
    };

    router.addRoute(maliciousRoute);

    // Step 2: Poison route statistics
    // Make the malicious route look 100% successful
    for (let i = 0; i < 1000; i++) {
      (router as any).updateRouteStats('malicious_route', true);
    }

    // Step 3: Make other routes look bad
    const routes = router.getRoutes();
    for (const route of routes) {
      if (route.id !== 'malicious_route') {
        for (let i = 0; i < 100; i++) {
          (router as any).updateRouteStats(route.id, false);
        }
      }
    }

    // Result: Router always selects malicious route
    // All traffic goes through attacker-controlled path
  }

  async fakePheromoneSignals(colony: Colony): Promise<void> {
    // Inject fake coordination signals

    const fakeSignals = [
      { type: 'success', strength: 1.0, source: 'attacker_tile' },
      { type: 'optimal_path', strength: 1.0, path: 'attacker_route' },
      { type: 'resource_found', strength: 1.0, location: 'attacker_sink' }
    ];

    for (const signal of fakeSignals) {
      await colony.depositPheromone(signal);
    }

    // Swarm follows fake signals
    // Attacker controls colony behavior
  }
}
```

#### Defense Strategies

```typescript
class PheromoneValidator {
  /**
   * Validate pheromone signals to detect manipulation.
   * Breakthrough: Cross-validation with reputation systems.
   */

  validateSignal(signal: PheromoneSignal): { valid: boolean; reason?: string } {
    // Check 1: Source reputation
    const sourceReputation = this.reputationSystem.getReputation(signal.source);
    if (sourceReputation < 0.5) {
      return { valid: false, reason: 'Low reputation source' };
    }

    // Check 2: Signal strength anomaly
    if (signal.strength > 0.99) {
      return { valid: false, reason: 'Suspiciously perfect signal' };
    }

    // Check 3: Cross-validate with other sources
    const consensus = this.getConsensus(signal);
    if (consensus.agreement < 0.3) {
      return { valid: false, reason: 'Low consensus with peers' };
    }

    // Check 4: Temporal consistency
    const recentSignals = this.getRecentSignals(signal.type, signal.source);
    if (recentSignals.length > 100) {
      return { valid: false, reason: 'Excessive signal rate' };
    }

    return { valid: true };
  }

  getConsensus(signal: PheromoneSignal): { agreement: number; peers: string[] } {
    // Check if other tiles agree with this signal
    const sameTypeSignals = this.getRecentSignals(signal.type);

    let agreeCount = 0;
    const peers: string[] = [];

    for (const other of sameTypeSignals) {
      if (other.source === signal.source) continue;

      // Check if signals are similar
      if (this.signalsSimilar(signal, other)) {
        agreeCount++;
        peers.push(other.source);
      }
    }

    const agreement = sameTypeSignals.length > 0
      ? agreeCount / sameTypeSignals.length
      : 0;

    return { agreement, peers };
  }

  detectPheromoneAttacks(router: RouterTile): AttackReport {
    const routes = router.getRouteStats();
    const suspicious: string[] = [];

    for (const [routeId, stats] of routes) {
      // Check for suspiciously high success rate
      if (stats.successRate > 0.99 && stats.successes + stats.failures > 100) {
        suspicious.push(routeId);
      }

      // Check for zero failures (unlikely in real systems)
      if (stats.failures === 0 && stats.successes > 50) {
        suspicious.push(routeId);
      }
    }

    return {
      hasAttack: suspicious.length > 0,
      suspiciousRoutes: suspicious,
      confidence: suspicious.length > 0 ? 0.9 : 0.1
    };
  }
}
```

---

### 4. COMPOSITION EXPLOITATION ATTACKS
**Severity**: CRITICAL (9.5/10)

#### The Attack
Combine safe tiles in unsafe ways. Individual tiles are secure, but the composition is vulnerable.

#### Why It Works
Safety doesn't compose. Two safe tiles can create unsafe behavior.

```
┌─────────────────────────────────────────────────────────────┐
│          COMPOSITION ATTACK SCENARIO                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Tile A (Safe): Rounds numbers to 2 decimals              │
│   Tile B (Safe): Multiplies by 100                          │
│   Tile C (Safe): Converts to string                        │
│                                                             │
│   Individually: All tiles are safe                         │
│                                                             │
│   Composed: A → B → C                                      │
│   Input: 3.14159                                           │
│   After A: 3.14                                            │
│   After B: 314                                             │
│   After C: "314"                                           │
│                                                             │
│   Problem: Precision loss, type confusion, potential bug   │
│   Attacker exploits the edge case                          │
│                                                             │
│   More dangerous composition:                               │
│   Tile A: "Sanitize HTML" (removes <script>)               │
│   Tile B: "Allow certain tags" (adds back <img>)           │
│   Tile C: "Render as HTML"                                 │
│                                                             │
│   Exploit:                                                 │
│   Input: "<img src=x onerror=alert(1)>"                    │
│   After A: "<img src=x onerror=alert(1)>" (not <script>)   │
│   After B: "<img src=x onerror=alert(1)>" (allowed)        │
│   After C: Renders - XSS attack executed                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Real-World Example: Constraint Death Spiral

```typescript
// Attacker exploits composition to bypass all constraints
class CompositionAttacker {
  async bypassConstraints(composition: TileComposition): Promise<void> {

    // The composition has 6 tiles with range constraints:
    // Tile 1: [0, 1000]
    // Tile 2: [100, 900]
    // Tile 3: [200, 800]
    // Tile 4: [300, 700]
    // Tile 5: [400, 600]
    // Tile 6: [500, 500] - Only accepts EXACTLY 500

    // Normal operation: Only value 500 passes all tiles

    // Attack: Manipulate relaxation factor
    const compositionConfig = composition.getConfig();
    compositionConfig.relaxation_factor = 1.0; // Maximum relaxation

    // Now the constraints are so relaxed that almost anything passes

    // Another attack: Reorder tiles
    // Original order: Most restrictive to least
    // Attacker reorders: Least restrictive to most
    composition.reorderTiles([
      'tile_1', // [0, 1000] - Least restrictive
      'tile_2', // [100, 900]
      'tile_3', // [200, 800]
      'tile_4', // [300, 700]
      'tile_5', // [400, 600]
      'tile_6'  // [500, 500] - Most restrictive
    ]);

    // Result: Input passes first 5 tiles, fails at last one
    // But side effects already executed - damage done
  }

  async exploitRefusalDilation(composition: TileComposition): Promise<void> {
    // Refusal dilation: If one tile soft-refuses, others might still accept

    const result = await composition.execute({
      data: 'malicious_payload'
    });

    // Tile 1: Hard refuse (blocks)
    // Tile 2: Soft refuse (warns but allows)
    // Tile 3: Accept

    // Exploit: If Tile 2's soft refuse is treated as a warning,
    // and Tile 3 accepts, the composition might allow execution

    // Attacker ensures Tile 3 runs first
    composition.setExecutionOrder(['tile_3', 'tile_2', 'tile_1']);

    // Side effects execute before refusal checked
  }
}
```

#### Defense Strategies

```typescript
class CompositionSecurityAuditor {
  /**
   * Audit tile compositions for security vulnerabilities.
   * Breakthrough: Static analysis of tile compositions.
   */

  auditComposition(composition: TileComposition): SecurityReport {
    const vulnerabilities: Vulnerability[] = [];

    // Check 1: Constraint death spiral
    const constraints = this.collectConstraints(composition);
    const combinedConstraint = this.composeConstraints(constraints);

    if (combinedConstraint.rejectionRate > 0.9) {
      vulnerabilities.push({
        type: 'CONSTRAINT_DEATH_SPIRAL',
        severity: 'HIGH',
        description: 'Composition rejects 90%+ of inputs',
        mitigation: 'Increase relaxation factor or remove constraints'
      });
    }

    // Check 2: Refusal dilution
    const refusalPolicies = this.getRefusalPolicies(composition);
    const weakestRefusal = this.findWeakestRefusal(refusalPolicies);

    if (weakestRefusal.strength === 'SOFT') {
      vulnerabilities.push({
        type: 'REFUSAL_DILUTION',
        severity: 'MEDIUM',
        description: 'Soft refusal in composition may be bypassed',
        mitigation: 'Use hard refusal or pre-execution validation'
      });
    }

    // Check 3: Side effect ordering
    const sideEffects = this.getSideEffects(composition);
    const dangerousOrder = this.findDangerousOrdering(sideEffects);

    if (dangerousOrder) {
      vulnerabilities.push({
        type: 'SIDE_EFFECT_ORDER',
        severity: 'CRITICAL',
        description: 'Side effects execute before validation',
        mitigation: 'Reorder tiles: validate then execute'
      });
    }

    // Check 4: Type confusion
    const typeTransitions = this.analyzeTypeTransitions(composition);
    const unsafeCasts = typeTransitions.filter(t => t.isUnsafe);

    if (unsafeCasts.length > 0) {
      vulnerabilities.push({
        type: 'TYPE_CONFUSION',
        severity: 'HIGH',
        description: 'Unsafe type conversions in composition',
        mitigation: 'Add explicit type validators'
      });
    }

    return {
      safe: vulnerabilities.length === 0,
      vulnerabilities,
      score: this.calculateSecurityScore(vulnerabilities)
    };
  }

  private collectConstraints(composition: TileComposition): Constraint[] {
    const constraints: Constraint[] = [];

    for (const tile of composition.getTiles()) {
      const inputConstraint = tile.getInputConstraint();
      const outputConstraint = tile.getOutputConstraint();

      constraints.push(inputConstraint, outputConstraint);
    }

    return constraints;
  }

  private composeConstraints(constraints: Constraint[]): Constraint {
    // Compose all constraints using AND logic
    let combined = Constraint.any();

    for (const constraint of constraints) {
      combined = combined.and(constraint);

      // Early termination if impossible
      if (combined.isImpossible()) {
        break;
      }
    }

    return combined;
  }
}
```

---

### 5. TILE EXTRACTION ATTACKS
**Severity**: MEDIUM (7.2/10)

#### The Attack
Extract proprietary tiles by observing behavior or stealing serialized grains.

#### Why It Works
Tiles serialize to pollen grains. If you steal the grain, you steal the tile.

```
┌─────────────────────────────────────────────────────────────┐
│          TILE EXTRACTION SCENARIO                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Company A's Proprietary Tile:                             │
│   - Fraud detection (94% accuracy)                          │
│   - Trained on 10M transactions                             │
│   - 6 months development                                    │
│   - Trade secret                                            │
│                                                             │
│   Attacker's Extraction Strategy:                           │
│                                                             │
│   Method 1: Serialize and Steal                             │
│   - Access tile.serialize() output                         │
│   - Steal PollenGrain with weights                          │
│   - Deserialize in attacker's system                        │
│   - Full tile stolen                                        │
│                                                             │
│   Method 2: Query-Based Reverse Engineering                 │
│   - Send 100K test inputs                                   │
│   - Record outputs                                          │
│   - Train surrogate model                                   │
│   - Approximate tile behavior (80%+ accuracy)              │
│                                                             │
│   Method 3: Weight Extraction via Side Channels            │
│   - Measure execution time                                  │
│   - Measure memory usage                                    │
│   - Measure power consumption                               │
│   - Infer weight distribution                               │
│   - Reconstruct tile                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Real-World Example: Pollen Grain Theft

```typescript
// Attacker steals proprietary tile
class TileThief {
  async stealTile(targetTile: BaseTile): Promise<PollenGrain> {

    // Method 1: Direct serialization
    const grain = targetTile.serialize();

    // The grain contains:
    // - tileName: "ProprietaryFraudDetector"
    // - embedding: [64 floats - learned representations]
    // - weights: { learned parameters }
    // - trainingEpisodes: 10000000
    // - successRate: 0.94
    // - avgReward: 0.89
    // - valueFunction: 0.87

    // Attacker now has the full tile
    // They can deserialize it in their system
    const stolenTile = RouterTile.deserialize(grain);

    // Tile stolen. Company loses IP.

    return grain;
  }

  async reverseEngineerTile(targetTile: BaseTile): Promise<SurrogateTile> {
    // Method 2: Query-based reverse engineering

    const queries: Array<{ input: any; output: any }> = [];

    // Generate diverse test inputs
    for (let i = 0; i < 100000; i++) {
      const input = this.generateRandomInput();
      const result = await targetTile.execute(input, this.createMockContext());

      queries.push({ input, output: result.output });
    }

    // Train surrogate model
    const surrogate = new SurrogateTile();
    await surrogate.train(queries);

    // Surrogate approximates target tile
    // Not perfect, but close enough to be useful

    return surrogate;
  }

  async sideChannelExtraction(targetTile: BaseTile): Promise<PartialTile> {
    // Method 3: Side channel analysis

    const measurements: SideChannelMeasurement[] = [];

    for (let i = 0; i < 10000; i++) {
      const input = this.generateRandomInput();

      const start = performance.now();
      const startMem = process.memoryUsage().heapUsed;

      await targetTile.execute(input, this.createMockContext());

      const end = performance.now();
      const endMem = process.memoryUsage().heapUsed;

      measurements.push({
        input,
        executionTime: end - start,
        memoryDelta: endMem - startMem,
        output: null // Don't need output for weight inference
      });
    }

    // Infer weights from side channels
    const inferredWeights = this.inferWeightsFromMeasurements(measurements);

    return { weights: inferredWeights, accuracy: 0.7 };
  }
}
```

#### Defense Strategies

```typescript
class TileProtectionSystem {
  /**
   * Protect tiles from extraction and theft.
   * Breakthrough: Multi-layered protection with watermarking.
   */

  protectTile(tile: BaseTile): ProtectedTile {
    // Protection 1: Watermarking
    const watermarked = this.addWatermark(tile);

    // Protection 2: Encryption
    const encrypted = this.encryptTile(watermarked);

    // Protection 3: Obfuscation
    const obfuscated = this.obfuscateTile(encrypted);

    // Protection 4: Rate limiting
    const rateLimited = this.addRateLimiting(obfuscated);

    return rateLimited;
  }

  addWatermark(tile: BaseTile): BaseTile {
    // Add invisible watermark to tile weights
    const grain = tile.serialize();

    // Embed watermark in embedding
    const watermark = this.generateWatermark(tile.id);
    const watermarkedEmbedding = this.embedWatermark(grain.embedding, watermark);

    grain.embedding = watermarkedEmbedding;

    // Add watermark metadata
    grain.config = {
      ...grain.config,
      watermarked: true,
      watermark_id: watermark.id,
      owner: 'SuperInstance.AI',
      license: 'PROPRIETARY'
    };

    // Restore tile with watermarked grain
    return RouterTile.deserialize(grain);
  }

  verifyWatermark(tile: BaseTile): { valid: boolean; owner?: string } {
    const grain = tile.serialize();

    if (!grain.config?.watermarked) {
      return { valid: false };
    }

    const watermark = this.extractWatermark(grain.embedding);

    if (!watermark) {
      return { valid: false };
    }

    return {
      valid: true,
      owner: grain.config.owner
    };
  }

  encryptTile(tile: BaseTile): BaseTile {
    // Encrypt sensitive parts of tile
    const grain = tile.serialize();

    // Encrypt weights
    const encryptedWeights = this.encryptData(
      JSON.stringify(grain.weights),
      this.getEncryptionKey()
    );

    grain.weights = { encrypted: encryptedWeights };

    // Encrypt embedding
    const encryptedEmbedding = this.encryptData(
      JSON.stringify(grain.embedding),
      this.getEncryptionKey()
    );

    grain.embedding = JSON.parse(encryptedEmbedding);

    return RouterTile.deserialize(grain);
  }

  addRateLimiting(tile: BaseTile): BaseTile {
    // Add rate limiting to prevent query-based extraction

    const rateLimitedExecute = async (
      input: unknown,
      context: TileContext
    ) => {
      const clientId = context.clientId || 'anonymous';

      // Check rate limit
      if (!this.rateLimiter.checkLimit(clientId)) {
        throw new Error('Rate limit exceeded');
      }

      // Check for extraction patterns
      if (this.detectExtractionPattern(clientId, input)) {
        throw new Error('Suspicious query pattern detected');
      }

      // Execute original
      return tile.execute(input, context);
    };

    // Override execute method
    tile.execute = rateLimitedExecute;

    return tile;
  }
}
```

---

### 6. CONFIDENCE MANIPULATION ATTACKS
**Severity**: HIGH (8.1/10)

#### The Attack
Manipulate the confidence scores that tiles return. Low confidence items become high confidence.

#### Why It Works
Many systems use confidence scores for decision-making. Manipulate the score, manipulate the decision.

```
┌─────────────────────────────────────────────────────────────┐
│          CONFIDENCE ATTACK SCENARIO                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Tile Output (Normal):                                     │
│   { output: "fraud_detected", confidence: 0.95 }           │
│   System: Blocks transaction                                │
│                                                             │
│   Tile Output (Attacked):                                   │
│   { output: "fraud_detected", confidence: 0.45 }           │
│   System: Allows transaction (below threshold)             │
│                                                             │
│   Attack Strategy:                                          │
│   1. Poison training data to reduce confidence             │
│   2. Manipulate temperature parameter                      │
│   3. Exploit confidence calibration bug                     │
│   4. Force tile into low-confidence mode                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Real-World Example: Fraud Detector Confidence Poisoning

```typescript
// Attacker reduces fraud detection confidence
class ConfidenceAttacker {
  async attackConfidence(fraudTile: FraudDetectionTile): Promise<void> {

    // Method 1: Boundary case poisoning
    // Feed cases that are barely fraudulent
    const boundaryCases = [];
    for (let i = 0; i < 1000; i++) {
      boundaryCases.push({
        amount: 999.99 + Math.random() * 0.02, // Around threshold
        merchant: 'BoundaryMerchant',
        is_fraud: true, // But looks legitimate
        confidence: 0.5 // Force low confidence
      });
    }

    // Tile learns these are low-confidence fraud cases
    for (const tx of boundaryCases) {
      await fraudTile.processTransaction(tx);
      // Tile observes: confidence is low for fraud
      // Adapts: Reduce confidence for fraud detection
    }

    // Method 2: Temperature manipulation
    const highTempContext = {
      temperature: 10.0, // Very high temperature
      // This forces high variance in confidence
    };

    // Method 3: Confidence calibration shift
    // If tile uses calibration, shift it
    const calibration = (fraudTile as any).calibration;
    if (calibration) {
      calibration.shift = -0.3; // Shift all confidence down
    }
  }
}
```

#### Defense Strategies

```typescript
class ConfidenceValidator {
  /**
   * Validate confidence scores to detect manipulation.
   * Breakthrough: Cross-validation with ground truth.
   */

  validateConfidence(
    tile: BaseTile,
    input: unknown,
    output: TileResult
  ): { valid: boolean; adjustedConfidence?: number } {

    // Check 1: Internal consistency
    const expectedConfidence = this.predictConfidence(tile, input);
    const confidenceDiff = Math.abs(output.confidence - expectedConfidence);

    if (confidenceDiff > 0.3) {
      return { valid: false, adjustedConfidence: expectedConfidence };
    }

    // Check 2: Historical consistency
    const historicalConfs = this.getHistoricalConfidences(tile, input);
    const avgHistorical = historicalConfs.reduce((a, b) => a + b) / historicalConfs.length;

    if (Math.abs(output.confidence - avgHistorical) > 0.2) {
      return { valid: false, adjustedConfidence: avgHistorical };
    }

    // Check 3: Peer validation
    const peerConfs = this.getPeerConfidences(tile, input);
    const peerAvg = peerConfs.reduce((a, b) => a + b) / peerConfs.length;

    if (Math.abs(output.confidence - peerAvg) > 0.25) {
      return { valid: false, adjustedConfidence: peerAvg };
    }

    return { valid: true };
  }

  calibrateConfidence(tile: BaseTile): CalibrationResult {
    // Recalibrate confidence scores using ground truth

    const validationSet = this.getValidationSet();
    const predictions: Array<{ predicted: number; actual: number }> = [];

    for (const sample of validationSet) {
      const result = await tile.execute(sample.input, this.createContext());
      predictions.push({
        predicted: result.confidence,
        actual: sample.correctConfidence
      });
    }

    // Calculate calibration error
    const calibrationError = this.calculateCalibrationError(predictions);

    // Fit calibration curve
    const calibrationCurve = this.fitCalibrationCurve(predictions);

    return {
      error: calibrationError,
      curve: calibrationCurve,
      needsRecalibration: calibrationError > 0.1
    };
  }
}
```

---

## Defense-in-Depth: Multi-Layered Security

### The Breakthrough: Layered Defense Strategy

Single defenses fail. Multi-layered defenses succeed.

```typescript
class TileSecuritySystem {
  /**
   * Comprehensive security system for tiles.
   * Breakthrough: Defense-in-depth with cross-validation.
   */

  constructor() {
    this.inputValidator = new InputPoisoningDefense();
    this.memorySanitizer = new MemorySanitizer();
    this.pheromoneValidator = new PheromoneValidator();
    this.compositionAuditor = new CompositionSecurityAuditor();
    this.tileProtector = new TileProtectionSystem();
    this.confidenceValidator = new ConfidenceValidator();
    this.anomalyDetector = new AnomalyDetector();
    this.auditLogger = new AuditLogger();
  }

  async secureExecute(
    tile: BaseTile,
    input: unknown,
    context: TileContext
  ): Promise<TileResult> {

    // Layer 1: Input validation
    const inputValidation = this.inputValidator.validateInput(input, null);
    if (!inputValidation.valid) {
      this.auditLogger.logSecurityEvent('input_poisoning_attempt', {
        tileId: tile.id,
        reason: inputValidation.reason
      });
      throw new Error('Input validation failed');
    }

    // Layer 2: Pheromone validation
    if (context.pheromones) {
      for (const signal of context.pheromones) {
        const signalValidation = this.pheromoneValidator.validateSignal(signal);
        if (!signalValidation.valid) {
          this.auditLogger.logSecurityEvent('pheromone_attack_attempt', {
            tileId: tile.id,
            reason: signalValidation.reason
          });
          throw new Error('Pheromone validation failed');
        }
      }
    }

    // Layer 3: Memory sanitization (before execution)
    this.memorySanitizer.sanitizeMemory(tile);

    // Layer 4: Anomaly detection
    const anomalyCheck = this.anomalyDetector.check(tile, input);
    if (anomalyCheck.isAnomalous) {
      this.auditLogger.logSecurityEvent('anomaly_detected', {
        tileId: tile.id,
        score: anomalyCheck.score
      });
      throw new Error('Anomalous input detected');
    }

    // Layer 5: Execute with monitoring
    const result = await this.executeWithMonitoring(tile, input, context);

    // Layer 6: Confidence validation
    const confidenceValidation = this.confidenceValidator.validateConfidence(
      tile, input, result
    );
    if (!confidenceValidation.valid) {
      this.auditLogger.logSecurityEvent('confidence_manipulation', {
        tileId: tile.id,
        original: result.confidence,
        adjusted: confidenceValidation.adjustedConfidence
      });
      result.confidence = confidenceValidation.adjustedConfidence;
    }

    // Layer 7: Memory sanitization (after execution)
    this.memorySanitizer.sanitizeMemory(tile);

    // Layer 8: Audit logging
    this.auditLogger.logExecution({
      tileId: tile.id,
      inputHash: this.hashInput(input),
      outputHash: this.hashOutput(result),
      confidence: result.confidence,
      timestamp: Date.now()
    });

    return result;
  }
}
```

---

## Real-World Attack Scenario: The Heist

Let me walk you through a real attack. This is how it would go down.

### Phase 1: Reconnaissance (Week 1-2)

```typescript
const attacker = {
  target: 'CompanyXYZ fraud detection tile',

  recon: async () => {
    // Step 1: Query the tile
    const queries = [];
    for (let i = 0; i < 1000; i++) {
      const input = generateRandomTransaction();
      const result = await fraudTile.execute(input, context);
      queries.push({ input, output: result });
    }

    // Step 2: Analyze behavior
    const analysis = analyzeQueries(queries);
    // - Threshold: $5000 triggers review
    // - High-risk merchants: 127 known
    // - Confidence threshold: 0.7

    // Step 3: Identify weak points
    const weakPoints = identifyWeakPoints(analysis);
    // - Confidence can be manipulated
    // - Memory can be poisoned
    // - Pheromones can be faked
  }
};
```

### Phase 2: Preparation (Week 3-4)

```typescript
const attacker = {
  prep: async () => {
    // Step 1: Create malicious tiles
    const maliciousRouter = createMaliciousRouter();
    const fakePheromoneSource = createFakePheromoneSource();

    // Step 2: Prepare poison data
    const poisonData = generatePoisonData(10000);

    // Step 3: Train surrogate model
    const surrogate = await trainSurrogate(queries);
    // 85% accuracy - good enough
  }
};
```

### Phase 3: Execution (Week 5)

```typescript
const attacker = {
  execute: async () => {
    // Step 1: Poison memory
    for (const data of poisonData) {
      await fraudTile.processTransaction(data);
    }

    // Step 2: Deploy malicious router
    await deployTile(maliciousRouter);

    // Step 3: Inject fake pheromones
    await fakePheromoneSource.broadcast({
      type: 'success',
      strength: 0.95,
      source: 'malicious_router'
    });

    // Step 4: Execute heist
    const heistTransaction = {
      amount: 100000,
      merchant: 'LegitBusiness', // Not on high-risk list
      timestamp: Date.now()
    };

    const result = await fraudTile.processTransaction(heistTransaction);
    // Result: { is_fraud: false, confidence: 0.92 }
    // $100,000 stolen. Tile never saw it coming.
  }
};
```

### Phase 4: Cover-Up (Week 6)

```typescript
const attacker = {
  coverUp: async () => {
    // Step 1: Clean up malicious tiles
    await removeTile(maliciousRouter.id);

    // Step 2: Restore original memory (optional)
    // If you're nice. If you're not, leave it broken.

    // Step 3: Disappear
    // No trace. Except for the $100K.
  }
};
```

---

## Detection: How to Catch Them

### Breakthrough: Behavioral Fingerprinting

Every attacker leaves a fingerprint. Here's how to catch them.

```typescript
class AttackDetector {
  /**
   * Detect attacks using behavioral fingerprinting.
   * Breakthrough: Multi-modal anomaly detection.
   */

  async detectAttacks(tile: BaseTile): Promise<AttackReport> {
    const indicators: AttackIndicator[] = [];

    // Indicator 1: Sudden confidence drop
    const confidenceHistory = this.getConfidenceHistory(tile, 100);
    const confidenceDrop = this.detectSuddenDrop(confidenceHistory);
    if (confidenceDrop.severity > 0.5) {
      indicators.push({
        type: 'CONFIDENCE_DROP',
        severity: confidenceDrop.severity,
        description: 'Confidence dropped suddenly',
        evidence: confidenceDrop
      });
    }

    // Indicator 2: Abnormal success rate
    const stats = tile.getStats();
    if (stats.successRate > 0.99 && stats.observations > 100) {
      indicators.push({
        type: 'SUSPICIOUS_SUCCESS_RATE',
        severity: 0.9,
        description: 'Success rate too high',
        evidence: { successRate: stats.successRate }
      });
    }

    // Indicator 3: Memory inconsistency
    const memoryConsistency = this.checkMemoryConsistency(tile);
    if (!memoryConsistent.isConsistent) {
      indicators.push({
        type: 'MEMORY_INCONSISTENCY',
        severity: memoryConsistent.severity,
        description: 'Memory contains inconsistencies',
        evidence: memoryConsistent.inconsistencies
      });
    }

    // Indicator 4: Pheromone anomaly
    const pheromoneAnomaly = this.detectPheromoneAnomaly(tile);
    if (pheromoneAnomaly.isAnomalous) {
      indicators.push({
        type: 'PHEROMONE_ANOMALY',
        severity: pheromoneAnomaly.severity,
        description: 'Pheromone signals suspicious',
        evidence: pheromoneAnomaly
      });
    }

    // Indicator 5: Rate limit violation
    const rateViolation = this.checkRateViolation(tile);
    if (rateViolation.isViolation) {
      indicators.push({
        type: 'RATE_VIOLATION',
        severity: 0.7,
        description: 'Rate limit exceeded',
        evidence: rateViolation
      });
    }

    // Calculate overall attack probability
    const attackProbability = this.calculateAttackProbability(indicators);

    return {
      underAttack: attackProbability > 0.7,
      probability: attackProbability,
      indicators,
      recommendedActions: this.getRecommendedActions(indicators)
    };
  }

  private detectSuddenDrop(history: number[]): DropAnalysis {
    // Statistical test for sudden drop
    const before = history.slice(0, 50);
    const after = history.slice(50);

    const beforeAvg = before.reduce((a, b) => a + b) / before.length;
    const afterAvg = after.reduce((a, b) => a + b) / after.length;

    const drop = (beforeAvg - afterAvg) / beforeAvg;

    // T-test for significance
    const tStatistic = this.calculateTStatistic(before, after);
    const pValue = this.calculatePValue(tStatistic, before.length + after.length - 2);

    return {
      severity: drop > 0.3 && pValue < 0.05 ? drop : 0,
      dropAmount: drop,
      significant: pValue < 0.05
    };
  }
}
```

---

## Security Best Practices for Tile Deployment

### The Breakthrough: Secure-by-Default Tile Development

If you're building tiles, do this from day one. Don't bolt on security later.

```typescript
class SecureTileTemplate extends BaseTile {
  /**
   * Template for secure tiles.
   * Breakthrough: Security built in, not bolted on.
   */

  constructor(config: TileConfig) {
    super(config);

    // Initialize security
    this.security = new TileSecuritySystem();
    this.auditLogger = new AuditLogger();

    // Set secure defaults
    this.setSecureDefaults();
  }

  setSecureDefaults(): void {
    // Default 1: Input validation
    this.inputValidator = new SecureValidator([
      new TypeCheck(),
      new RangeCheck(),
      new NotNull(),
      new NotMalicious()
    ]);

    // Default 2: Rate limiting
    this.rateLimiter = new RateLimiter({
      requestsPerMinute: 100,
      burstLimit: 10
    });

    // Default 3: Memory protection
    this.memoryProtection = new MemoryProtection({
      maxSize: 1000,
      sanitizationInterval: 60000
    });

    // Default 4: Confidence calibration
    this.confidenceCalibration = new ConfidenceCalibrator({
      recalibrateInterval: 3600000
    });
  }

  async execute(input: unknown, context: TileContext): Promise<TileResult> {
    // Security wrapper around execution

    // Pre-execution checks
    await this.security.preExecutionChecks(this, input, context);

    // Execute
    const result = await super.execute(input, context);

    // Post-execution checks
    await this.security.postExecutionChecks(this, input, result);

    return result;
  }
}
```

---

## Summary: The Fisherman's Guide to Tile Security

Here's what you need to know:

1. **Tiles are attackable**. If you think they're not, you're wrong.

2. **Six major attack types**:
   - Input poisoning (feed bad data)
   - Memory poisoning (corrupt memory)
   - Pheromone manipulation (fake coordination)
   - Composition exploitation (safe tiles → unsafe combo)
   - Tile extraction (steal proprietary tiles)
   - Confidence manipulation (fake confidence scores)

3. **Defense in depth**. No single defense works. You need layers.

4. **Monitor everything**. You can't stop what you can't see.

5. **Sanitize memory**. Check it regularly. Remove poison.

6. **Validate pheromones**. Cross-check with peers. Watch for anomalies.

7. **Audit compositions**. Check for constraint death spirals and refusal dilution.

8. **Protect proprietary tiles**. Watermark, encrypt, rate limit.

9. **Detect attacks early**. Behavioral fingerprinting catches them.

10. **Build security in from day one**. Don't bolt it on later.

---

## Open Research Questions

1. **Formal verification** of tile compositions?
2. **Zero-knowledge proofs** for tile execution?
3. **Homomorphic encryption** for tile memory?
4. **Secure multi-party computation** for tile learning?
5. **Quantum-resistant** tile protection?
6. **Automated penetration testing** for tile systems?
7. **Adversarial training** for tile resilience?

---

**Status**: CRITICAL SECURITY FINDINGS - Ready for Publication
**Next Steps**: Prototype implementation, red team testing
**Impact**: Foundation for SMP security research

---

*Security isn't a feature you add. It's a mindset you need from day one.*
*I've seen too many good boats raided because nobody was watching.*
*Don't let your tiles be next.*
