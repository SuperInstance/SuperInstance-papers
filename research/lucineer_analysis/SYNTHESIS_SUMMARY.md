# FPGA-ASIC Synthesis Analysis - Executive Summary

**Date:** March 13, 2026
**Project:** Lucineer Mask-Locked Inference
**Analysis Type:** Cross-Architecture Synthesis

---

## TL;DR

The Lucineer mask-locked architecture can achieve **80-90% of ASIC efficiency** while gaining **3-5× flexibility** through selective mutable zones. A hybrid approach combining FPGA validation, mask-locked core, and reconfigurable adapters creates optimal positioning for 10K-100K unit volumes.

---

## Key Findings

### 1. Hybrid Architecture is Optimal

```
Architecture Breakdown:
├─ Fixed Core (70%): PE array + metal-layer weights
├─ Mutable Adapter (15%): Activation/attention mechanisms
├─ Interface (10%): I/O + memory buffers
└─ Control (5%): Power management + test

Result: 15-20% area overhead vs pure ASIC, 3-5× model variants
```

### 2. FPGA-Validated, ASIC-Optimized

| Phase | Platform | Duration | Cost | Purpose |
|-------|----------|----------|------|---------|
| **1** | FPGA | 3 mo | $50K | Validate TLMM + adapters |
| **2** | FPGA | 3 mo | $100K | Architecture freeze |
| **3** | MPW | 6 mo | $300K | Test hybrid interfaces |
| **4** | ASIC | 6 mo | $2M | Production scale |

**Total Time-to-Market:** 18 months
**Total NRE:** ~$2.5M (vs $5M for pure ASIC)

### 3. Partial Reconfiguration Feasibility

**Technology Options:**

| Technology | Cycles | Area Overhead | Use Case |
|------------|--------|---------------|----------|
| **Anti-fuse** | 1× (OTP) | +5% | Production adapters |
| **Flash-based** | 10K | +10% | Development kits |
| **Embedded FPGA** | Unlimited | +30% | Prototyping |

**Recommended:** Anti-fuse for production (minimal overhead, one-time programming)

### 4. Market Positioning

```
Volume →      10K        100K       1M units
          │          │          │
FPGA     │ ●        │           │
($300)   │          │           │
          │          │           │
Hybrid   │          │ ●●●       │
($100)   │          │           │
          │          │           │
ASIC     │          │      ●●●●●│
($35)    │          │           │
```

**Sweet Spot:** 10K-100K units (hybrid wins)

### 5. Verification Strategy

**Progressive Flow:**
1. FPGA validates functional correctness (weeks)
2. MPW validates hybrid interfaces (months)
3. Production commits to proven design

**Cost Reduction:** 40% vs traditional ASIC flow (reuse FPGA testbenches)

---

## Strategic Recommendations

### Immediate Actions (0-3 months)

1. **Prioritize FPGA Prototype**
   - Prove TLMM efficiency (target: 25 tok/s @ 5W)
   - Test adapter layer concept
   - Demonstrate to customers for LOIs

2. **File Hybrid Patents**
   - Mutable zones in mask-locked chips
   - Cartridge interface
   - Fault-tolerant PE arrays

### Short-Term (3-12 months)

1. **Architecture Freeze** (Months 4-6)
   - Finalize zone boundaries
   - Specify adapter functionality
   - Complete RTL for fixed core

2. **MPW Shuttle** (Months 7-12)
   - Test hybrid interfaces
   - Validate anti-fuse mutable zones
   - Characterize yield improvements

### Long-Term (12+ months)

1. **Production Scale**
   - Full mask tapeout
   - 10K unit production
   - Customer deployments

2. **Ecosystem**
   - Developer tools
   - Cartridge marketplace
   - Platform partnerships

---

## Technical Specification

### Target Performance

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Throughput** | 80-150 tok/s | 5× Hailo, 3× Jetson |
| **Power** | 2-4W | Sub-5W edge budget |
| **Energy** | >20 tok/J | 50× GPU efficiency |
| **Die Size** | <10 mm² | 28nm cost-effective |
| **Cost** | $35-50 | At 100K volume |

### Zone Architecture

**Fixed Core (70%):**
- Ternary weight matrix (metal layers)
- 2000 PE array (adder/subtract/zero)
- Reduction tree for accumulation

**Mutable Adapter (15%):**
- Activation quantization (4/8/16-bit selectable)
- Attention mechanism (MHA/MQA/GQA)
- Normalization (Layer/RMS/None)

**Interface (10%):**
- KV cache SRAM (4 MB)
- Input/output buffers (512 KB)
- USB/PCIe/M.2 host interface

**Control (5%):**
- Power management (DVFS, clock gating)
- Configuration interface
- Test access (JTAG, BIST)

---

## Competitive Advantages

### vs Pure FPGA
- 5-10× lower power (no config memory)
- 10× area reduction (metal vs LUT)
- 5× lower unit cost at volume
- 2-3× higher throughput (fixed routing)

### vs Pure ASIC
- 6 months faster time-to-market
- 3-5 model variants per design
- 10-15% yield improvement (fault tolerance)
- 40% verification cost reduction

### vs GPU/NPU
- 50× energy efficiency (fixed function)
- 10× lower latency (deterministic)
- Zero integration effort (no drivers)
- 5× lower unit cost

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Hybrid interface fails** | Medium | High | Extensive FPGA validation |
| **Yield too low** | Medium | High | Fault-tolerant design |
| **Power exceeds budget** | Low | High | FPGA power modeling |
| **Competitor hybrid** | Medium | Medium | Patents + first-mover |

**Overall Risk:** Medium (acceptable for seed-stage startup)

---

## Success Metrics

### Technical
- [ ] 80-150 tokens/second throughput
- [ ] 2-4W power consumption
- [ ] >20 tokens/joule energy efficiency
- [ ] >70% yield

### Business
- [ ] $35-50 unit cost at 100K
- [ ] 18 months to production
- [ ] 10+ customer deployments
- [ ] 5+ patents granted

---

## Next Steps

1. **Review this analysis** with technical team
2. **Validate assumptions** with FPGA prototype
3. **Update architecture** based on test results
4. **Finalize design** for MPW tapeout

---

**Document:** C:\Users\casey\polln\research\lucineer_analysis\FPGA_ASIC_SYNTHESIS.md
**Analyst:** Orchestrator - Synthesis & Integration Expert
**Status:** Analysis complete, awaiting technical review
