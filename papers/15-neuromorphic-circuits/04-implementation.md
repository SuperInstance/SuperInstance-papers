# Implementation: Neuromorphic Circuit Designs

**Author:** Casey DiGennaro
**Affiliation:** SuperInstance Research
**Date:** March 2026

---

## Overview

This chapter presents concrete circuit designs and algorithms for implementing SuperInstance primitives using neuromorphic hardware. We describe neuron circuits, synaptic circuits, network architectures, and the mapping from abstract algorithms to physical implementations.

---

## 1. Neuron Circuit Design

### 1.1 Leaky Integrate-and-Fire Circuit

```
                    Vdd
                     |
                     |
                  +--+--+
                  | PMOS|  Reset Switch
                  +--+--+
                     |
    +----------------+----------------+
    |                |                |
    |             +--+--+             |
    |             |Cap C|  Membrane   |
    |             +--+--+  Capacitor  |
    |                |                |
    |                +--------+       |
    |                |        |       |
    |             +--+--+  +--+--+    |
    |             |Leak|  |Input|    |
    |             |Res |  |Curr |    |
    |             +--+--+  +--+--+    |
    |                |        |       |
    +----------------+--------+-------+
                     |
                   ===== GND

    Membrane Potential: V = Q/C
    Time Constant: tau = R_leak * C
```

**Circuit Parameters:**
- Membrane capacitance: C = 100 fF
- Leak resistance: R_leak = 10 MOhm
- Time constant: tau = R * C = 1 ms
- Threshold voltage: V_th = 100 mV

### 1.2 Threshold Comparator

```python
class ThresholdComparator:
    """
    Asynchronous threshold detection circuit.
    Generates spike when membrane potential exceeds threshold.
    """

    def __init__(self, threshold: float, refractory_period: float):
        self.threshold = threshold
        self.refractory_period = refractory_period
        self.last_spike_time = -float('inf')

    def check(self, V: float, t: float) -> bool:
        """Check if threshold crossed and not refractory."""
        if t - self.last_spike_time < self.refractory_period:
            return False  # Still refractory

        if V >= self.threshold:
            self.last_spike_time = t
            return True

        return False
```

### 1.3 Adaptive Threshold Circuit

Implements confidence cascade through threshold adaptation:

```python
class AdaptiveThreshold:
    """
    Threshold adaptation for confidence cascade mapping.
    Zone 1 (Confident): Low threshold, easy spiking
    Zone 2 (Transition): Medium threshold, adaptive
    Zone 3 (Uncertain): High threshold, conservative
    """

    def __init__(self,
                 theta_low: float = 50e-3,    # 50 mV
                 theta_mid: float = 100e-3,   # 100 mV
                 theta_high: float = 150e-3,  # 150 mV
                 adapt_rate: float = 0.1):
        self.theta_low = theta_low
        self.theta_mid = theta_mid
        self.theta_high = theta_high
        self.theta_current = theta_mid
        self.adapt_rate = adapt_rate
        self.spike_trace = 0.0

    def update(self, spiked: bool, dt: float):
        """Update threshold based on recent activity."""
        # Update spike trace
        decay = np.exp(-dt / 10e-3)  # 10ms trace decay
        self.spike_trace = decay * self.spike_trace + (1 - decay) * float(spiked)

        # Adapt threshold based on zone
        if self.spike_trace > 0.7:  # High activity (Zone 1)
            target = self.theta_low
        elif self.spike_trace < 0.3:  # Low activity (Zone 3)
            target = self.theta_high
        else:  # Medium activity (Zone 2)
            target = self.theta_mid

        # Smooth adaptation
        self.theta_current += self.adapt_rate * (target - self.theta_current)

        return self.theta_current
```

---

## 2. Synaptic Circuit Design

### 2.1 Excitatory Synapse

```
    Pre-synaptic Spike
           |
           v
        +--+--+
        | AND |    Coincidence Detection
        +--+--+
           |
        +--+--+     DAC
        | WxI |  <-- Weight Storage
        +--+--+
           |
           v
    Post-synaptic Current (PSC)
           |
           v
    Membrane Integration
```

### 2.2 Synaptic Weight Circuit

```python
class SynapticCircuit:
    """
    Memristive or digital synaptic weight storage.
    Supports spike-timing-dependent plasticity (STDP).
    """

    def __init__(self,
                 weight: float,
                 w_min: float = 0.0,
                 w_max: float = 1.0,
                 learning_rate: float = 0.01):
        self.weight = np.clip(weight, w_min, w_max)
        self.w_min = w_min
        self.w_max = w_max
        self.learning_rate = learning_rate
        self.pre_trace = 0.0
        self.post_trace = 0.0

    def integrate(self, pre_spike: bool) -> float:
        """Generate post-synaptic current."""
        if pre_spike:
            return self.weight
        return 0.0

    def update_traces(self, pre_spike: bool, post_spike: bool, dt: float):
        """Update pre and post synaptic traces."""
        decay = np.exp(-dt / 20e-3)  # 20ms trace

        self.pre_trace = decay * self.pre_trace + float(pre_spike)
        self.post_trace = decay * self.post_trace + float(post_spike)

    def stdp_update(self, pre_spike: bool, post_spike: bool):
        """Spike-timing-dependent plasticity."""
        if pre_spike and self.post_trace > 0:
            # Pre after post: LTP (potentiation)
            delta_w = self.learning_rate * self.post_trace
            self.weight = min(self.w_max, self.weight + delta_w)

        if post_spike and self.pre_trace > 0:
            # Post after pre: LTD (depression)
            delta_w = -self.learning_rate * self.pre_trace
            self.weight = max(self.w_min, self.weight + delta_w)
```

### 2.3 Origin Tracking Synapse

Implements SuperInstance origin tracking through weight traces:

```python
class OriginTrackingSynapse(SynapticCircuit):
    """
    Synaptic circuit with origin tracking.
    Maintains history of weight changes for provenance.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.origin_log = []
        self.trace_window = 100  # Keep last 100 events

    def record_origin(self, event_type: str, source: str, timestamp: float):
        """Record origin information for weight change."""
        origin = {
            'type': event_type,      # 'LTP', 'LTD', 'init', 'prune'
            'source': source,         # Which input caused change
            'timestamp': timestamp,
            'weight': self.weight
        }
        self.origin_log.append(origin)

        # Maintain bounded history
        if len(self.origin_log) > self.trace_window:
            self.origin_log.pop(0)

    def get_origin_trace(self) -> list:
        """Retrieve origin history."""
        return self.origin_log.copy()

    def stdp_update(self, pre_spike: bool, post_spike: bool, timestamp: float):
        """STDP with origin tracking."""
        old_weight = self.weight
        super().stdp_update(pre_spike, post_spike)

        if self.weight != old_weight:
            event_type = 'LTP' if self.weight > old_weight else 'LTD'
            self.record_origin(event_type, 'STDP', timestamp)
```

---

## 3. Network Architecture

### 3.1 Layer Implementation

```python
class NeuromorphicLayer:
    """
    A layer of LIF neurons with configurable connectivity.
    Implements SuperInstance primitives through collective dynamics.
    """

    def __init__(self,
                 n_neurons: int,
                 n_inputs: int,
                 tau: float = 20e-3,      # 20ms time constant
                 threshold: float = 100e-3, # 100mV threshold
                 refractory: float = 2e-3): # 2ms refractory

        self.n_neurons = n_neurons
        self.n_inputs = n_inputs

        # Neuron states
        self.V = np.zeros(n_neurons)  # Membrane potentials
        self.tau = tau
        self.threshold = threshold
        self.refractory = refractory
        self.last_spike = np.full(n_neurons, -float('inf'))

        # Synaptic weights (n_neurons x n_inputs)
        self.W = np.random.uniform(0.3, 0.7, (n_neurons, n_inputs))

        # Adaptive thresholds for confidence cascade
        self.adaptive_thresholds = [
            AdaptiveThreshold() for _ in range(n_neurons)
        ]

    def forward(self,
                input_spikes: np.ndarray,
                t: float,
                dt: float) -> np.ndarray:
        """
        Forward pass: integrate inputs and generate spikes.

        Args:
            input_spikes: Binary spike array (n_inputs,)
            t: Current time
            dt: Time step

        Returns:
            output_spikes: Binary spike array (n_neurons,)
        """
        # Compute synaptic input current
        I_syn = self.W @ input_spikes.astype(float)

        # Leaky integration
        alpha = np.exp(-dt / self.tau)
        self.V = alpha * self.V + I_syn

        # Check thresholds with adaptation
        output_spikes = np.zeros(self.n_neurons)

        for i in range(self.n_neurons):
            # Get adaptive threshold
            theta_i = self.adaptive_thresholds[i].theta_current

            # Check spike condition
            if self.V[i] >= theta_i and (t - self.last_spike[i]) >= self.refractory:
                output_spikes[i] = 1
                self.V[i] -= theta_i  # Reset by subtraction
                self.last_spike[i] = t

            # Update adaptive threshold
            self.adaptive_thresholds[i].update(output_spikes[i], dt)

        return output_spikes

    def get_confidence_state(self) -> np.ndarray:
        """
        Get confidence zone for each neuron.
        Returns: 1 (confident), 2 (transition), 3 (uncertain)
        """
        zones = np.zeros(self.n_neurons)

        for i in range(self.n_neurons):
            trace = self.adaptive_thresholds[i].spike_trace
            if trace > 0.7:
                zones[i] = 1  # Zone 1: Confident
            elif trace < 0.3:
                zones[i] = 3  # Zone 3: Uncertain
            else:
                zones[i] = 2  # Zone 2: Transition

        return zones
```

### 3.2 SuperInstance Network

```python
class SuperInstanceNeuromorphic:
    """
    Complete neuromorphic implementation of SuperInstance primitives.
    """

    def __init__(self, layer_sizes: list):
        self.layers = []

        for i in range(len(layer_sizes) - 1):
            layer = NeuromorphicLayer(
                n_neurons=layer_sizes[i + 1],
                n_inputs=layer_sizes[i]
            )
            self.layers.append(layer)

        # Origin tracking
        self.origin_registry = {}

        # Time tracking
        self.t = 0.0

    def forward(self, input_spikes: np.ndarray, dt: float) -> np.ndarray:
        """Forward propagation through all layers."""
        spikes = input_spikes

        for i, layer in enumerate(self.layers):
            spikes = layer.forward(spikes, self.t, dt)

            # Record origin for tracking
            active_neurons = np.where(spikes > 0)[0]
            for n in active_neurons:
                key = f"layer_{i}_neuron_{n}"
                if key not in self.origin_registry:
                    self.origin_registry[key] = []
                self.origin_registry[key].append({
                    'time': self.t,
                    'layer': i,
                    'neuron': n,
                    'source': f"layer_{i-1}" if i > 0 else "input"
                })

        self.t += dt
        return spikes

    def get_origin_trace(self, layer: int, neuron: int) -> list:
        """Retrieve origin trace for specific neuron."""
        key = f"layer_{layer}_neuron_{neuron}"
        return self.origin_registry.get(key, [])

    def get_confidence_cascade(self) -> dict:
        """Get confidence state across all layers."""
        cascade = {}
        for i, layer in enumerate(self.layers):
            cascade[f"layer_{i}"] = {
                'zones': layer.get_confidence_state(),
                'mean_confidence': np.mean(layer.get_confidence_state())
            }
        return cascade

    def get_rate_encoding(self) -> dict:
        """Get spike rates (rate-based mechanics)."""
        rates = {}
        window = 100  # Last 100 timesteps

        for i, layer in enumerate(self.layers):
            # Compute firing rate from recent spikes
            recent_activity = []
            for neuron_idx in range(layer.n_neurons):
                # Count spikes in window
                spike_count = sum(
                    1 for o in self.origin_registry.values()
                    if any(e['layer'] == i and e['neuron'] == neuron_idx
                           and self.t - e['time'] < window * dt for e in o)
                )
                rate = spike_count / (window * dt)  # Hz
                recent_activity.append(rate)

            rates[f"layer_{i}"] = np.array(recent_activity)

        return rates
```

---

## 4. Learning Implementation

### 4.1 Surrogate Gradient Backpropagation

```python
class SurrogateGradientTrainer:
    """
    Train neuromorphic network using surrogate gradients.
    Enables backpropagation through spike discontinuities.
    """

    def __init__(self, network: SuperInstanceNeuromorphic, lr: float = 0.01):
        self.network = network
        self.lr = lr

    def surrogate_derivative(self, V: np.ndarray, threshold: float) -> np.ndarray:
        """
        Surrogate gradient for spike function.
        Uses piecewise linear surrogate.
        """
        # Piecewise linear surrogate
        width = 10e-3  # 10mV width
        grad = np.zeros_like(V)

        above = V > threshold
        below = V < threshold - width

        grad[~above & ~below] = 1.0 / width
        grad[above] = 0.0
        grad[below] = 0.0

        return grad

    def compute_loss(self,
                     output_spikes: np.ndarray,
                     target: np.ndarray) -> float:
        """Cross-entropy loss on spike rates."""
        # Convert spikes to rates
        rate = output_spikes  # Simplified for single timestep

        # Softmax over rates
        exp_rate = np.exp(rate - np.max(rate))
        prob = exp_rate / np.sum(exp_rate)

        # Cross-entropy
        loss = -np.sum(target * np.log(prob + 1e-10))
        return loss

    def backward(self,
                 input_spikes: np.ndarray,
                 target: np.ndarray,
                 dt: float):
        """
        Backpropagation through time with surrogate gradients.
        """
        # Forward pass (already done, storing activations)
        spikes = input_spikes
        activations = [spikes]
        membrane_potentials = []

        for layer in self.network.layers:
            # Store membrane potential before spike
            membrane_potentials.append(layer.V.copy())
            spikes = layer.forward(spikes, self.network.t, dt)
            activations.append(spikes)

        # Compute output loss
        output = activations[-1]
        loss = self.compute_loss(output, target)

        # Backward pass
        grad_output = output - target  # Gradient of cross-entropy

        for i in reversed(range(len(self.network.layers))):
            layer = self.network.layers[i]
            V = membrane_potentials[i]

            # Surrogate gradient
            surrogate = self.surrogate_derivative(V, layer.threshold)

            # Gradient through threshold
            grad_V = grad_output * surrogate

            # Gradient to weights
            pre_activations = activations[i]
            grad_W = np.outer(grad_V, pre_activations)

            # Update weights
            layer.W -= self.lr * grad_W

            # Gradient to previous layer
            if i > 0:
                grad_output = layer.W.T @ grad_V

        return loss
```

### 4.2 Training Loop

```python
def train_neuromorphic(network: SuperInstanceNeuromorphic,
                       train_data: list,
                       epochs: int = 10,
                       dt: float = 1e-3,
                       lr: float = 0.01):
    """
    Training loop for neuromorphic network.

    Args:
        network: SuperInstance neuromorphic network
        train_data: List of (input_spikes, target) tuples
        epochs: Number of training epochs
        dt: Time step
        lr: Learning rate
    """
    trainer = SurrogateGradientTrainer(network, lr)

    for epoch in range(epochs):
        total_loss = 0.0
        correct = 0

        for input_spikes, target in train_data:
            # Reset network state
            network.t = 0.0
            for layer in network.layers:
                layer.V = np.zeros(layer.n_neurons)

            # Forward + backward
            loss = trainer.backward(input_spikes, target, dt)
            total_loss += loss

            # Check accuracy
            output = network.forward(input_spikes, dt)
            if np.argmax(output) == np.argmax(target):
                correct += 1

        accuracy = correct / len(train_data)
        avg_loss = total_loss / len(train_data)

        print(f"Epoch {epoch+1}/{epochs}: Loss={avg_loss:.4f}, Acc={accuracy:.2%}")
```

---

## 5. FPGA Implementation

### 5.1 Verilog Neuron Module

```verilog
// LIF Neuron Module for FPGA
module lif_neuron #(
    parameter THRESHOLD = 32'h00666666,  // 100mV in Q1.31
    parameter TAU = 16'd20,               // 20 timesteps
    parameter REFRACTORY = 16'd2          // 2 timesteps refractory
)(
    input wire clk,
    input wire rst,
    input wire [31:0] synaptic_current,
    output reg spike,
    output reg [31:0] membrane_potential
);

    // Internal state
    reg [31:0] V;              // Membrane potential
    reg [15:0] refractory_cnt; // Refractory counter
    reg [31:0] decay_factor;   // Precomputed decay

    // Initialize
    initial begin
        V = 0;
        spike = 0;
        refractory_cnt = 0;
        decay_factor = 32'h3E4CCCCD; // exp(-1/20) in Q1.31
    end

    // Neuron dynamics
    always @(posedge clk or posedge rst) begin
        if (rst) begin
            V <= 0;
            spike <= 0;
            refractory_cnt <= 0;
        end else begin
            // Refractory period check
            if (refractory_cnt > 0) begin
                refractory_cnt <= refractory_cnt - 1;
                spike <= 0;
            end else begin
                // Leaky integration
                V <= (V * decay_factor) + synaptic_current;

                // Threshold check
                if (V >= THRESHOLD) begin
                    spike <= 1;
                    V <= V - THRESHOLD;  // Reset by subtraction
                    refractory_cnt <= REFRACTORY;
                end else begin
                    spike <= 0;
                end
            end
        end
    end

    assign membrane_potential = V;

endmodule
```

### 5.2 Synaptic Weight Memory

```verilog
// Synaptic weight memory with STDP
module synaptic_memory #(
    parameter N_NEURONS = 256,
    parameter N_INPUTS = 784,
    parameter WEIGHT_BITS = 8
)(
    input wire clk,
    input wire rst,
    input wire [$clog2(N_NEURONS)-1:0] neuron_addr,
    input wire [$clog2(N_INPUTS)-1:0] input_addr,
    input wire read_en,
    input wire write_en,
    input wire [WEIGHT_BITS-1:0] weight_in,
    output reg [WEIGHT_BITS-1:0] weight_out
);

    // Weight storage: N_NEURONS x N_INPUTS
    reg [WEIGHT_BITS-1:0] weights [0:N_NEURONS-1][0:N_INPUTS-1];

    // Read operation
    always @(posedge clk) begin
        if (read_en) begin
            weight_out <= weights[neuron_addr][input_addr];
        end
    end

    // Write operation (STDP update)
    always @(posedge clk) begin
        if (write_en) begin
            weights[neuron_addr][input_addr] <= weight_in;
        end
    end

endmodule
```

---

## 6. Energy Measurement

### 6.1 Power Analysis

```python
def estimate_power(network: SuperInstanceNeuromorphic,
                   activity_stats: dict) -> dict:
    """
    Estimate power consumption of neuromorphic network.

    Returns breakdown of:
    - Static power (leakage)
    - Dynamic power (switching)
    - Communication power
    - Memory power
    """
    # Technology parameters (45nm CMOS)
    P_static_per_neuron = 1e-9      # 1nW static per neuron
    P_spike = 0.1e-12               # 0.1pJ per spike
    P_synapse = 0.01e-12            # 0.01pJ per synaptic op
    P_memory_read = 1e-12           # 1pJ per memory read
    P_communication = 0.1e-12       # 0.1pJ per bit transmitted

    total_neurons = sum(l.n_neurons for l in network.layers)
    total_synapses = sum(l.n_neurons * l.n_inputs for l in network.layers)

    # Static power
    P_static = total_neurons * P_static_per_neuron

    # Dynamic power from spikes
    spike_rate = activity_stats.get('mean_spike_rate', 0.05)  # 5% activity
    P_dynamic = total_neurons * spike_rate * P_spike

    # Synaptic power
    P_synaptic = total_synapses * spike_rate * P_synapse

    # Memory power
    P_memory = total_synapses * P_memory_read * spike_rate

    # Communication power (1-bit spikes)
    P_comm = total_neurons * P_communication * spike_rate

    total = P_static + P_dynamic + P_synaptic + P_memory + P_comm

    return {
        'static': P_static,
        'dynamic': P_dynamic,
        'synaptic': P_synaptic,
        'memory': P_memory,
        'communication': P_comm,
        'total': total,
        'efficiency_vs_digital': 205e-12 / (total / spike_rate) if spike_rate > 0 else 0
    }
```

---

## 7. Code Summary

| Component | Description | Lines of Code |
|-----------|-------------|---------------|
| ThresholdComparator | Spike detection | 20 |
| AdaptiveThreshold | Confidence cascade | 35 |
| SynapticCircuit | Weight storage + STDP | 45 |
| OriginTrackingSynapse | Provenance tracking | 25 |
| NeuromorphicLayer | Layer implementation | 60 |
| SuperInstanceNeuromorphic | Full network | 80 |
| SurrogateGradientTrainer | Learning algorithm | 70 |
| FPGA Modules | Hardware description | 100 |

**Total:** ~435 lines of core implementation

---

**Next:** [05-validation.md](./05-validation.md) - Experiments and benchmarks

---

**Citation:**
```bibtex
@phdthesis{digennaro2026neuromorphic_impl,
  title={Implementation: Neuromorphic Circuit Designs},
  author={DiGennaro, Casey},
  booktitle={Neuromorphic Circuits for SuperInstance Architecture},
  year={2026},
  institution={SuperInstance Research},
  note={Dissertation Chapter 4: Implementation}
}
```
