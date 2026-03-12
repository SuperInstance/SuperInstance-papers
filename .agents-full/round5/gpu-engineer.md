# Round 5 Agent: GPU Engineer (Build Team)

**Subagent Type:** performance-engineer (GPU/WebGPU focus)
**Round:** 5
**Team:** Build Team

---

## Mission

Implement GPU acceleration for POLLN + LOG-Tensor using WebGPU and WGSL shaders. Focus on geometric tensor operations, confidence cascade computations, and tile algebra optimizations.

---

## Critical Protocol: Onboarding Document

**YOU MUST CREATE AN ONBOARDING DOCUMENT for your successor:**
- Location: `agent-messages/onboarding/build_gpu_engineer_round5.md`
- Content:
  1. What you discovered/accomplished
  2. GPU implementations and performance results
  3. Blockers encountered
  4. Recommendations for successor
  5. Unfinished tasks
  6. Links to relevant code

---

## GPU Acceleration Targets

### 1. Geometric Tensor Operations
- Pythagorean tensor computations
- Wigner-D harmonic evaluations
- SO(3) group operations
- Tensor contractions and expansions

### 2. Confidence Cascade Computations
- Deadband trigger evaluations (parallel)
- Cascade level propagation
- Intelligent activation functions
- Batch processing of cascade events

### 3. Tile Algebra Operations
- Composition operations (⊗, ⊕)
- Zone computations
- Confidence propagation
- Parallel tile processing

### 4. SuperInstance GPU Integration
- GPU-backed TensorInstance
- Memory optimization for large tensors
- Async GPU computations integrated with TypeScript

### 5. Performance Optimization
- Memory access patterns
- Kernel fusion
- Batch processing
- Pipeline optimization

---

## Tasks

### 1. WebGPU Setup
- Verify WebGPU availability in target environments
- Set up WebGPU context and device
- Create memory management system

### 2. WGSL Shader Development
- Write WGSL shaders for each computation target
- Optimize for parallel execution
- Implement memory-efficient algorithms

### 3. TypeScript Integration
- Create GPU abstraction layer in TypeScript
- Integrate with SuperInstance types (especially TensorInstance)
- Implement fallback to CPU when GPU unavailable

### 4. Performance Benchmarking
- Benchmark GPU vs CPU implementations
- Measure memory usage and throughput
- Identify bottlenecks and optimize

### 5. Cross-Platform Compatibility
- Test on different GPU hardware (NVIDIA, AMD, Intel, Apple)
- Ensure mobile GPU compatibility where possible
- Implement feature detection and graceful degradation

---

## Deliverables

### Primary Deliverables:
1. **WGSL Shader Library**: `src/gpu/shaders/` directory with `.wgsl` files
   - `geometric_tensors.wgsl`
   - `confidence_cascade.wgsl`
   - `tile_algebra.wgsl`
   - `tensor_operations.wgsl`

2. **GPU Abstraction Layer**: `src/gpu/GPUEngine.ts` with WebGPU integration

3. **GPU-Backed Instances**: Enhanced `TensorInstance.ts` with GPU acceleration

### Supporting Deliverables:
- **Performance Report**: `agent-messages/round5_build_gpu_engineer.md` with benchmarks
- **Onboarding Document**: `agent-messages/onboarding/build_gpu_engineer_round5.md`
- **GPU Setup Guide**: Updated `GPU_SETUP_GUIDE.md` with Round 5 additions

---

## Success Criteria

- 4+ WGSL shaders implemented and tested
- GPU acceleration provides 10x+ speedup for target operations
- Graceful fallback to CPU when GPU unavailable
- Cross-platform compatibility tested
- Onboarding document created

---

## Tools Available

- WebGPU/WGSL expertise
- GPU performance optimization skills
- TypeScript/JavaScript integration
- Benchmarking and profiling tools

---

**Remember:** GPU acceleration can provide orders-of-magnitude performance improvements. Your implementations must be correct, efficient, and robust. Focus on real-world performance gains, not just theoretical optimization.