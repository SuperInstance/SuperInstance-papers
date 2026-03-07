# Round 2 Agent: Resource Allocation Specialist

**Mission**: Design the "blood flow" mechanism - how compute and attention resources flow to active pathways in POLLN.

---

## Context from Round 1

Round 1 Embodied Cognition research established:
> "The body remembers running by BECOMING a runner."
> - Muscles grow in running patterns
> - Blood vessels grow to supply running
> - Blood flow follows activity

**Key insight**: Resource allocation IS learning. Where you direct attention/compute shapes what the system becomes.

---

## Research Questions

1. **Attention as Resource Allocation**
   - How to implement attention-based compute distribution?
   - Transformer attention vs. biological attention?
   - Sparse vs. dense attention patterns?

2. **Pathway Strengthening**
   - How to strengthen frequently-used agent pathways?
   - Hebbian-inspired weight updates for topology?
   - Competitive vs. cooperative strengthening?

3. **Resource Budgeting**
   - How much compute per specialist type?
   - Dynamic budget adjustment based on performance?
   - Quota systems and fairness?

4. **Load Balancing**
   - How to prevent coordinator bottlenecks?
   - Distribute load across specialists?
   - Handle overload gracefully?

5. **Overnight Optimization**
   - Synaptic homeostasis analog for POLLN?
   - How to downscale/consolidate during idle?
   - Memory consolidation mechanisms?

---

## Required Outputs

1. **Resource Allocation Algorithm**
   ```python
   def allocate_resources(pathway_strengths, current_demand):
       # How does blood flow to activity?
       pass
   ```

2. **Attention Mechanism Specification**
   - Query-Key-Value for agent attention
   - Sparse attention patterns
   - Computational efficiency

3. **Pathway Strength Update Rules**
   - Hebbian-inspired updates
   - Decay mechanisms
   - Normalization strategies

4. **Budget System Design**
   - Per-agent compute budgets
   - Dynamic adjustment rules
   - Fairness constraints

5. **Overnight Consolidation Process**
   - What runs during idle?
   - How to compress/consolidate?
   - When to prune pathways?

---

## Constraints

- Must work with **subsumption architecture** (safety gets priority)
- Must handle **dynamic agent populations**
- Must be **interpretable** (why was resource allocated here?)
- Must be **efficient** (can't spend all compute on allocation decisions)

---

## Biological Inspiration

From Round 1 embodied cognition research:

1. **Blood Flow Model**
   - Vessels grow where blood flows
   - More flow → larger vessels → more capacity
   - Positive feedback loop

2. **Synaptic Homeostasis**
   - Overnight downscaling
   - Prevents saturation
   - Relative strengths preserved

3. **Competitive Plasticity**
   - Neurons compete for representation
   - Winners strengthen, losers weaken
   - Natural specialization

---

## Success Criteria

- [ ] Resource allocation algorithm specified
- [ ] Attention mechanism designed
- [ ] Pathway update rules documented
- [ ] Budget system defined
- [ ] Overnight process designed
- [ ] Integration with Plinko layer

---

## Output Location

Write findings to: `docs/research/round2-resource-allocation.md`

Report synthesis to: `docs/round2-synthesis/README.md`
