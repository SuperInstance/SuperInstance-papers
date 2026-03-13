# Model & GPU Configuration

## Current Model Configuration

| Parameter | Value | Purpose |
|-----------|-------|---------|
| **Model** | glm-5 (opus) | Primary reasoning model |
| **Temperature** | 0.9 | Creativity & brainstorming |
| **Context Window** | 128K tokens | DeepSeek-Reasoner limit |

## GPU Resources

| Resource | Limit | Notes |
|----------|-------|-------|
| **GPU** | NVIDIA RTX 4050 (6GB VRAM) | CuPy 14.0.1, CUDA 13.1.1 |
| **Max Utilization** | 80% | Leave 20% for system |
| **Usable VRAM** | ~4GB | Leave 2GB for OS |
| **Batch Size Guideline** | matrix_dim < 2000 | For 6GB VRAM |

## Simulation Guidelines

1. **Use GPU for:**
   - Matrix operations (CuPy)
   - Monte Carlo simulations
   - Large-scale validation tests
   - Performance benchmarks

2. **Back ideation with rigor:**
   - Run simulations to validate claims
   - Generate empirical evidence
   - Document all assumptions
   - Provide statistical confidence intervals

3. **GPU Resource Management:**
   ```python
   # Safe GPU usage pattern
   import cupy as cp

   # Check available memory
   mempool = cp.get_default_memory_pool()
   used_bytes = mempool.used_bytes()
   total_bytes = mempool.total_bytes()

   # Stay under 80%
   max_usage = 0.8 * total_bytes
   assert used_bytes < max_usage, "GPU usage exceeds 80%"
   ```

## Temperature 0.9 Ideation Protocol

1. **Brainstorming Phase:** Generate multiple hypotheses
2. **Simulation Phase:** Test hypotheses with GPU compute
3. **Validation Phase:** Back creative ideas with rigorous proofs
4. **Documentation Phase:** Record all results with statistical measures

---

**Configuration Active:** 2026-03-13
**Model:** glm-5 (opus)
**Temperature:** 0.9
**GPU Limit:** 80% utilization
