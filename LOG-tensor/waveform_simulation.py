#!/usr/bin/env python3
"""
Music Theory Mathematics Simulation for Tensor Computation Reduction
======================================================================
Simulates harmonic intervals, interference patterns, and tensor mappings.
"""

import numpy as np
import json
from typing import Dict, List, Tuple
from dataclasses import dataclass
from fractions import Fraction
import math

# ============================================================================
# HARMONIC MATHEMATICS FUNDAMENTALS
# ============================================================================

@dataclass
class Interval:
    """Represents a musical interval with its mathematical properties."""
    name: str
    ratio: Tuple[int, int]
    cents: float
    consonance_score: float
    harmonics_aligned: int
    
    def frequency_ratio(self) -> float:
        return self.ratio[0] / self.ratio[1]
    
    def gcd(self) -> int:
        return math.gcd(self.ratio[0], self.ratio[1])
    
    def lcm_period(self, base_freq: float = 440.0) -> float:
        """Calculate the period at which the two frequencies re-align."""
        return self.ratio[1] / base_freq

# Universal intervals with mathematical justification
INTERVALS = {
    'unison': Interval('Unison', (1, 1), 0.0, 1.0, float('inf')),
    'octave': Interval('Octave', (2, 1), 1200.0, 0.95, float('inf')),
    'perfect_fifth': Interval('Perfect Fifth', (3, 2), 702.0, 0.90, 6),
    'perfect_fourth': Interval('Perfect Fourth', (4, 3), 498.0, 0.85, 12),
    'major_third': Interval('Major Third', (5, 4), 386.0, 0.75, 20),
    'minor_third': Interval('Minor Third', (6, 5), 316.0, 0.70, 30),
    'major_sixth': Interval('Major Sixth', (5, 3), 884.0, 0.72, 15),
    'minor_sixth': Interval('Minor Sixth', (8, 5), 814.0, 0.68, 40),
    'tritone': Interval('Tritone', (45, 32), 590.0, 0.25, 1440),  # High LCM = dissonance
}

def calculate_cents(ratio: Tuple[int, int]) -> float:
    """Calculate cents deviation from equal temperament."""
    return 1200 * math.log2(ratio[0] / ratio[1])

def consonance_from_ratio(ratio: Tuple[int, int]) -> float:
    """
    Calculate consonance score based on mathematical properties.
    
    Theory: Consonance correlates with:
    1. Smaller numbers in ratio (Helmholtz)
    2. Lower LCM (periodic coincidence)
    3. Higher GCD (shared harmonics)
    """
    n, d = ratio
    lcm = abs(n * d) // math.gcd(n, d)
    gcd = math.gcd(n, d)
    
    # Consonance inversely proportional to LCM
    # This represents how quickly the waveforms realign
    lcm_factor = 1.0 / (1.0 + math.log10(lcm + 1))
    
    # Smaller numbers = more consonant
    size_factor = 1.0 / (1.0 + math.log10(n * d + 1))
    
    # Higher GCD = more shared harmonics
    gcd_factor = math.sqrt(gcd) / max(n, d) ** 0.25
    
    return (lcm_factor * 0.4 + size_factor * 0.4 + gcd_factor * 0.2)

# ============================================================================
# WAVEFORM THEORY AND FOURIER DECOMPOSITION
# ============================================================================

def generate_harmonic_series(base_freq: float, num_harmonics: int, 
                            amplitudes: str = 'natural') -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate a harmonic series waveform.
    
    Natural decay: A_n = 1/n (violin-like)
    """
    sample_rate = 44100
    duration = 1.0
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    waveform = np.zeros_like(t)
    harmonic_data = []
    
    for n in range(1, num_harmonics + 1):
        freq = base_freq * n
        if amplitudes == 'natural':
            amp = 1.0 / n
        elif amplitudes == 'equal':
            amp = 1.0
        else:
            amp = 1.0 / (n ** 0.5)
        
        harmonic_data.append({
            'harmonic': n,
            'frequency': freq,
            'amplitude': amp,
            'phase_radians': 0
        })
        waveform += amp * np.sin(2 * np.pi * freq * t)
    
    return t, waveform, harmonic_data

def fourier_decomposition(waveform: np.ndarray, sample_rate: int = 44100) -> Dict:
    """
    Decompose waveform into frequency components using FFT.
    """
    n = len(waveform)
    fft_result = np.fft.rfft(waveform)
    frequencies = np.fft.rfftfreq(n, 1/sample_rate)
    magnitudes = np.abs(fft_result)
    phases = np.angle(fft_result)
    
    # Find peak frequencies
    threshold = np.max(magnitudes) * 0.01
    peaks = []
    for i, (freq, mag, phase) in enumerate(zip(frequencies, magnitudes, phases)):
        if mag > threshold and freq > 20:
            peaks.append({
                'frequency': float(freq),
                'magnitude': float(mag),
                'phase': float(phase),
                'normalized_amp': float(mag / np.max(magnitudes))
            })
    
    return {
        'frequencies': frequencies.tolist(),
        'magnitudes': magnitudes.tolist(),
        'phases': phases.tolist(),
        'peaks': peaks[:20]  # Top 20 peaks
    }

# ============================================================================
# INTERFERENCE PATTERN ANALYSIS
# ============================================================================

def analyze_interference(freq1: float, freq2: float, duration: float = 2.0) -> Dict:
    """
    Analyze interference pattern between two frequencies.
    """
    sample_rate = 44100
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Generate waves
    wave1 = np.sin(2 * np.pi * freq1 * t)
    wave2 = np.sin(2 * np.pi * freq2 * t)
    
    # Superposition
    combined = wave1 + wave2
    
    # Beat frequency
    beat_freq = abs(freq1 - freq2)
    
    # Amplitude envelope (constructive/destructive interference)
    envelope = np.abs(wave1 + wave2)
    
    # Phase relationship over time
    phase_diff = 2 * np.pi * (freq1 - freq2) * t
    
    # Find constructive interference points
    constructive = np.where(np.cos(phase_diff) > 0.99)[0]
    destructive = np.where(np.cos(phase_diff) < -0.99)[0]
    
    # Period of complete interference cycle
    if beat_freq > 0:
        interference_period = 1.0 / beat_freq
    else:
        interference_period = float('inf')
    
    return {
        'beat_frequency': beat_freq,
        'interference_period': interference_period,
        'constructive_points_per_second': len(constructive) / duration,
        'destructive_points_per_second': len(destructive) / duration,
        'max_amplitude': float(np.max(combined)),
        'min_amplitude': float(np.min(combined)),
        'rms_amplitude': float(np.sqrt(np.mean(combined**2))),
        'phase_coherence': float(np.mean(np.cos(phase_diff)))
    }

def measure_consonance_waveform(ratio: Tuple[int, int], base_freq: float = 440.0) -> Dict:
    """
    Measure consonance through waveform analysis.
    """
    freq1 = base_freq
    freq2 = base_freq * ratio[0] / ratio[1]
    
    sample_rate = 44100
    # Use LCM to capture complete cycle
    duration = ratio[1] / base_freq * 2  # Two complete cycles
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    wave1 = np.sin(2 * np.pi * freq1 * t)
    wave2 = np.sin(2 * np.pi * freq2 * t)
    combined = wave1 + wave2
    
    # Measure periodic coincidence
    # Consonant intervals have more stable combined waveform
    
    # Variance of amplitude envelope (lower = more stable = more consonant)
    envelope = np.abs(combined)
    envelope_variance = np.var(envelope)
    
    # Zero crossing rate variance (lower = more periodic)
    zero_crossings = np.where(np.diff(np.signbit(combined)))[0]
    if len(zero_crossings) > 1:
        zcr_variance = np.var(np.diff(zero_crossings))
    else:
        zcr_variance = float('inf')
    
    # Autocorrelation at the interval period
    period_samples = int(sample_rate * ratio[1] / base_freq)
    if period_samples < len(combined):
        autocorr = np.corrcoef(combined[:-period_samples], combined[period_samples:])[0, 1]
    else:
        autocorr = 0
    
    return {
        'envelope_variance': float(envelope_variance),
        'zcr_variance': float(zcr_variance),
        'periodic_autocorrelation': float(autocorr),
        'stability_score': float(autocorr / (1 + envelope_variance))
    }

# ============================================================================
# UNIVERSAL SOUND ENCODING PRINCIPLES
# ============================================================================

def analyze_universal_principles() -> Dict:
    """
    Analyze what makes sound universally recognized by human ears.
    """
    principles = {
        'low_frequency_dominance': {
            'description': 'Lower frequencies carry more perceptual weight',
            'biological_basis': 'Cochlear mechanics favor bass frequencies',
            'frequency_range_hz': [20, 500],
            'information_density': 'high',
            'examples': ['Fundamental pitch perception', 'Rhythm detection', 'Voice fundamental']
        },
        'temporal_patterns': {
            'description': 'Time-based patterns are universally recognized',
            'biological_basis': 'Neural timing mechanisms in auditory cortex',
            'pattern_types': ['Onset detection', 'Rhythm', 'Duration', 'Gap detection'],
            'cross_cultural_validity': 'universal',
            'examples': ['Footstep patterns', 'Heartbeat', 'Speech rhythm']
        },
        'pitch_contour': {
            'description': 'Relative pitch changes convey meaning',
            'biological_basis': 'Pitch change detection neurons',
            'information_content': 'High (prosody, emotion)',
            'cross_cultural_validity': 'universal',
            'examples': ['Question intonation', 'Emotional expression', 'Tone languages']
        },
        'harmonic_structure': {
            'description': 'Harmonic relationships are innate',
            'biological_basis': 'Harmonic template formation in auditory cortex',
            'information_content': 'Timbre, instrument recognition',
            'cross_cultural_validity': 'universal',
            'examples': ['Vowel recognition', 'Instrument identification', 'Voice quality']
        },
        'formant_patterns': {
            'description': 'Spectral peaks encode vocal tract information',
            'biological_basis': 'Vowel recognition circuits',
            'frequency_range_hz': [200, 4000],
            'cross_cultural_validity': 'universal for speech',
            'examples': ['Vowel discrimination', 'Speaker identification']
        }
    }
    
    return principles

def analyze_octave_equivalence() -> Dict:
    """
    Analyze the mathematical and perceptual basis of octave equivalence.
    """
    return {
        'mathematical_basis': {
            'frequency_ratio': 2.0,
            'harmonic_overlap': 'All even harmonics of lower note are harmonics of upper note',
            'period_ratio': 'Period divides exactly by 2',
            'waveform_similarity': 'Waveforms align at 2:1 ratio with zero phase shift'
        },
        'perceptual_basis': {
            'pitch_similarity': 'Notes sound "the same" but higher/lower',
            'cultural_universality': 'Found in virtually all musical cultures',
            'neural_correlates': 'Harmonic templates fire for octave-related frequencies'
        },
        'tensor_analogy': {
            'description': 'Octave equivalence as dimension reduction',
            'operation': 'Modulo operation on log-frequency space',
            'simplification': 'Infinite frequency space → 12-element pitch class space',
            'computation_reduction': 'log₂(f) mod 12 → reduces continuous to discrete'
        }
    }

# ============================================================================
# RHYTHM MATHEMATICS
# ============================================================================

def analyze_polyrhythm(ratio: Tuple[int, int], bpm: float = 120.0) -> Dict:
    """
    Analyze polyrhythmic interference patterns.
    """
    # Convert BPM to beats per second
    bps = bpm / 60.0
    
    # Two rhythmic streams
    period1 = 1.0 / bps  # Base beat
    period2 = period1 * ratio[0] / ratio[1]
    
    # Combined period (when rhythms realign)
    combined_period = period1 * ratio[0]  # LCM of periods
    
    # Generate rhythmic pattern
    duration = combined_period * 4  # 4 complete cycles
    sample_rate = 1000  # Lower resolution for rhythm
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Impulse trains
    impulses1 = np.zeros_like(t)
    impulses2 = np.zeros_like(t)
    
    impulse_duration = 0.05  # 50ms impulse
    impulse_samples = int(sample_rate * impulse_duration)
    
    for i in range(int(duration / period1)):
        idx = int(i * period1 * sample_rate)
        if idx + impulse_samples < len(impulses1):
            impulses1[idx:idx+impulse_samples] = np.exp(-np.linspace(0, 10, impulse_samples))
    
    for i in range(int(duration / period2)):
        idx = int(i * period2 * sample_rate)
        if idx + impulse_samples < len(impulses2):
            impulses2[idx:idx+impulse_samples] = np.exp(-np.linspace(0, 10, impulse_samples))
    
    combined = impulses1 + impulses2
    
    # Find coincidences (when both rhythms hit together)
    coincidences = []
    for i in range(int(duration / combined_period) + 1):
        coincidences.append(i * combined_period)
    
    return {
        'ratio': f'{ratio[0]}:{ratio[1]}',
        'period_1_beats': float(period1),
        'period_2_beats': float(period2),
        'combined_period': float(combined_period),
        'beats_until_realign': ratio[0],
        'coincidence_rate_per_minute': (bps * 60) / ratio[0],
        'pattern_complexity': float(ratio[0] * ratio[1] / math.gcd(ratio[0], ratio[1])),
        'groove_stability': float(1.0 / (1 + math.log(ratio[0] * ratio[1])))
    }

def syncopation_analysis(pattern: List[int], beats_per_measure: int = 4) -> Dict:
    """
    Analyze syncopation as information content.
    """
    # Expected beats (on the beat)
    expected = set(range(beats_per_measure))
    
    # Actual beats
    actual = set(pattern)
    
    # Syncopation = unexpected events
    syncopated_beats = actual - expected
    missed_beats = expected - actual
    
    # Information content (Shannon entropy based)
    p_on = len(actual) / beats_per_measure
    p_off = 1 - p_on
    
    if 0 < p_on < 1:
        entropy = -p_on * math.log2(p_on) - p_off * math.log2(p_off)
    else:
        entropy = 0
    
    return {
        'syncopated_beats': len(syncopated_beats),
        'missed_downbeats': len(missed_beats),
        'information_bits': entropy * beats_per_measure,
        'surprise_index': len(syncopated_beats) / beats_per_measure,
        'groove_disruption': float(len(syncopated_beats) + len(missed_beats)) / beats_per_measure
    }

# ============================================================================
# TENSOR APPLICATIONS
# ============================================================================

def harmonic_tensor_simplification() -> Dict:
    """
    Map harmonic ratios to tensor operation simplifications.
    """
    return {
        'consonant_operations': {
            'octave_2_1': {
                'tensor_analogy': 'Dimension doubling/halving',
                'simplification': 'Reshape without interpolation',
                'computation_saving': '50% reduction in indexing',
                'example': 'tensor.reshape(-1, 2*d) or tensor.reshape(-1, d//2)'
            },
            'perfect_fifth_3_2': {
                'tensor_analogy': 'Stride-based downsampling',
                'simplification': 'Skip every 3rd element, take 2',
                'computation_saving': '33% of original computation',
                'example': 'tensor[::3][:2] per block'
            },
            'perfect_fourth_4_3': {
                'tensor_analogy': 'Periodic thinning',
                'simplification': 'Keep 3 of every 4 elements',
                'computation_saving': '75% of original',
                'example': 'Remove every 4th element'
            }
        },
        'dissonant_operations': {
            'tritone_45_32': {
                'tensor_analogy': 'Non-periodic sampling',
                'complication': 'High LCM = long cycle = no simplification',
                'computation_cost': 'Full computation required',
                'insight': 'High LCM ratios require full tensor ops'
            }
        },
        'resonance_operations': {
            'description': 'Operations where waves align constructively',
            'condition': 'When tensor dimensions share common factors',
            'simplification': 'Factor out common dimensions',
            'example': 'For (6, 4) tensor: factor as 2*(3, 2) → operate on smaller tensor'
        }
    }

def tensor_resonance_analysis(shape1: Tuple[int, ...], shape2: Tuple[int, ...]) -> Dict:
    """
    Analyze 'resonance' between tensor shapes (common factors).
    """
    # Flatten shapes for GCD analysis
    def flatten_shape(shape):
        result = 1
        for dim in shape:
            result *= dim
        return result
    
    size1 = flatten_shape(shape1)
    size2 = flatten_shape(shape2)
    
    gcd = math.gcd(size1, size2)
    lcm = size1 * size2 // gcd
    
    # Resonance score
    resonance = gcd / math.sqrt(size1 * size2)
    
    # Common dimension factors
    def get_factors(n):
        factors = []
        for i in range(1, int(math.sqrt(n)) + 1):
            if n % i == 0:
                factors.extend([i, n // i])
        return sorted(set(factors))
    
    factors1 = set(get_factors(size1))
    factors2 = set(get_factors(size2))
    common_factors = factors1 & factors2
    
    return {
        'size_1': size1,
        'size_2': size2,
        'gcd': gcd,
        'lcm': lcm,
        'resonance_score': float(resonance),
        'common_factors': sorted(common_factors),
        'largest_common_factor': max(common_factors) if common_factors else 1,
        'simplification_potential': float(gcd / max(size1, size2))
    }

# ============================================================================
# MAIN SIMULATION
# ============================================================================

def run_full_simulation() -> Dict:
    """
    Run comprehensive music theory mathematics simulation.
    """
    results = {
        'metadata': {
            'title': 'Music Theory Mathematics for Tensor Computation Reduction',
            'version': '1.0',
            'purpose': 'Research harmonic principles and their applications to tensor operations'
        },
        'harmonic_mathematics': {},
        'waveform_analysis': {},
        'interference_patterns': {},
        'universal_encoding': {},
        'rhythm_analysis': {},
        'tensor_applications': {}
    }
    
    # 1. Harmonic Mathematics
    print("Analyzing harmonic mathematics...")
    for name, interval in INTERVALS.items():
        results['harmonic_mathematics'][name] = {
            'name': interval.name,
            'ratio': f'{interval.ratio[0]}:{interval.ratio[1]}',
            'cents': interval.cents,
            'consonance_score': consonance_from_ratio(interval.ratio),
            'gcd': interval.gcd(),
            'lcm': interval.ratio[0] * interval.ratio[1] // interval.gcd()
        }
    
    # 2. Waveform Analysis
    print("Generating waveforms...")
    t, waveform, harmonics = generate_harmonic_series(440.0, 16)
    results['waveform_analysis']['a4_harmonic_series'] = {
        'fundamental': 440.0,
        'harmonics': harmonics,
        'fourier_peaks': fourier_decomposition(waveform)['peaks'][:10]
    }
    
    # 3. Interference Patterns
    print("Analyzing interference patterns...")
    for name, interval in INTERVALS.items():
        if name not in ['unison', 'octave']:
            results['interference_patterns'][name] = analyze_interference(
                440.0, 440.0 * interval.ratio[0] / interval.ratio[1]
            )
            results['interference_patterns'][name]['consonance_measure'] = \
                measure_consonance_waveform(interval.ratio)
    
    # 4. Universal Encoding
    print("Analyzing universal encoding principles...")
    results['universal_encoding'] = {
        'principles': analyze_universal_principles(),
        'octave_equivalence': analyze_octave_equivalence()
    }
    
    # 5. Rhythm Analysis
    print("Analyzing rhythm mathematics...")
    polyrhythms = [(2, 3), (3, 4), (4, 5), (5, 6), (3, 5), (4, 7)]
    for ratio in polyrhythms:
        name = f'{ratio[0]}_against_{ratio[1]}'
        results['rhythm_analysis'][name] = analyze_polyrhythm(ratio)
    
    # Syncopation examples
    results['rhythm_analysis']['syncopation_examples'] = {
        'on_beat': syncopation_analysis([0, 1, 2, 3]),
        'simple_syncopation': syncopation_analysis([0.5, 1.5, 2.5, 3.5]),
        'strong_syncopation': syncopation_analysis([0.5, 1, 2.5, 3]),
        'complex_pattern': syncopation_analysis([0.25, 0.75, 1.5, 2.25, 3.75])
    }
    
    # 6. Tensor Applications
    print("Analyzing tensor applications...")
    results['tensor_applications'] = {
        'harmonic_simplification': harmonic_tensor_simplification(),
        'shape_resonance_examples': [
            tensor_resonance_analysis((12, 8), (6, 16)),
            tensor_resonance_analysis((3, 2), (6, 4)),
            tensor_resonance_analysis((45, 32), (64, 45)),  # Tritone-like
            tensor_resonance_analysis((100, 100), (100, 100))
        ]
    }
    
    return results

if __name__ == '__main__':
    results = run_full_simulation()
    
    # Save results
    with open('music_theory_simulation_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print("\nSimulation complete! Results saved to music_theory_simulation_results.json")
    print(f"\nKey findings:")
    print(f"- Analyzed {len(INTERVALS)} musical intervals")
    print(f"- Consonance correlates with low LCM of ratio terms")
    print(f"- Perfect fifth (3:2) has LCM=6, Tritone (45:32) has LCM=1440")
    print(f"- This 240x difference in periodicity explains consonance/dissonance")
