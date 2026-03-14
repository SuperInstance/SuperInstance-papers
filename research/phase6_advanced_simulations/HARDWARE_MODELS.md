# Hardware Models - Component Specifications

This document details the precise hardware models used in the hardware-accurate simulation framework.

## Table of Contents
1. [CPU Model: Intel Core Ultra](#cpu-model)
2. [GPU Model: NVIDIA RTX 4050](#gpu-model)
3. [Memory Model: DDR5 Subsystem](#memory-model)
4. [Interconnect Model: PCIe/CXL](#interconnect-model)
5. [Thermal Model: System Thermodynamics](#thermal-model)
6. [Validation Targets](#validation-targets)

---

## CPU Model: Intel Core Ultra {#cpu-model}

### Architecture Overview

**Meteor Lake Architecture** - Intel's first chiplet-based design for mobile processors.

#### Core Configuration

| Core Type | Microarchitecture | Count | Base Frequency | Turbo Frequency | TDP |
|-----------|-------------------|-------|----------------|-----------------|-----|
| P-Cores | Redwood Cove | 6 | 3.4 GHz | 5.4 GHz | 15W each |
| E-Cores | Crestmont | 8 | 2.4 GHz | 3.8 GHz | 3W each |
| LP-Cores | Skymont | 2 | 1.2 GHz | N/A | 1.5W each |

### Cache Hierarchy

```
┌─────────────────────────────────────────────┐
│          L3 Cache: 24 MB (Shared)           │
│  Latency: ~50 cycles, Bandwidth: ~500 GB/s  │
├─────────────────────────────────────────────┤
│  P-Core 0    P-Core 1    ...    P-Core 5    │
│  ┌──────┐    ┌──────┐            ┌──────┐   │
│  │ L2:  │    │ L2:  │            │ L2:  │   │
│  │ 2MB  │    │ 2MB  │            │ 2MB  │   │
│  │ 20c  │    │ 20c  │            │ 20c  │   │
│  └──┬───┘    └──┬───┘            └──┬───┘   │
│     │           │                   │        │
│  ┌──┴───┐    ┌──┴───┐            ┌──┴───┐   │
│  │ L1:  │    │ L1:  │            │ L1:  │   │
│  │ 48KB │    │ 48KB │            │ 48KB │   │
│  │ 12c  │    │ 12c  │            │ 12c  │   │
│  └──────┘    └──────┘            └──────┘   │
├─────────────────────────────────────────────┤
│  E-Core 0    E-Core 1    ...    E-Core 7    │
│  ┌──────┐    ┌──────┐            ┌──────┐   │
│  │ L2:  │    │ L2:  │            │ L2:  │   │
│  │ 4MB  │    │ 4MB  │            │ 4MB  │   │
│  │ Shared    (2 cores per slice) │         │   │
│  └──────┘    └──────┘            └──────┘   │
└─────────────────────────────────────────────┘
```

### Performance Modeling

#### Throughput Calculation

```python
# P-Core: IPC ~2 for FP32, ~4 for INT8
P_throughput = cores * freq_MHz * IPC * 1e-3  # GFLOPS

# E-Core: IPC ~1 for FP32, ~2 for INT8
E_throughput = cores * freq_MHz * IPC * 1e-3  # GFLOPS

# Total System Throughput
total_throughput = P_throughput + E_throughput * 0.5
```

#### Power Modeling

```python
# Dynamic Power: P_dyn ∝ C * V² * f
# Voltage scales with frequency: V ∝ f^0.5 (approximately)

voltage_ratio = sqrt(freq / base_freq)
dynamic_power = base_power * (freq / base_freq) * voltage_ratio²

# Static Power (Leakage): ~2-5W depending on temperature
static_power = base_leakage * exp((temp - 25) / 10)

total_power = dynamic_power + static_power
```

### Scheduler Model (Thread Director)

Intel's Thread Director dynamically maps threads to optimal cores:

```
Workload Analysis:
├─ High IPC, Serial → P-Core
├─ Low IPC, Parallel → E-Core
├─ Background Tasks → LP-Core
└─ Mixed → Dynamic Migration

Migration Cost: ~10,000 cycles
Latency Hiding: Store buffers handle migration
```

---

## GPU Model: NVIDIA RTX 4050 {#gpu-model}

### Architecture Overview

**Ada Lovelace Architecture** - NVIDIA's 4th gen RTX architecture.

#### Streaming Multiprocessor (SM) Layout

```
┌──────────────────────────────────────────────────┐
│               GPU: 20 SMs @ 1605 MHz             │
├──────────────────────────────────────────────────┤
│  SM Composition (per SM):                        │
│  ┌────────────────────────────────────────┐      │
│  │  128 CUDA Cores (FP32)                 │      │
│  │  4 Tensor Cores (FP16/INT8/BF16)       │      │
│  │  1 RT Core (Ray Tracing)               │      │
│  │  256 KB Register File                  │      │
│  │  128 KB L1 Data Cache / Shared Memory  │      │
│  └────────────────────────────────────────┘      │
├──────────────────────────────────────────────────┤
│  L2 Cache: 2048 KB (Unified, 4.5 MB/s per SM)   │
├──────────────────────────────────────────────────┤
│  Memory Controller: 128-bit GDDR6 @ 8 Gbps      │
│  Bandwidth: 192 GB/s (theoretical)               │
│  Capacity: 6 GB                                   │
└──────────────────────────────────────────────────┘
```

### Compute Capabilities

#### FP32 Performance
```
Peak: 20 TFLOPS (at boost clock)
Per-SM: 1 TFLOP
Formula: cores * freq * 2_ops / 1e12
```

#### Tensor Core Performance
```
FP16: 160 TFLOPS (with sparsity)
INT8: 320 TFLOPS (with sparsity)
BF16: 160 TFLOPS

Sparsity Benefit: 2x for structured 2:4 sparsity
```

#### Ray Tracing Performance
```
Triangle Intersection: 80 GT/s
BVH Traversal: 160 GB/s
Ray/Box Tests: 160 per clock per SM
```

### Memory Subsystem

#### Bandwidth Model

```python
# Theoretical Peak
peak_bandwidth = memory_freq_MHz * bus_width * transfers_per_clock / 8  # GB/s
peak_bandwidth = 8000 * 128 * 2 / 8 / 1000 = 2048 GB/s (effective)

# Real-World Efficiency
efficiency_factors = {
    'coalesced': 0.90,
    'strided': 0.60,
    'random': 0.30,
}

effective_bandwidth = peak_bandwidth * efficiency_factor * 0.192  # RTX 4050
```

#### L2 Cache Behavior

```
Hit Latency: ~200 cycles
Miss Penalty: ~300 cycles (to DRAM)
Hit Rate:
- Sequential: 80-90%
- Random: 30-50%
- Strided: 60-70%
```

### Power Model

```python
# Power Consumption Model
total_power = static + compute + memory + fan

static = 5W  # Always on
compute = util * TDP * 0.8  # Dynamic compute
memory = util_mem * 30W  # Memory controller
fan = (temp - 40) * 0.5  # If temp > 40°C

# Boost Behavior
if temp < 80 and power < TDP:
    boost_freq = min(2370, base_freq + headroom * 100)
else:
    boost_freq = base_freq
```

---

## Memory Model: DDR5 Subsystem {#memory-model}

### Architecture Overview

```
┌──────────────────────────────────────────────────┐
│           Dual-Channel DDR5 Configuration        │
├──────────────────────────────────────────────────┤
│  Channel A                        Channel B      │
│  ┌────────────┐                 ┌────────────┐  │
│  │ Sub-Channel│                 │ Sub-Channel│  │
│  │     0      │                 │     0      │  │
│  │  32-bit    │                 │  32-bit    │  │
│  └────────────┘                 └────────────┘  │
│  ┌────────────┐                 ┌────────────┐  │
│  │ Sub-Channel│                 │ Sub-Channel│  │
│  │     1      │                 │     1      │  │
│  │  32-bit    │                 │  32-bit    │  │
│  └────────────┘                 └────────────┘  │
├──────────────────────────────────────────────────┤
│  Memory Controller: Integrated in CPU            │
│  Frequency: 5600 MHz (DDR)                       │
│  Total Bandwidth: 89.6 GB/s (theoretical)       │
│  CAS Latency: 36 cycles (CL36)                   │
└──────────────────────────────────────────────────┘
```

### Timing Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| tCK | 0.357 ns | Clock cycle time (1/5600 MHz) |
| tCL | 36 cycles | CAS latency (column address to data) |
| tRCD | 36 cycles | Row to Column delay |
| tRP | 36 cycles | Row precharge time |
| tRAS | 64 cycles | Row active time |
| tRRD | 8 cycles | Row activate to activate |
| tFAW | 32 cycles | Four activate window |

### Bandwidth Model

```python
# Theoretical Peak
# 2 transfers per clock per sub-channel (DDR5)
# 2 sub-channels per channel (dual 32-bit)
# 2 channels

peak_bandwidth = (
    freq_MHz *
    2_transfers_per_clock *
    2_sub_channels *
    2_channels *
    8_bytes_per_transfer
) / 1000  # Convert to GB/s

peak_bandwidth = 5600 * 2 * 2 * 2 * 8 / 1000 / 1024 = ~70.3 GB/s
```

### Access Pattern Efficiency

```python
efficiency = {
    'sequential': {
        'prefetch_hit_rate': 0.95,
        'page_hit_rate': 0.90,
        'efficiency': 0.95,
    },
    'strided': {
        'prefetch_hit_rate': 0.70,
        'page_hit_rate': 0.60,
        'efficiency': 0.70,
    },
    'random': {
        'prefetch_hit_rate': 0.20,
        'page_hit_rate': 0.30,
        'efficiency': 0.50,
    },
}

effective_bandwidth = peak_bandwidth * efficiency[pattern]['efficiency']
```

### Power Model

```python
# Power States
P0_active = 5W  # Full speed, active transactions
P1_slow = 3W   # Slow exit mode
P2_fast = 2W   # Fast exit mode
P3_standby = 1W  # Standby
P4_shutdown = 0.5W  # Self-refresh

# Dynamic Power
dynamic_power = (
    base_power +
    (transactions_per_sec / 1e9) * 0.5W +
    (writes / total_transactions) * 0.3W  # Writes cost more
)
```

---

## Interconnect Model: PCIe/CXL {#interconnect-model}

### Architecture Overview

```
┌──────────────────────────────────────────────────┐
│              PCIe 4.0 x4 Link                    │
├──────────────────────────────────────────────────┤
│  Physical Layer:                                 │
│  - 4 lanes @ 16 GT/s per lane                    │
│  - 128b/130b encoding (98.46% efficiency)        │
│  - Theoretical: 7.88 GB/s per direction          │
├──────────────────────────────────────────────────┤
│  Data Link Layer:                                │
│  - TLP (Transaction Layer Packet) handling       │
│  - Ack/Nak protocol                              │
│  - Replay buffer                                 │
├──────────────────────────────────────────────────┤
│  Transaction Layer:                              │
│  - Memory, IO, Configuration, Message transactions│
│  - Maximum Payload Size: 256B                    │
│  - Requester ID routing                          │
├──────────────────────────────────────────────────┤
│  CXL (Compute Express Link) Support:             │
│  - CXL.io: Cache coherent IO                     │
│  - CXL.mem: Memory access over PCIe              │
│  - CXL.cache: Device caching                     │
└──────────────────────────────────────────────────┘
```

### Bandwidth Model

```python
# PCIe 4.0 Bandwidth
per_lane_bandwidth = 16 GT/s * 128/130 * 1 byte
total_bandwidth = per_lane_bandwidth * num_lanes

# x4 Link
bandwidth_x4 = 16 * 0.9846 * 1 * 4 = 63.0 GT/s
bandwidth_gb_s = 63.0 / 8 = 7.88 GB/s

# Real-World Efficiency
efficiency = {
    'dma_large': 0.95,
    'dma_small': 0.70,
    'mmio': 0.40,
}
```

### Latency Model

```python
# One-Way Latency Components
phy_latency = 10ns  # Physical layer
dll_latency = 20ns  # Data link layer
tlp_latency = 50ns  # Transaction layer
routing_latency = 30ns  # Switch/fabric
total_latency = 110ns (one-way)

# Round-Trip
rtt = total_latency * 2 = 220ns

# With DMA Setup
dma_setup = 500ns
effective_latency = rtt + dma_setup = 720ns
```

### Power Model

```python
# Per-Lane Power
power_per_lane = 0.5W  # Active transmitter
total_link_power = lanes * power_per_lane * 2  # TX + RX

# x4 Link
link_power = 4 * 0.5 * 2 = 4W

# Dynamic Scaling
utilization_power = link_power * (0.3 + 0.7 * utilization)
```

---

## Thermal Model: System Thermodynamics {#thermal-model}

### Thermal Circuit Model

```
                    Ambient (25°C)
                         │
                         │ R_case (0.5 °C/W)
                         │
                    ┌────┴────┐
                    │ Case    │
                    └────┬────┘
                         │ R_tim (0.2 °C/W)
                         │
                    ┌────┴────┐
                    │ Die     │◄─── P_dynamic
                    └────┬────┘
                         │ R_heatsink (0.8 °C/W)
                         │
                    ┌────┴────┐
                    │ Heatsink│
                    └────┬────┘
                         │ R_air (2.0 °C/W)
                         │
                    ┌────┴────┐
                    │ Air     │
                    └────┬────┘
                         │
                    ┌────┴────┐
                    │ Fan     │
                    └─────────┘
```

### Thermal Equations

```python
# Temperature Rise
ΔT = P_total * R_total

# Total Thermal Resistance
R_total = R_case + R_tim + R_heatsink + R_air
R_total = 0.5 + 0.2 + 0.8 + 2.0 = 3.5 °C/W

# Steady-State Temperature
T_die = T_ambient + P_total * R_total
T_die = 25 + 100W * 3.5 = 380°C (without cooling!)

# With Active Cooling
# Fan reduces R_air proportional to RPM
R_air_effective = R_air / (1 + fan_rpm / max_rpm)
R_air_effective = 2.0 / (1 + 0.8) = 1.1 °C/W

R_total_cooled = 0.5 + 0.2 + 0.8 + 1.1 = 2.6 °C/W
T_die_cooled = 25 + 100 * 2.6 = 285°C (still too high!)

# Real System: Heat Pipes + Vapor Chamber
R_total_real = 0.5 + 0.1 + 0.3 + 0.5 = 1.4 °C/W
T_die_real = 25 + 100 * 1.4 = 165°C (with 100W load)
```

### Thermal Mass (Transient Response)

```python
# Heat Capacity
C_thermal = 50 J/°C  # For CPU die + heatsink

# Temperature Update (Discrete Time Step)
dT/dt = (P_in - P_out) / C_thermal
P_out = (T_die - T_ambient) / R_total  # Cooling power

# Euler Integration
T_new = T_old + ((P_in - P_out) / C_thermal) * dt
```

### Throttling Behavior

```python
# Temperature Thresholds
T_light = 80°C  # Light throttling begins
T_moderate = 85°C  # Moderate throttling
T_severe = 90°C  # Severe throttling
T_critical = 100°C  # Shutdown

# Throttle Factors
if T < T_light:
    throttle = 1.0  # No throttling
elif T < T_moderate:
    throttle = 0.95  # 5% reduction
elif T < T_severe:
    throttle = 0.85  # 15% reduction
elif T < T_critical:
    throttle = 0.70  # 30% reduction
else:
    throttle = 0.0  # Shutdown

# Apply to Frequency
freq_effective = freq_base * throttle
```

---

## Validation Targets {#validation-targets}

### Accuracy Requirements

| Metric | Target | Method |
|--------|--------|--------|
| Performance Prediction | <5% error | Benchmark comparison |
| Energy Prediction | <10% error | Power meter measurement |
| Thermal Prediction | <3°C error | Thermocouple validation |

### Calibration Benchmarks

#### CPU Benchmarks
```
1. SPEC CPU 2017
   - Integer: 600.perlbench, 602.gcc, 605.mcf
   - Floating Point: 603.bwaves, 607.cactu, 619.lbm

2. Geekbench 6
   - Single-core: P-core validation
   - Multi-core: Full system validation

3. Thread Director Tests
   - Thread migration overhead
   - Workload classification accuracy
```

#### GPU Benchmarks
```
1. CUDA SDK Samples
   - Matrix Multiply (FP32, FP16)
   - Tensor Cores (matrixmulCUBLAS)
   - Bandwidth Test

2. MLPerf Inference
   - ResNet-50
   - BERT-Large
   - GPT-J (6B)

3. 3DMark
   - Time Spy (graphics)
   - Port Royal (ray tracing)
```

#### Memory Benchmarks
```
1. STREAM Benchmark
   - Copy, Scale, Add, Triad

2. Intel MLC
   - Latency matrix
   - Bandwidth vs. access size

3. Custom Tests
   - Sequential vs. random access
   - Read vs. write power
```

### Calibration Data Format

```python
calibration_data = {
    'cpu': {
        'spec_int2017_base': {
            'measured': 280,
            'simulated': 265,
            'calibration_factor': 280/265,
        },
        'spec_fp2017_base': {
            'measured': 310,
            'simulated': 295,
            'calibration_factor': 310/295,
        },
    },
    'gpu': {
        'mlperf_resnet50': {
            'measured_throughput': 850,  # images/sec
            'simulated_throughput': 820,
            'calibration_factor': 850/820,
        },
    },
    'energy': {
        'cpu_idle': {'measured': 5W, 'simulated': 4.5W},
        'cpu_load': {'measured': 45W, 'simulated': 42W},
        'gpu_idle': {'measured': 10W, 'simulated': 9W},
        'gpu_load': {'measured': 115W, 'simulated': 110W},
    },
}
```

---

## References

1. Intel Core Ultra Processor Datasheet
2. NVIDIA RTX 4050 Architecture Whitepaper
3. DDR5 SDRAM Standard (JESD79-5)
4. PCIe 4.0 Base Specification
5. CXL 2.0 Specification
6. Thermal Design Guidelines for Mobile Processors

---

**Document Version:** 1.0
**Last Updated:** 2026-03-13
**Author:** SuperInstance Research Team
