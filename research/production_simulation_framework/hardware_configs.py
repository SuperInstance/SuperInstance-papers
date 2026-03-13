#!/usr/bin/env python3
"""
Hardware Configuration Profiles for Production Simulation Framework

Pre-configured hardware profiles for common GPU/CPU architectures.
"""

from dataclasses import dataclass
from typing import Dict


@dataclass
class HardwareConfig:
    """Configuration for realistic hardware modeling."""

    # GPU/CPU Properties
    gpu_name: str = "RTX 4050"
    gpu_clock_mhz: int = 1837
    gpu_tdp_watts: float = 115.0
    gpu_cuda_cores: int = 2560
    gpu_tensor_cores: int = 80

    # Memory Hierarchy
    l1_cache_size_kb: int = 32
    l1_latency_cycles: int = 3
    l1_bandwidth_gb_per_s: float = 2000.0

    l2_cache_size_kb: int = 256
    l2_latency_cycles: int = 12
    l2_bandwidth_gb_per_s: float = 1000.0

    l3_cache_size_mb: int = 8
    l3_latency_cycles: int = 40
    l3_bandwidth_gb_per_s: float = 500.0

    dram_size_gb: int = 6
    dram_latency_cycles: int = 127
    dram_bandwidth_gb_per_s: float = 96.0

    # Network-on-Chip
    noc_hop_latency_cycles: int = 2
    noc_bandwidth_gb_per_s: float = 400.0
    noc_topology: str = "mesh"

    # Thermal Properties
    thermal_design_power_watts: float = 115.0
    max_temperature_c: float = 83.0
    thermal_resistance_c_per_w: float = 0.5

    # Energy Model
    voltage_v: float = 1.1
    dynamic_power_coefficient: float = 0.5
    static_power_watts: float = 10.0
    leakage_power_coefficient: float = 0.02

    # Cache Line Properties
    cache_line_size_bytes: int = 64

    def to_dict(self) -> Dict:
        return {
            "gpu_name": self.gpu_name,
            "gpu_clock_mhz": self.gpu_clock_mhz,
            "gpu_tdp_watts": self.gpu_tdp_watts,
            "l1_cache_kb": self.l1_cache_size_kb,
            "l2_cache_kb": self.l2_cache_size_kb,
            "l3_cache_mb": self.l3_cache_size_mb,
            "dram_gb": self.dram_size_gb
        }


# =============================================================================
# Pre-configured Hardware Profiles
# =============================================================================

# NVIDIA RTX Series
RTX_4050 = HardwareConfig(
    gpu_name="RTX 4050",
    gpu_clock_mhz=1837,
    gpu_tdp_watts=115.0,
    gpu_cuda_cores=2560,
    gpu_tensor_cores=80,
    l1_cache_size_kb=32,
    l2_cache_size_kb=256,
    l3_cache_size_mb=8,
    dram_size_gb=6,
    dram_bandwidth_gb_per_s=96.0,
    thermal_design_power_watts=115.0
)

RTX_4090 = HardwareConfig(
    gpu_name="RTX 4090",
    gpu_clock_mhz=2520,
    gpu_tdp_watts=450.0,
    gpu_cuda_cores=16384,
    gpu_tensor_cores=512,
    l1_cache_size_kb=128,
    l2_cache_size_kb=2048,
    l3_cache_size_mb=64,
    dram_size_gb=24,
    dram_bandwidth_gb_per_s=1008.0,
    thermal_design_power_watts=450.0,
    max_temperature_c=90.0
)

RTX_3090 = HardwareConfig(
    gpu_name="RTX 3090",
    gpu_clock_mhz=1695,
    gpu_tdp_watts=350.0,
    gpu_cuda_cores=10496,
    gpu_tensor_cores=328,
    l1_cache_size_kb=128,
    l2_cache_size_kb=6144,
    l3_cache_size_mb=48,
    dram_size_gb=24,
    dram_bandwidth_gb_per_s=936.0,
    thermal_design_power_watts=350.0
)

# NVIDIA Data Center
A100 = HardwareConfig(
    gpu_name="A100",
    gpu_clock_mhz=1410,
    gpu_tdp_watts=400.0,
    gpu_cuda_cores=6912,
    gpu_tensor_cores=432,
    l1_cache_size_kb=192,
    l2_cache_size_kb=40960,  # 40 MB
    l3_cache_size_mb=0,  # No traditional L3
    dram_size_gb=40,  # HBM2e
    dram_bandwidth_gb_per_s=2039.0,  # HBM2e
    dram_latency_cycles=80,  # Lower latency HBM
    thermal_design_power_watts=400.0,
    max_temperature_c=95.0
)

H100 = HardwareConfig(
    gpu_name="H100",
    gpu_clock_mhz=1980,
    gpu_tdp_watts=700.0,
    gpu_cuda_cores=16896,
    gpu_tensor_cores=528,
    l1_cache_size_kb=256,
    l2_cache_size_kb=51200,  # 50 MB
    l3_cache_size_mb=0,
    dram_size_gb=80,  # HBM3
    dram_bandwidth_gb_per_s=3352.0,  # HBM3
    dram_latency_cycles=70,
    thermal_design_power_watts=700.0,
    max_temperature_c=95.0
)

# NVIDIA Workstation
RTX_6000_ADA = HardwareConfig(
    gpu_name="RTX 6000 Ada",
    gpu_clock_mhz=2505,
    gpu_tdp_watts=300.0,
    gpu_cuda_cores=18176,
    gpu_tensor_cores=568,
    l1_cache_size_kb=128,
    l2_cache_size_kb=98304,  # 96 MB
    l3_cache_size_mb=0,
    dram_size_gb=48,
    dram_bandwidth_gb_per_s=960.0,
    thermal_design_power_watts=300.0
)

# Consumer GPUs
RTX_3080 = HardwareConfig(
    gpu_name="RTX 3080",
    gpu_clock_mhz=1710,
    gpu_tdp_watts=320.0,
    gpu_cuda_cores=8704,
    gpu_tensor_cores=272,
    l1_cache_size_kb=128,
    l2_cache_size_kb=5120,
    l3_cache_size_mb=32,
    dram_size_gb=10,
    dram_bandwidth_gb_per_s=760.0,
    thermal_design_power_watts=320.0
)

RTX_4070 = HardwareConfig(
    gpu_name="RTX 4070",
    gpu_clock_mhz=2475,
    gpu_tdp_watts=200.0,
    gpu_cuda_cores=5888,
    gpu_tensor_cores=184,
    l1_cache_size_kb=64,
    l2_cache_size_kb=3072,
    l3_cache_size_mb=24,
    dram_size_gb=12,
    dram_bandwidth_gb_per_s=504.0,
    thermal_design_power_watts=200.0
)

# AMD GPUs
AMD_RX_7900_XTX = HardwareConfig(
    gpu_name="AMD RX 7900 XTX",
    gpu_clock_mhz=2500,
    gpu_tdp_watts=355.0,
    gpu_cuda_cores=6144,  # Stream processors
    gpu_tensor_cores=192,  # AI accelerators
    l1_cache_size_kb=256,
    l2_cache_size_kb=6144,
    l3_cache_size_mb=96,  # Infinity Cache
    dram_size_gb=24,
    dram_bandwidth_gb_per_s=960.0,
    thermal_design_power_watts=355.0
)

# Intel GPUs
INTEL_ARC_A770 = HardwareConfig(
    gpu_name="Intel Arc A770",
    gpu_clock_mhz=2100,
    gpu_tdp_watts=225.0,
    gpu_cuda_cores=4096,  # Xe-cores
    gpu_tensor_cores=512,  # XMX units
    l1_cache_size_kb=128,
    l2_cache_size_kb=16384,  # 16 MB
    l3_cache_size_mb=0,
    dram_size_gb=16,
    dram_bandwidth_gb_per_s=560.0,
    thermal_design_power_watts=225.0
)

# Apple Silicon
M2_ULTRA = HardwareConfig(
    gpu_name="Apple M2 Ultra",
    gpu_clock_mhz=1395,
    gpu_tdp_watts=100.0,  # Estimated
    gpu_cuda_cores=7680,  # GPU cores
    gpu_tensor_cores=0,  # Neural Engine separate
    l1_cache_size_kb=512,
    l2_cache_size_kb=32768,  # 32 MB SLC
    l3_cache_size_mb=0,
    dram_size_gb=192,  # Unified memory
    dram_bandwidth_gb_per_s=800.0,
    dram_latency_cycles=60,  # Unified memory lower latency
    thermal_design_power_watts=100.0,
    max_temperature_c=100.0
)

# CPU-Only Configurations (for comparison)
INTEL_I9_13900K = HardwareConfig(
    gpu_name="Intel i9-13900K",
    gpu_clock_mhz=5800,  # Boost clock
    gpu_tdp_watts=253.0,
    gpu_cuda_cores=0,  # CPU cores
    gpu_tensor_cores=0,
    l1_cache_size_kb=80,  # Per P-core
    l1_latency_cycles=4,
    l2_cache_size_kb=2048,  # Per P-core
    l2_latency_cycles=14,
    l3_cache_size_mb=36,
    l3_latency_cycles=50,
    dram_size_gb=128,
    dram_latency_cycles=100,
    dram_bandwidth_gb_per_s=89.0,  # DDR5-5600
    thermal_design_power_watts=253.0
)

AMD_R9_7950X = HardwareConfig(
    gpu_name="AMD Ryzen 9 7950X",
    gpu_clock_mhz=5700,
    gpu_tdp_watts=170.0,
    gpu_cuda_cores=0,  # CPU cores
    gpu_tensor_cores=0,
    l1_cache_size_kb=64,
    l1_latency_cycles=4,
    l2_cache_size_kb=1024,
    l2_latency_cycles=12,
    l3_cache_size_mb=64,
    l3_latency_cycles=46,
    dram_size_gb=128,
    dram_latency_cycles=95,
    dram_bandwidth_gb_per_s=83.0,  # DDR5-5200
    thermal_design_power_watts=170.0
)


# =============================================================================
# Hardware Selection Utilities
# =============================================================================

def get_config_by_name(name: str) -> HardwareConfig:
    """
    Get hardware configuration by name.

    Args:
        name: Hardware name (case-insensitive, partial matches allowed)

    Returns:
        HardwareConfig for the specified hardware

    Raises:
        ValueError: If no matching hardware found
    """
    configs = {
        "rtx4050": RTX_4050,
        "rtx4090": RTX_4090,
        "rtx3090": RTX_3090,
        "a100": A100,
        "h100": H100,
        "rtx6000": RTX_6000_ADA,
        "rtx3080": RTX_3080,
        "rtx4070": RTX_4070,
        "rx7900": AMD_RX_7900_XTX,
        "arc770": INTEL_ARC_A770,
        "m2ultra": M2_ULTRA,
        "i913900k": INTEL_I9_13900K,
        "r97950x": AMD_R9_7950X,
    }

    # Normalize name
    normalized = name.lower().replace(" ", "").replace("-", "").replace("_", "")

    # Exact match
    if normalized in configs:
        return configs[normalized]

    # Partial match
    for key, config in configs.items():
        if key in normalized or normalized in key:
            return config

    # Suggest similar names
    suggestions = [config.gpu_name for config in configs.values()
                   if normalized[:3] in config.gpu_name.lower()]

    raise ValueError(
        f"Unknown hardware: {name}. "
        f"Available: {list(configs.keys())}. "
        f"Did you mean: {suggestions[:3]}?"
    )


def list_available_configs() -> Dict[str, str]:
    """List all available hardware configurations."""
    return {
        "RTX 4050": "Consumer GPU - Entry level Ada Lovelace",
        "RTX 4090": "Consumer GPU - High-end Ada Lovelace",
        "RTX 3090": "Consumer GPU - High-end Ampere",
        "A100": "Data Center GPU - Ampere architecture",
        "H100": "Data Center GPU - Hopper architecture",
        "RTX 6000 Ada": "Workstation GPU - Ada Lovelace",
        "RTX 3080": "Consumer GPU - Mid-high Ampere",
        "RTX 4070": "Consumer GPU - Mid-range Ada Lovelace",
        "AMD RX 7900 XTX": "Consumer GPU - RDNA3",
        "Intel Arc A770": "Consumer GPU - Xe HPG",
        "Apple M2 Ultra": "SoC - Apple Silicon",
        "Intel i9-13900K": "CPU - Raptor Lake",
        "AMD Ryzen 9 7950X": "CPU - Zen 4"
    }


def auto_detect_hardware() -> HardwareConfig:
    """
    Auto-detect current hardware and return matching config.

    Returns:
        HardwareConfig matching detected hardware, or RTX_4050 as default
    """
    try:
        import subprocess

        # Try nvidia-smi for NVIDIA GPUs
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0:
            gpu_name = result.stdout.strip().split('\n')[0]

            # Match to config
            if "RTX 4050" in gpu_name:
                return RTX_4050
            elif "RTX 4090" in gpu_name:
                return RTX_4090
            elif "RTX 3090" in gpu_name:
                return RTX_3090
            elif "A100" in gpu_name:
                return A100
            elif "H100" in gpu_name:
                return H100
            elif "RTX 3080" in gpu_name:
                return RTX_3080
            elif "RTX 4070" in gpu_name:
                return RTX_4070

            print(f"Detected GPU: {gpu_name} (using default config)")

    except (FileNotFoundError, subprocess.TimeoutExpired, Exception):
        pass

    # Default to RTX 4050
    print("Hardware auto-detection failed, using default RTX 4050 config")
    return RTX_4050


# =============================================================================
# Example Usage
# =============================================================================

if __name__ == "__main__":
    print("Available Hardware Configurations:")
    print("=" * 80)

    for name, description in list_available_configs().items():
        print(f"{name:25s} - {description}")

    print("\n" + "=" * 80)
    print("Auto-detecting hardware...")
    print("=" * 80)

    config = auto_detect_hardware()
    print(f"Detected: {config.gpu_name}")
    print(f"Config: {json.dumps(config.to_dict(), indent=2)}")
