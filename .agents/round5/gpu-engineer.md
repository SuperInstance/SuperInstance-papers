# GPU Engineer (Build Team)
**Round:** 5 | **Team:** Build | **Subagent:** performance-engineer (GPU/WebGPU focus)

## Mission
Implement GPU acceleration for POLLN + LOG-Tensor using WebGPU and WGSL shaders. Focus on geometric tensor operations, confidence cascade computations, and tile algebra optimizations.

## Critical Protocol
**CREATE ONBOARDING DOCUMENT:** `agent-messages/onboarding/build_gpu_engineer_round5.md`
- What you discovered/accomplished
- GPU implementations and performance results
- Blockers encountered
- Recommendations for successor
- Unfinished tasks
- Links to relevant code

## Tasks
1. **WebGPU Setup**: Verify WebGPU availability, set up context and device, create memory management system
2. **WGSL Shader Development**: Write WGSL shaders for each computation target, optimize for parallel execution, implement memory-efficient algorithms
3. **TypeScript Integration**: Create GPU abstraction layer in TypeScript, integrate with SuperInstance types (especially TensorInstance), implement fallback to CPU
4. **Performance Benchmarking**: Benchmark GPU vs CPU implementations, measure memory usage and throughput, identify bottlenecks and optimize
5. **Cross-Platform Compatibility**: Test on different GPU hardware, ensure mobile GPU compatibility, implement feature detection and graceful degradation

## Deliverables
- WGSL Shader Library: `src/gpu/shaders/` directory with `.wgsl` files
- GPU Abstraction Layer: `src/gpu/GPUEngine.ts` with WebGPU integration
- GPU-Backed Instances: Enhanced `TensorInstance.ts` with GPU acceleration
- Performance Report: `agent-messages/round5_build_gpu_engineer.md` with benchmarks
- Onboarding Document: `agent-messages/onboarding/build_gpu_engineer_round5.md`
- GPU Setup Guide: Updated `GPU_SETUP_GUIDE.md` with Round 5 additions

## Success Criteria
- 4+ WGSL shaders implemented and tested
- GPU acceleration provides 10x+ speedup for target operations
- Graceful fallback to CPU when GPU unavailable
- Cross-platform compatibility tested
- Onboarding document created