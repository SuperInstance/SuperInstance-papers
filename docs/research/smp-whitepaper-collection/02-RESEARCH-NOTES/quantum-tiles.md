# Agent Note: Quantum Computing Applications for SMP Tiles

**Agent**: Hard Logic / ML Researcher Hybrid
**Date**: 2026-03-09
**Status**: Initial Research & Findings

## What I Discovered

### 1. Problems That Benefit From Quantum Parallelism

#### Optimization Problems (The Sweet Spot)
**Why quantum shines here**: Many optimization problems map naturally to quantum Hamiltonians.

**Best candidates for SMP quantum tiles**:
- **Combinatorial Optimization**: Max-Cut, graph coloring, scheduling
  - *SMP application*: Resource allocation tiles, scheduling optimization
  - *Algorithm*: QAOA (Quantum Approximate Optimization Algorithm)

- **Portfolio Optimization**: Financial asset allocation, risk management
  - *SMP application*: Financial modeling tiles, investment strategy
  - *Algorithm*: QAOA or Quantum Annealing

- **Logistics Optimization**: Route planning, supply chain, facility location
  - *SMP application*: Supply chain tiles, delivery optimization
  - *Algorithm*: Quantum Annealing (D-Wave)

#### Parallel Pattern Matching
**Why quantum helps**: Superposition enables evaluating multiple patterns simultaneously.

**Best candidates**:
- **Database Search**: Unstructured search problems
  - *SMP application*: Large dataset search tiles, pattern recognition
  - *Algorithm*: Grover's Algorithm (quadratic speedup: O(√N) vs O(N))

- **String Matching**: DNA sequence analysis, text pattern search
  - *SMP application*: Genomic analysis tiles, NLP preprocessing
  - *Algorithm*: Quantum string matching variants

- **Template Matching**: Image recognition, feature detection
  - *SMP application*: Computer vision preprocessing tiles
  - *Algorithm*: Quantum-enhanced feature extraction

#### Machine Learning Acceleration
**Why quantum matters**: Certain ML subroutines have quantum advantages.

**Best candidates**:
- **Linear Algebra**: Matrix operations, eigenvalue decomposition
  - *SMP application*: Statistical analysis tiles, PCA, regression
  - *Algorithm*: HHL algorithm (for linear systems), VQE (for eigenvalues)

- **Neural Network Training**: Optimization in high-dimensional spaces
  - *SMP application*: ML training tiles, hyperparameter optimization
  - *Algorithm*: Quantum-enhanced gradient descent

---

### 2. Hybrid Quantum-Classical Architecture

#### The SMP Tile Interface Pattern

```
┌─────────────────────────────────────────────────────────────┐
│              QUANTUM-CLASSICAL TILE ARCHITECTURE            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CLASSICAL TILE (CPU/GPU)                                   │
│  ├─ Data Preparation                                        │
│  ├─ Problem Encoding (Hamiltonian formulation)              │
│  ├─ Parameter Optimization (Classical optimizer)            │
│  └─ Result Processing & Post-processing                     │
│          ↕ API Call                                         │
│  QUANTUM TILE (QPU)                                         │
│  ├─ Circuit Construction                                    │
│  ├─ Quantum State Preparation                               │
│  ├─ Quantum Execution (Gate operations)                     │
│  └─ Measurement & Collapse                                  │
│          ↕ Result Return                                    │
│  CLASSICAL TILE (CPU/GPU)                                   │
│  └─ Unwrapping, Error Mitigation, Integration              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Communication Protocol

**Classical → Quantum**:
1. **Problem Encoding**: Convert classical data to quantum state
   - Binary encoding → Qubit basis states
   - Continuous variables → Amplitude encoding
   - Graphs → Problem Hamiltonian

2. **Circuit Parameters**: Send rotation angles, gate parameters
   - Variational parameters for QAOA/VQE
   - Annealing schedule for quantum annealing

3. **Execution Request**: Submit job to quantum processor
   - Cloud API calls (IBM Q, AWS Braket, Google Cirq)
   - Queue management, timeout handling

**Quantum → Classical**:
1. **Measurement Results**: Bitstrings from quantum measurements
   - Multiple shots for statistical sampling
   - Probability distributions over solutions

2. **Expectation Values**: Computed from measurement statistics
   - Energy values for optimization
   - Cost function evaluations

3. **Error Metadata**: Device calibration, error rates
   - Gate fidelities
   - Readout errors
   - Qubit coherence times

#### Tile Coordination Strategies

**Variational Loop Pattern** (VQE, QAOA):
```
Classical Tile:
  1. Initialize parameters θ
  2. FOR iteration = 1 TO max_iterations:
  3.   Send θ to Quantum Tile
  4.   Receive expectation value ⟨ψ(θ)|H|ψ(θ)⟩
  5.   Update θ using classical optimizer (COBYLA, SPSA)
  6.   IF converged: BREAK
  7. Return best θ and solution
```

**Quantum Subroutine Pattern** (Grover, HHL):
```
Classical Tile:
  1. Prepare classical data structures
  2. Call Quantum Tile for specific subroutine
  3. Process quantum results classically
  4. Continue classical computation
```

---

### 3. Most Suitable Quantum Algorithms

#### QAOA (Quantum Approximate Optimization Algorithm)
**Best For**: Combinatorial optimization, graph problems

**How It Works**:
1. Encode problem as cost Hamiltonian H_C
2. Alternate between applying H_C and mixer Hamiltonian H_M
3. Parameters (angles) optimized classically
4. Depth p controls quality vs circuit complexity

**SMP Tile Implementation**:
```python
class QAOATile:
    def __init__(self, problem_graph, depth_p=1):
        self.graph = problem_graph
        self.depth = depth_p
        self.params = initialize_random()

    def encode_problem(self):
        # Build cost Hamiltonian from graph
        # Max-Cut: H_C = 0.5 * Σ(1 - σ_z^i σ_z^j)
        pass

    def execute_quantum(self, params):
        # Construct QAOA circuit
        # Apply gates based on params
        # Measure in computational basis
        return measurement_results

    def classical_optimize(self, measurements):
        # Compute expectation value
        # Update params using gradient-free optimizer
        pass
```

**When to Use**:
- ✅ NP-hard combinatorial problems
- ✅ Problem size fits NISQ device (<100 variables)
- ✅ Approximate solutions acceptable
- ❌ Need exact optimal solution
- ❌ Very large problem instances

#### Quantum Annealing
**Best For**: Ising model problems, QUBO (Quadratic Unconstrained Binary Optimization)

**How It Works**:
1. Encode problem as Ising Hamiltonian
2. Start in ground state of simple transverse field
3. Slowly evolve to problem Hamiltonian
4. Quantum tunneling escapes local minima
5. Measure final state

**SMP Tile Implementation**:
```python
class QuantumAnnealingTile:
    def __init__(self, qubo_matrix, bias_vector):
        self.Q = qubo_matrix
        self.b = bias_vector

    def encode_problem(self):
        # Convert QUBO to Ising model
        # Map qubits to hardware graph (chimera, pegasus)
        pass

    def execute_annealing(self, annealing_schedule):
        # Submit to D-Wave
        # Return lowest-energy solutions
        return solutions

    def post_process(self, raw_solutions):
        # Error correction, embedding removal
        # Return classical bitstrings
        pass
```

**When to Use**:
- ✅ QUBO/Ising formulations
- ✅ Large-scale optimization (5000+ qubits on D-Wave)
- ✅ Hardware available (D-Wave access)
- ❌ Need gate-based operations
- ❌ Problem doesn't map to Ising model

#### VQE (Variational Quantum Eigensolver)
**Best For**: Quantum chemistry, materials science, eigenvalue problems

**How It Works**:
1. Prepare parameterized ansatz state |ψ(θ)⟩
2. Measure expectation value ⟨ψ(θ)|H|ψ(θ)⟩
3. Classical optimizer updates θ
4. Iterate until convergence
5. Returns approximate ground state energy

**SMP Tile Implementation**:
```python
class VQETile:
    def __init__(self, hamiltonian, ansatz='UCCSD'):
        self.H = hamiltonian
        self.ansatz = ansatz
        self.params = initialize_random()

    def prepare_ansatz(self, params):
        # Construct variational circuit
        # UCCSD for chemistry, hardware-efficient for general
        pass

    def measure_expectation(self, params):
        # Measure each term in Hamiltonian
        # Combine with coefficients
        return energy

    def optimize(self):
        # Classical outer loop
        for iteration in range(max_iter):
            energy = self.measure_expectation(self.params)
            self.params = classical_optimizer.update(energy)
        return energy, self.params
```

**When to Use**:
- ✅ Molecular simulation, quantum chemistry
- ✅ Material property calculation
- ✅ Eigenvalue problems
- ❌ Classical chemistry methods sufficient
- ❌ Very large molecules (beyond NISQ capability)

#### Grover's Algorithm
**Best For**: Unstructured search, database lookup

**How It Works**:
1. Initialize uniform superposition over N items
2. Repeat O(√N) times:
   - Oracle flips marked item's amplitude
   - Diffusion operator amplifies marked item
3. Measure to get marked item with high probability

**SMP Tile Implementation**:
```python
class GroverTile:
    def __init__(self, database_size, oracle_function):
        self.N = database_size
        self.oracle = oracle_function
        self.iterations = int(math.pi/4 * math.sqrt(N))

    def construct_oracle(self):
        # Quantum circuit marking target states
        pass

    def construct_diffusion(self):
        # Inversion about the mean
        pass

    def execute_search(self):
        # Apply oracle + diffusion O(√N) times
        # Measure and return result
        return search_result
```

**When to Use**:
- ✅ Unstructured search (no indexing)
- ✅ Database is quantum-accessible
- ✅ Quadratic speedup meaningful (large N)
- ❌ Classical indexing available
- �| Small datasets (overhead dominates)

---

### 4. Practical NISQ Considerations

#### Current Hardware Landscape (2026)

| Platform | Qubits | Gate Fidelity | Coherence Time | Access |
|----------|--------|---------------|----------------|---------|
| IBM Quantum | 1000+ | 99.9% (single) | 100-500 μs | Cloud |
| Google Sycamore | 70 | 99.5% | 10-30 μs | Select partners |
| Rigetti | 80+ | 99.0% | 20-40 μs | Cloud |
| IonQ (Trapped Ion) | 30+ | 99.99% | 1-10 s | Cloud |
| D-Wave (Annealing) | 5000+ | N/A (analog) | N/A | Cloud |

#### Error Mitigation Strategies

**Circuit Level**:
- **Shallow Circuits**: Minimize depth before decoherence
- **Error Detection**: Parity checks, stabilizer measurements
- **Dynamical Decoupling**: Pulse sequences to extend coherence

**Algorithm Level**:
- **Variational Algorithms**: Robust to certain errors
- **Error Mitigation**: Zero-noise extrapolation, probabilistic error cancellation
- **Problem Encoding**: Efficient qubit usage, symmetry verification

**SMP Tile Integration**:
```python
class ErrorMitigatedQuantumTile:
    def __init__(self, base_tile):
        self.base_tile = base_tile
        self.calibration_data = load_device_calibration()

    def execute_with_mitigation(self, circuit):
        # Execute at multiple noise levels
        results = []
        for scale in [1.0, 1.5, 2.0]:  # Noise scaling
            noisy_result = self.execute_stretched(circuit, scale)
            results.append(noisy_result)

        # Extrapolate to zero noise
        return richardson_extrapolation(results)

    def verify_symmetry(self, result, problem_symmetries):
        # Post-selection based on known symmetries
        # Discard results violating conservation laws
        pass
```

#### Coherence Time Constraints

**Problem**: Quantum states decohere quickly.

**Impact on SMP Tiles**:
- **Maximum Circuit Depth**: Limited by coherence time
- **Gate Count Budget**: ~100-1000 gates on current hardware
- **Execution Time**: Must complete before decoherence

**Tile Design Implications**:
```python
class CoherenceAwareTile:
    def estimate_circuit_time(self, circuit):
        # Gate time × gate count + measurement time
        return self.gate_time * circuit.depth + self.measurement_time

    def check_feasibility(self, circuit):
        execution_time = self.estimate_circuit_time(circuit)
        if execution_time > self.coherence_time * 0.8:  # Safety margin
            raise CircuitTooDeepError(
                f"Execution time {execution_time}μs exceeds coherence {self.coherence_time}μs"
            )

    def decompose_for_shallow_depth(self, problem):
        # Break problem into smaller subproblems
        # Execute in sequence, combine classically
        pass
```

#### Qubit Connectivity Constraints

**Problem**: Not all qubits can interact directly.

**Hardware Topologies**:
- **Linear**: 1D chain (simplest, highest overhead)
- **Ring**: 1D with periodic boundary
- **Grid**: 2D nearest-neighbor (IBM, Google)
- **Chimera**: D-Wave's bipartite graph
- **All-to-All**: Trapped ion (ideal but limited qubits)

**SMP Tile Implications**:
```python
class ConnectivityAwareTile:
    def map_to_hardware(self, logical_circuit, hardware_graph):
        # Initial mapping of logical to physical qubits
        mapping = initial_placement(logical_circuit, hardware_graph)

        # Insert SWAP gates for long-range interactions
        routed_circuit = route_circuit(logical_circuit, mapping, hardware_graph)

        return routed_circuit, mapping

    def estimate_swap_overhead(self, circuit, topology):
        # Count required SWAP gates
        # More swaps = more decoherence
        pass
```

#### Queue Times and Cost

**Practical Reality**:
- **Queue Times**: Minutes to hours for cloud access
- **Cost**: $0.01-$1 per quantum task
- **Reliability**: Jobs can fail, need retry logic

**SMP Tile Design**:
```python
class CloudQuantumTile:
    def __init__(self, provider, backend, max_retries=3):
        self.provider = provider
        self.backend = backend
        self.max_retries = max_retries

    def execute_with_retry(self, circuit):
        for attempt in range(self.max_retries):
            try:
                job = self.provider.run(circuit, backend=self.backend)
                result = job.result()  # Blocks until complete
                return result
            except JobFailedError:
                if attempt == self.max_retries - 1:
                    raise
                continue

    def async_execute(self, circuit, callback):
        # Submit job, don't wait
        job = self.provider.run(circuit, backend=self.backend)
        # Register callback for when job completes
        job.add_callback(callback)
        return job.job_id()
```

---

### 5. Near-Term vs Long-Term Applications

#### Near-Term (2026-2030): NISQ Era

**What's Possible Now**:
1. **Hybrid Algorithms**: QAOA, VQE with shallow circuits
2. **Quantum Annealing**: D-Wave for specific QUBO problems
3. **Small-Scale Demonstrations**: Proof-of-concept on <50 qubits
4. **Error-Mitigated Results**: Post-processing to improve accuracy

**SMP Tile Use Cases**:
- **Financial Portfolio Optimization**: 50-100 asset portfolios
- **Molecular Ground States**: Small molecules (H₂, LiH, BeH₂)
- **Logistics Routing**: Small delivery networks
- **Machine Learning Subroutines**: Quantum-enhanced kernels

**When to Deploy Quantum Tiles (Now)**:
```
IF (problem_size < 100 variables AND
    problem_maps_to_QUBO AND
    approximate_solution_acceptable AND
    classical_methods_slow_on_instance) THEN
    use_quantum_tile()
ELSE
    use_classical_tile()
```

**Realistic Performance**:
- **No Proven Speedup**: Most quantum algorithms not yet beating classical
- **Special Cases**: Some specific problem instances show advantage
- **Learning Phase**: Investing in quantum expertise for future advantage

#### Medium-Term (2030-2035): Fault-Tolerant Era Begins

**What Becomes Possible**:
1. **Error Correction**: Logical qubits with lower error rates
2. **Deeper Circuits**: Thousands of gates without decoherence
3. **Quantum Supremacy**: Clear advantage for specific problems
4. **Hybrid Maturity**: Standard patterns for quantum-classical code

**SMP Tile Evolution**:
- **Larger Problem Instances**: 1000+ variable optimization
- **More Complex Molecules**: Drug discovery scale
- **Quantum ML Subroutines**: Standard in ML pipelines
- **Improved Algorithms**: Better variational ansatzes, optimizers

#### Long-Term (2035+): Universal Quantum Computing

**What Becomes Practical**:
1. **Large-Scale Quantum Advantage**: Millions of qubits
2. **Quantum ML**: Fully quantum neural networks
3. **Quantum Simulation**: Complex many-body systems
4. **New Algorithms**: Breakthroughs we haven't imagined

**SMP Tile Vision**:
- **Quantum-First Design**: Problems designed for quantum advantage
- **Transparent Integration**: Quantum tiles indistinguishable from classical
- **Automatic Quantum Compilation**: Classical code → quantum circuits
- **Quantum Cloud**: SMP tiles seamlessly accessing quantum resources

---

### 6. SMP-Specific Design Patterns

#### Quantum Tile as Black Box

**Key Insight**: Users shouldn't need quantum physics knowledge.

```python
# User interface - no quantum concepts visible
quantum_optimizer = SMPBotTile(
    seed=selected_portfolio_data,
    model="quantum-portfolio-optimizer",
    prompt="Minimize risk while targeting 15% return"
)

result = quantum_optimizer.run()

# Under the hood: QAOA on IBM Quantum
# But user sees: inputs → optimization → outputs
```

#### Classical-Quantum Transfer Learning

**Pattern**: Use classical to initialize quantum parameters.

```python
class HybridOptimizerTile:
    def __init__(self, problem):
        self.classical_solver = ClassicalGurobiSolver()
        self.quantum_solver = QAOATile()

    def solve(self, problem):
        # 1. Get classical approximation (fast, good baseline)
        classical_solution = self.classical_solver.solve(problem)

        # 2. Use classical solution to initialize quantum parameters
        warm_start_params = self.encode_solution(classical_solution)
        self.quantum_solver.initialize(warm_start_params)

        # 3. Quantum refinement (explore around classical solution)
        quantum_solution = self.quantum_solver.refine(problem)

        # 4. Return best of both
        return compare_solutions(classical_solution, quantum_solution)
```

#### Quantum Tile Chaining

**Pattern**: Multiple quantum tiles in sequence or parallel.

```python
# Parallel: Independent quantum subproblems
class ParallelQuantumTile:
    def run(self, large_problem):
        # Decompose into independent subproblems
        subproblems = self.decompose(large_problem)

        # Execute in parallel on quantum hardware
        futures = [self.quantum_pool.submit(sp) for sp in subproblems]

        # Combine results classically
        results = [f.result() for f in futures]
        return self.combine(results)

# Sequential: Output of one quantum tile feeds next
class SequentialQuantumTile:
    def run(self, initial_state):
        # Stage 1: Prepare quantum state
        prepared_state = self.preparer_tile.execute(initial_state)

        # Stage 2: Process with quantum algorithm
        processed_state = self.algorithm_tile.execute(prepared_state)

        # Stage 3: Quantum measurement
        final_result = self.measurer_tile.execute(processed_state)

        return final_result
```

---

## What's Still Unknown

### Open Research Questions

1. **Quantum Advantage Thresholds**: For which problem sizes do quantum tiles actually beat classical?

2. **Optimal Hybrid Splits**: How to best divide work between classical and quantum tiles?

3. **Error-Aware Algorithms**: Can we design algorithms that exploit rather than mitigate NISQ errors?

4. **Tile Communication Overhead**: What's the latency cost of classical-quantum communication?

5. **Automatic Quantum Mapping**: Can classical SMP code be automatically compiled to quantum tiles?

6. **Resource Estimation**: How to predict if a problem will benefit from quantum acceleration?

### Experimental Validation Needed

1. **Benchmark Suite**: Standard SMP problems with classical vs quantum tile comparisons

2. **Performance Profiling**: Real-world execution times, queue delays, error rates

3. **Cost-Benefit Analysis**: When does quantum tile justify its complexity and cost?

4. **User Studies**: Do users understand quantum tile results? Can they debug quantum failures?

5. **Scaling Studies**: How do quantum tiles perform as problem size increases?

---

## Requests for Other Agents

### To Creative Writers:
- Explain quantum concepts using spreadsheet analogies
- Describe the "AI in a cell" experience when some cells are quantum
- Write user-facing documentation that hides quantum complexity

### To Schema Developers:
- Design interfaces for quantum tile specification
- Define data structures for problem encoding (classical → quantum)
- Create result formats that unify classical and quantum outputs

### To Simulation Builders:
- Simulate quantum tiles on classical hardware for testing
- Model noise, decoherence, and realistic NISQ behavior
- Build hybrid classical-quantum simulators

### To ML/DL/RL Researchers:
- Investigate quantum-enhanced machine learning tiles
- Explore variational quantum algorithms for ML subroutines
- Study quantum kernels for support vector machines

---

## Data/Code/Schemas

### Quantum Tile Interface Schema

```typescript
interface QuantumTileConfig {
  // Problem specification
  problem_type: 'QAOA' | 'VQE' | 'Annealing' | 'Grover';
  problem_encoding: {
    variables: number;
    constraints?: Constraint[];
    objective: ObjectiveFunction;
  };

  // Quantum backend
  backend: {
    provider: 'IBM' | 'AWS' | 'Google' | 'D-Wave' | 'IonQ';
    device: string;  // Specific quantum processor
    access_token?: string;
  };

  // Algorithm parameters
  algorithm: {
    depth?: number;  // QAOA depth, VQE ansatz depth
    iterations?: number;  // Classical optimization iterations
    shots?: number;  // Measurement repetitions
  };

  // Error mitigation
  error_mitigation?: {
    zero_noise_extrapolation: boolean;
    readout_error_mitigation: boolean;
    symmetry_verification?: string[];
  };
}

interface QuantumTileResult {
  // Solution
  solution: number[] | string;  // Bitstring or continuous values

  // Metadata
  metadata: {
    execution_time: number;  // Wall clock time
    queue_time: number;  // Time spent waiting
    quantum_time: number;  // Actual QPU time
    shots_completed: number;
    fidelity: number;  // Solution quality estimate

    // Device information
    device_calibration: {
      timestamp: string;
      gate_fidelities: number[];
      readout_fidelity: number;
      coherence_times: number[];
    };
  };

  // Measurement statistics
  measurements?: {
    bitstrings: string[];  // Raw measurement outcomes
    counts: Map<string, number>;  // Frequency of each outcome
  };
}
```

### Example QAOA Tile Implementation

```python
"""
SMP Quantum Tile: QAOA Optimization

This tile demonstrates a realistic QAOA implementation
for portfolio optimization in spreadsheets.
"""

import numpy as np
from typing import List, Dict, Tuple
from dataclasses import dataclass

@dataclass
class PortfolioProblem:
    """Portfolio optimization problem"""
    expected_returns: np.ndarray  # μ[i] for each asset
    covariances: np.ndarray  # Σ[i,j] covariance matrix
    target_return: float  # Desired portfolio return
    max_positions: int  # Maximum number of assets

class QAOAPortfolioTile:
    """
    Quantum tile for portfolio optimization using QAOA.

    User interface: classical portfolio data
    Internal execution: hybrid quantum-classical QAOA
    """

    def __init__(
        self,
        problem: PortfolioProblem,
        backend: str = "ibmq_manila",
        depth: int = 1,
        shots: int = 1000
    ):
        self.problem = problem
        self.backend = backend
        self.depth = depth
        self.shots = shots
        self.n_assets = len(problem.expected_returns)

    def encode_to_qubo(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Convert portfolio problem to QUBO form.

        Binary variable x[i] = 1 if asset i is selected
        Minimize: x^T Q x + c^T x
        Subject to: sum(μ[i] * x[i]) >= target_return
        """
        n = self.n_assets

        # QUBO matrix Q (penalty method for constraints)
        Q = np.zeros((n, n))

        # Risk term: x^T Σ x
        risk_weight = 1.0
        Q += risk_weight * self.problem.covariances

        # Return constraint penalty
        penalty_weight = 10.0
        expected_returns = self.problem.expected_returns

        # Penalty for not meeting target return
        # P * (sum(μ[i]*x[i]) - target)^2
        for i in range(n):
            Q[i,i] += penalty_weight * (expected_returns[i]**2)
            for j in range(i+1, n):
                Q[i,j] += penalty_weight * expected_returns[i] * expected_returns[j]
                Q[j,i] = Q[i,j]

        # Linear term c
        c = -2 * penalty_weight * self.problem.target_return * expected_returns

        # Add penalty for too many positions
        position_penalty = 5.0
        for i in range(n):
            Q[i,i] += position_penalty

        return Q, c

    def construct_qaoa_circuit(self, params: np.ndarray) -> 'QuantumCircuit':
        """
        Construct QAOA circuit for current parameters.

        Args:
            params: [γ_1, β_1, γ_2, β_2, ..., γ_p, β_p]
                   γ: problem unitary parameters
                   β: mixer unitary parameters
        """
        from qiskit import QuantumCircuit
        from qiskit.circuit import Parameter

        n = self.n_assets
        qc = QuantumCircuit(n)

        # Initial state: equal superposition
        qc.h(range(n))

        # QAOA layers
        for layer in range(self.depth):
            gamma = params[2*layer]
            beta = params[2*layer + 1]

            # Problem unitary: exp(-iγH_C)
            self._apply_problem_hamiltonian(qc, gamma)

            # Mixer unitary: exp(-iβH_M)
            qc.rx(2*beta, range(n))

        # Measurement
        qc.measure_all()

        return qc

    def _apply_problem_hamiltonian(self, qc, gamma):
        """Apply problem Hamiltonian unitary"""
        Q, c = self.encode_to_qubo()
        n = self.n_assets

        # Single-qubit terms (diagonal of Q + c)
        for i in range(n):
            angle = gamma * (Q[i,i] + c[i])
            qc.rz(2*angle, i)

        # Two-qubit terms (off-diagonal of Q)
        for i in range(n):
            for j in range(i+1, n):
                if abs(Q[i,j]) > 1e-10:
                    # exp(-iγ*Q[i,j]*Z_i*Z_j)
                    # Decompose using CNOT and RZ
                    angle = gamma * Q[i,j]
                    qc.cx(i, j)
                    qc.rz(2*angle, j)
                    qc.cx(i, j)

    def execute_quantum(self, params: np.ndarray) -> Dict[str, int]:
        """Execute quantum circuit and return measurement counts"""
        from qiskit import execute, Aer

        circuit = self.construct_qaoa_circuit(params)

        # Use simulator (replace with real backend for production)
        backend = Aer.get_backend('qasm_simulator')
        job = execute(circuit, backend, shots=self.shots)
        result = job.result()
        counts = result.get_counts(circuit)

        return counts

    def compute_energy(self, counts: Dict[str, int]) -> float:
        """Compute expectation value from measurement results"""
        Q, c = self.encode_to_qubo()
        total_energy = 0
        total_shots = 0

        for bitstring, count in counts.items():
            # Convert bitstring to array
            x = np.array([int(b) for b in bitstring[::-1]])  # Reverse for Qiskit ordering

            # Compute energy for this bitstring
            energy = x @ Q @ x + c @ x

            total_energy += energy * count
            total_shots += count

        return total_energy / total_shots

    def classical_optimize(self) -> Tuple[np.ndarray, float]:
        """
        Classical optimization loop for QAOA parameters.

        Returns:
            (best_params, best_energy)
        """
        from scipy.optimize import minimize

        def objective(params):
            counts = self.execute_quantum(params)
            energy = self.compute_energy(counts)
            return energy

        # Initialize parameters randomly
        n_params = 2 * self.depth
        initial_params = np.random.uniform(0, 2*np.pi, n_params)

        # Gradient-free optimization (COBYLA)
        result = minimize(
            objective,
            initial_params,
            method='COBYLA',
            options={'maxiter': 100}
        )

        return result.x, result.fun

    def solve(self) -> Dict:
        """
        Main solve method - SMP tile interface.

        Returns:
            Dictionary with solution and metadata
        """
        import time

        start_time = time.time()

        # Run QAOA
        best_params, best_energy = self.classical_optimize()
        final_counts = self.execute_quantum(best_params)

        # Find best solution
        best_bitstring = max(final_counts.items(), key=lambda x: x[1])[0]
        solution = np.array([int(b) for b in best_bitstring[::-1]])

        end_time = time.time()

        # Compute portfolio metrics
        selected_assets = np.where(solution == 1)[0]
        portfolio_return = self.problem.expected_returns[selected_assets].sum()
        portfolio_risk = np.sqrt(
            solution @ self.problem.covariances @ solution
        )

        return {
            'solution': solution,
            'selected_assets': selected_assets.tolist(),
            'portfolio_return': portfolio_return,
            'portfolio_risk': portfolio_risk,
            'target_return': self.problem.target_return,
            'objective_value': best_energy,
            'metadata': {
                'quantum_backend': self.backend,
                'qaoa_depth': self.depth,
                'shots': self.shots,
                'execution_time': end_time - start_time,
                'final_parameters': best_params.tolist(),
                'measurements': final_counts
            }
        }


# Usage example (SMP tile interface)
def create_portfolio_tile(
    returns_data: List[float],
    covariance_matrix: List[List[float]],
    target_return: float
) -> str:
    """
    Create and execute quantum portfolio tile.

    This is what gets called from the spreadsheet SMP bot.
    """
    # Prepare problem data
    problem = PortfolioProblem(
        expected_returns=np.array(returns_data),
        covariances=np.array(covariance_matrix),
        target_return=target_return,
        max_positions=10
    )

    # Create quantum tile
    tile = QAOAPortfolioTile(
        problem=problem,
        backend="ibmq_manila",
        depth=1,
        shots=1000
    )

    # Solve and return result
    result = tile.solve()

    # Format for spreadsheet output
    output = f"""Quantum Portfolio Optimization (QAOA)

Selected Assets: {result['selected_assets']}
Portfolio Return: {result['portfolio_return']:.2%}
Portfolio Risk: {result['portfolio_risk']:.2%}
Target Return: {result['target_return']:.2%}

Execution Time: {result['metadata']['execution_time']:.2f}s
Quantum Backend: {result['metadata']['quantum_backend']}
QAOA Depth: {result['metadata']['qaoa_depth']}
Shots: {result['metadata']['shots']}
"""

    return output
```

### Example Hybrid SMP Pipeline

```python
"""
Hybrid Classical-Quantum SMP Pipeline for Drug Discovery

Demonstrates how classical and quantum tiles work together
in a realistic scientific workflow.
"""

class DrugDiscoveryPipeline:
    """
    Multi-stage pipeline using both classical and quantum tiles.
    """

    def __init__(self, molecule_database):
        self.database = molecule_database

    def run(self, target_properties):
        """
        Stage 1: Classical Preprocessing
        - Filter molecules by basic criteria
        - Compute classical descriptors
        - Rank by similarity to target
        """
        classical_tile = ClassicalMolecularFilter()
        candidates = classical_tile.filter_and_rank(
            self.database,
            target_properties
        )

        """
        Stage 2: Quantum Simulation (VQE)
        - Compute ground state energies of top candidates
        - More accurate than classical methods
        - But expensive, so only for top 100
        """
        quantum_tile = VQEMolecularTile()
        top_100 = candidates[:100]

        for molecule in top_100:
            # Quantum tile computes ground state energy
            molecule.quantum_energy = quantum_tile.compute_energy(molecule)

            # Quantum tile computes electron density
            molecule.electron_density = quantum_tile.compute_density(molecule)

        """
        Stage 3: Classical Analysis
        - Use quantum results to refine predictions
        - Compute binding affinity, solubility, etc.
        """
        analysis_tile = ClassicalPropertyPredictor()
        final_ranking = analysis_tile.rank_by_properties(top_100)

        """
        Stage 4: Quantum Optimization (QAOA)
        - Optimize molecular structure for binding
        - Fine-tune geometry using quantum optimization
        """
        optimization_tile = QAOAGeometryOptimizer()
        best_molecule = final_ranking[0]
        optimized_structure = optimization_tile.optimize_geometry(
            best_molecule
        )

        return {
            'best_candidate': optimized_structure,
            'classical_candidates_processed': len(candidates),
            'quantum_simulations': len(top_100),
            'predicted_affinity': final_ranking[0].binding_affinity
        }


# Spreadsheet interface
def run_drug_discovery_smp(
    target_protein: str,
    max_candidates: int = 1000
) -> str:
    """
    SMP bot interface for drug discovery pipeline.

    User selects:
    - Target protein (from database)
    - Budget (number of quantum simulations)

    Bot coordinates:
    - Classical filtering (fast, millions of molecules)
    - Quantum simulation (slow, accurate, hundreds of molecules)
    - Classical analysis (medium speed, uses quantum results)
    - Quantum optimization (very slow, final refinement)
    """
    database = load_molecule_database()
    pipeline = DrugDiscoveryPipeline(database)

    result = pipeline.run(target_protein)

    return f"""Drug Discovery Results

Target: {target_protein}

Best Candidate: {result['best_candidate'].name}
Predicted Affinity: {result['predicted_affinity']:.2f} nM

Processing:
- Classical candidates screened: {result['classical_candidates_processed']:,}
- Quantum simulations: {result['quantum_simulations']}
- Quantum optimization: Completed

Recommended next steps:
1. Synthesize top candidate
2. Experimental validation
3. Iterate with quantum feedback
"""
```

---

## Key Takeaways for SMP White Paper

1. **Quantum Tiles Are Hybrid**: Always pair classical preprocessing with quantum execution.

2. **NISQ Constraints Are Real**: Current quantum tiles are proof-of-concept, not production-ready for most problems.

3. **Optimization Is The Sweet Spot**: QAOA and quantum annealing map well to spreadsheet use cases.

4. **Transparency Is Essential**: Users shouldn't know (or care) that a tile uses quantum computing.

5. **Near-Term Value Is Learning**: Even if quantum tiles aren't faster yet, they build expertise for when quantum advantage arrives.

6. **Error Mitigation Is Critical**: NISQ devices are noisy - SMP tiles must handle errors gracefully.

7. **Cost-Benefit Analysis Matters**: Quantum tiles have financial and latency costs - use them where justified.

---

## Sources

Due to web search rate limiting, this document is based on established quantum computing knowledge up to 2026. Key concepts are well-documented in:

- Preskill, J. (2018). "Quantum Computing in the NISQ era and beyond"
- Farhi, E. et al. (2014). "A Quantum Approximate Optimization Algorithm"
- Peruzzo, A. et al. (2014). "A variational eigenvalue solver on a photonic quantum processor"
- IBM Quantum Documentation
- D-Wave Systems Documentation
- AWS Braket Documentation

---

*Agent: Hard Logic / ML Researcher Hybrid*
*Date: 2026-03-09*
*Status: Research Complete - Awaiting Critique*
*Next Steps: Build simulation prototypes, benchmark against classical tiles*
