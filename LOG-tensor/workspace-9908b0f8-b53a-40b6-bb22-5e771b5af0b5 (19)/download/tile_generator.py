"""
RTT TILE GENERATOR v4.0
======================

Massively generate tiles of logic using Kimi (Moonshot AI).
Tiles are like words for the Rubiks-Tensor - some big, some small.
Logic with and without slots for real-time world input/output.

API Key: your_api_key_here
"""

import requests
import json
import time
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass, field
from collections import defaultdict
import re

# =============================================================================
# KIMI API CONFIGURATION
# =============================================================================

KIMI_URL = "https://api.moonshot.ai/v1/chat/completions"
KIMI_KEY = "your_api_key_here"

def query_kimi(prompt: str, max_tokens: int = 2000, temperature: float = 0.7) -> str:
    """Query Kimi API for tile generation."""
    try:
        headers = {
            "Authorization": f"Bearer {KIMI_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "moonshot-v1-8k",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        resp = requests.post(KIMI_URL, headers=headers, json=data, timeout=60)
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
        return f"ERROR_{resp.status_code}"
    except Exception as e:
        return f"EXCEPTION_{str(e)[:50]}"

# =============================================================================
# TILE DATA STRUCTURES
# =============================================================================

@dataclass
class LogicTile:
    """
    A tile of logic - like a word for the Rubiks-Tensor.
    
    Types:
    - ATOMIC: No slots, pure computation (e.g., cmp, inv)
    - SLOT_1: One input slot (e.g., ent(x))
    - SLOT_2: Two input slots (e.g., cmax(a, b))
    - SLOT_N: Variable input slots
    - REALTIME: Slots for real-time world data
    """
    name: str                          # Short name (2-8 chars)
    full_name: str                     # Full descriptive name
    tile_type: str                     # ATOMIC, SLOT_1, SLOT_2, SLOT_N, REALTIME
    math_definition: str               # Mathematical definition
    python_impl: str                   # Python implementation
    input_slots: List[str]             # Names of input slots
    output_slot: str                   # Name of output
    frequency: str                     # HIGH, MED, LOW
    dependencies: List[str]            # Other tiles it uses
    tags: List[str]                    # Categories
    description: str                   # Human description
    
    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "full_name": self.full_name,
            "tile_type": self.tile_type,
            "math_definition": self.math_definition,
            "python_impl": self.python_impl,
            "input_slots": self.input_slots,
            "output_slot": self.output_slot,
            "frequency": self.frequency,
            "dependencies": self.dependencies,
            "tags": self.tags,
            "description": self.description
        }
    
    @classmethod
    def from_dict(cls, d: dict) -> 'LogicTile':
        return cls(**d)


# =============================================================================
# TILE GENERATION PROMPTS
# =============================================================================

TILE_GEN_PROMPTS = {
    "atomic": """Generate 5 ATOMIC logic tiles (no input slots, pure computation).

Format each tile as:
```
NAME: [2-4 char name]
MATH: [mathematical definition]
PYTHON: [one-line Python]
FREQ: [HIGH/MED/LOW]
TAGS: [comma-separated tags]
DESC: [one sentence description]
```

Focus on: mathematical constants, identity operations, zero-cost abstractions.
Examples: id (identity), zero, one, pi, e, inf, nan""",

    "slot_1": """Generate 5 SLOT_1 logic tiles (one input slot).

Format each tile as:
```
NAME: [2-4 char name]
MATH: f(x) = [definition]
PYTHON: [one-line Python function]
FREQ: [HIGH/MED/LOW]
TAGS: [comma-separated tags]
DESC: [one sentence description]
```

Focus on: unary operations, transformations, measurements.
Examples: abs, neg, inv, sqrt, log, exp, norm, unit""",

    "slot_2": """Generate 5 SLOT_2 logic tiles (two input slots).

Format each tile as:
```
NAME: [2-4 char name]
MATH: f(a, b) = [definition]
PYTHON: [one-line Python function]
FREQ: [HIGH/MED/LOW]
TAGS: [comma-separated tags]
DESC: [one sentence description]
```

Focus on: binary operations, comparisons, combinations.
Examples: add, sub, mul, div, dot, cross, min, max""",

    "realtime": """Generate 5 REALTIME logic tiles (slots for real-time world data).

Format each tile as:
```
NAME: [2-4 char name]
SLOTS: [input slot names with types, e.g., "position:Tensor, timestamp:float"]
MATH: [definition with real-time semantics]
PYTHON: [Python function with time handling]
FREQ: [HIGH/MED/LOW]
TAGS: [comma-separated tags]
DESC: [one sentence about real-time behavior]
```

Focus on: sensor fusion, temporal logic, streaming data, event handling.
Examples: poll, push, merge, delta, throttle""",

    "permutation": """Generate 5 PERMUTATION logic tiles for the Rubiks-Tensor.

Format each tile as:
```
NAME: [2-4 char name]
MATH: [permutation operation definition]
PYTHON: [Python with numpy/torch]
FREQ: [HIGH/MED/LOW]
TAGS: permutation, [other tags]
DESC: [one sentence about permutation behavior]
```

Focus on: symmetric group operations, cycle operations, permutation matrices.
Examples: cyc (cycle decompose), ord (order), gen (generators)""",

    "tensor": """Generate 5 TENSOR logic tiles for neural network operations.

Format each tile as:
```
NAME: [2-4 char name]
MATH: [tensor operation definition]
PYTHON: [Python with tensor operations]
FREQ: [HIGH/MED/LOW]
TAGS: tensor, [other tags]
DESC: [one sentence about tensor behavior]
```

Focus on: contractions, reshaping, broadcasting, reductions.
Examples: contract, reshape, broadcast, reduce, scatter""",

    "physical": """Generate 5 PHYSICAL logic tiles for physics simulation.

Format each tile as:
```
NAME: [2-4 char name]
MATH: [physical law definition]
PYTHON: [Python implementation]
FREQ: [HIGH/MED/LOW]
TAGS: physics, [other tags]
DESC: [one sentence about physical behavior]
```

Focus on: forces, momentum, energy, conservation laws.
Examples: ke (kinetic energy), pe (potential energy), momentum, impulse""",

    "attention": """Generate 5 ATTENTION logic tiles for transformer operations.

Format each tile as:
```
NAME: [2-4 char name]
MATH: [attention mechanism definition]
PYTHON: [Python with attention computation]
FREQ: [HIGH/MED/LOW]
TAGS: attention, [other tags]
DESC: [one sentence about attention behavior]
```

Focus on: query-key-value, softmax, masking, multi-head patterns.
Examples: sdpa (scaled dot product), mask, rope, alibi""",

    "intuition": """Generate 5 INTUITION logic tiles for instant decision-making.

Format each tile as:
```
NAME: [2-4 char name]
CONDITION: [when this intuition applies]
OUTPUT: [instant answer type]
PYTHON: [fast boolean/computation]
FREQ: [HIGH/MED/LOW]
TAGS: intuition, [other tags]
DESC: [one sentence about the intuition]
```

Focus on: quick judgments, heuristics, pattern recognition.
Examples: danger, safe, align, drift, stuck""",

    "spatial": """Generate 5 SPATIAL logic tiles for geometric reasoning.

Format each tile as:
```
NAME: [2-4 char name]
MATH: [geometric definition]
PYTHON: [Python with spatial operations]
FREQ: [HIGH/MED/LOW]
TAGS: spatial, geometry, [other tags]
DESC: [one sentence about spatial behavior]
```

Focus on: distance, angle, intersection, containment, transform.
Examples: dist, angle, project, reflect, rotate"""
}


# =============================================================================
# TILE PARSER
# =============================================================================

def parse_tile_response(response: str, tile_type: str) -> List[LogicTile]:
    """Parse Kimi's response into LogicTile objects."""
    tiles = []
    
    # Split by code blocks or tile delimiters
    blocks = re.split(r'```\n?|NAME:', response)
    
    current_tile = {}
    
    for block in blocks:
        if not block.strip():
            continue
        
        lines = block.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Parse key-value pairs
            if ':' in line:
                parts = line.split(':', 1)
                key = parts[0].strip().upper()
                value = parts[1].strip() if len(parts) > 1 else ""
                
                if key == 'NAME':
                    if current_tile and 'name' in current_tile:
                        # Save previous tile
                        tiles.append(create_tile_from_dict(current_tile, tile_type))
                    current_tile = {'name': value[:8]}  # Max 8 chars
                elif key == 'MATH':
                    current_tile['math_definition'] = value
                elif key == 'PYTHON':
                    current_tile['python_impl'] = value
                elif key == 'FREQ':
                    current_tile['frequency'] = value.upper()
                elif key == 'TAGS':
                    current_tile['tags'] = [t.strip() for t in value.split(',')]
                elif key == 'DESC':
                    current_tile['description'] = value
                elif key == 'SLOTS':
                    current_tile['input_slots'] = [s.strip() for s in value.split(',')]
                elif key == 'CONDITION':
                    current_tile['condition'] = value
                elif key == 'OUTPUT':
                    current_tile['output_slot'] = value
    
    # Don't forget the last tile
    if current_tile and 'name' in current_tile:
        tiles.append(create_tile_from_dict(current_tile, tile_type))
    
    return tiles


def create_tile_from_dict(d: dict, tile_type: str) -> LogicTile:
    """Create a LogicTile from parsed dictionary."""
    name = d.get('name', 'unk')
    
    return LogicTile(
        name=name,
        full_name=d.get('full_name', name),
        tile_type=tile_type.upper(),
        math_definition=d.get('math_definition', d.get('condition', 'N/A')),
        python_impl=d.get('python_impl', 'pass'),
        input_slots=d.get('input_slots', []),
        output_slot=d.get('output_slot', 'result'),
        frequency=d.get('frequency', 'MED'),
        dependencies=[],
        tags=d.get('tags', [tile_type]),
        description=d.get('description', f'{tile_type} tile')
    )


# =============================================================================
# TILE GENERATOR CLASS
# =============================================================================

class TileGenerator:
    """
    Massive tile generation using Kimi API.
    Creates tiles of logic like words for the Rubiks-Tensor.
    """
    
    def __init__(self):
        self.generated_tiles = []
        self.generation_log = []
    
    def generate_batch(self, tile_type: str, n_batches: int = 1) -> List[LogicTile]:
        """Generate a batch of tiles of a specific type."""
        all_tiles = []
        
        prompt = TILE_GEN_PROMPTS.get(tile_type)
        if not prompt:
            print(f"Unknown tile type: {tile_type}")
            return []
        
        for i in range(n_batches):
            print(f"  Generating {tile_type} batch {i+1}/{n_batches}...")
            
            response = query_kimi(prompt + f"\n\nBatch {i+1}. Create unique tiles different from previous batches.")
            
            if response.startswith("ERROR") or response.startswith("EXCEPTION"):
                print(f"    Failed: {response}")
                continue
            
            tiles = parse_tile_response(response, tile_type)
            all_tiles.extend(tiles)
            
            self.generation_log.append({
                'type': tile_type,
                'batch': i+1,
                'count': len(tiles),
                'timestamp': time.time()
            })
            
            # Rate limiting
            time.sleep(0.5)
        
        self.generated_tiles.extend(all_tiles)
        return all_tiles
    
    def generate_all_types(self, batches_per_type: int = 1) -> Dict[str, List[LogicTile]]:
        """Generate tiles for all types."""
        results = {}
        
        tile_types = list(TILE_GEN_PROMPTS.keys())
        
        for tile_type in tile_types:
            print(f"\n[{tile_type.upper()}] Generating...")
            tiles = self.generate_batch(tile_type, batches_per_type)
            results[tile_type] = tiles
            print(f"  Generated {len(tiles)} tiles")
        
        return results
    
    def save_tiles(self, filepath: str):
        """Save all generated tiles to JSON."""
        data = {
            'tiles': [t.to_dict() for t in self.generated_tiles],
            'log': self.generation_log,
            'timestamp': time.time()
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Saved {len(self.generated_tiles)} tiles to {filepath}")


# =============================================================================
# TILE SIMULATION ENGINE
# =============================================================================

class TileSimulator:
    """
    Simulate tile operations for testing.
    Tests tiles with real-world-like data.
    """
    
    def __init__(self, tiles: List[LogicTile]):
        self.tiles = {t.name: t for t in tiles}
        self.simulation_results = []
    
    def simulate_tile(self, tile: LogicTile, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate a single tile operation."""
        result = {
            'tile': tile.name,
            'type': tile.tile_type,
            'inputs': inputs,
            'output': None,
            'error': None,
            'time_ms': 0
        }
        
        start = time.time()
        
        try:
            # Create local namespace for execution
            namespace = {
                'np': np,
                'math': __import__('math'),
                **inputs
            }
            
            # Extract function body from python_impl
            impl = tile.python_impl
            if 'def ' in impl:
                # Full function definition
                exec(impl, namespace)
                func_name = tile.name
                if func_name in namespace:
                    args = [inputs.get(s.split(':')[0]) for s in tile.input_slots if s]
                    result['output'] = namespace[func_name](*args)
            else:
                # One-liner expression
                output = eval(impl, namespace)
                result['output'] = output
            
        except Exception as e:
            result['error'] = str(e)[:100]
        
        result['time_ms'] = (time.time() - start) * 1000
        
        return result
    
    def run_tests(self) -> List[Dict]:
        """Run tests on all tiles."""
        results = []
        
        # Test inputs
        test_inputs = {
            'x': np.array([1.0, 2.0, 3.0]),
            'a': np.array([1.0, 2.0, 3.0]),
            'b': np.array([4.0, 5.0, 6.0]),
            'position': np.array([0.0, 0.0, 0.0]),
            'velocity': np.array([1.0, 0.0, 0.0]),
            'tensor': np.random.randn(3, 4),
            'sigma': np.array([2, 0, 1]),  # permutation
            'timestamp': time.time(),
        }
        
        for name, tile in self.tiles.items():
            # Select relevant inputs based on tile type
            if tile.tile_type == 'ATOMIC':
                inputs = {}
            elif tile.tile_type == 'SLOT_1':
                inputs = {'x': test_inputs['x']}
            elif tile.tile_type == 'SLOT_2':
                inputs = {'a': test_inputs['a'], 'b': test_inputs['b']}
            else:
                inputs = test_inputs
            
            result = self.simulate_tile(tile, inputs)
            results.append(result)
        
        self.simulation_results = results
        return results


# =============================================================================
# TILE REGISTRY - Build Vocabulary
# =============================================================================

class TileRegistry:
    """
    Registry of all tiles - the vocabulary for Rubiks-Tensor.
    Tiles can be looked up by name, type, or tags.
    """
    
    def __init__(self):
        self.tiles = {}
        self.by_type = defaultdict(list)
        self.by_tag = defaultdict(list)
        self.by_frequency = defaultdict(list)
    
    def register(self, tile: LogicTile):
        """Register a tile."""
        self.tiles[tile.name] = tile
        self.by_type[tile.tile_type].append(tile)
        self.by_tag[tile.tile_type].append(tile)  # Type as tag
        for tag in tile.tags:
            self.by_tag[tag].append(tile)
        self.by_frequency[tile.frequency].append(tile)
    
    def load_from_file(self, filepath: str):
        """Load tiles from JSON file."""
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        for tile_dict in data.get('tiles', []):
            tile = LogicTile.from_dict(tile_dict)
            self.register(tile)
        
        print(f"Loaded {len(self.tiles)} tiles from {filepath}")
    
    def lookup(self, name: str) -> Optional[LogicTile]:
        """Look up a tile by name."""
        return self.tiles.get(name)
    
    def get_by_type(self, tile_type: str) -> List[LogicTile]:
        """Get all tiles of a type."""
        return self.by_type.get(tile_type.upper(), [])
    
    def get_by_tag(self, tag: str) -> List[LogicTile]:
        """Get all tiles with a tag."""
        return self.by_tag.get(tag.lower(), [])
    
    def get_high_frequency(self) -> List[LogicTile]:
        """Get all HIGH frequency tiles."""
        return self.by_frequency.get('HIGH', [])
    
    def get_vocabulary(self) -> List[str]:
        """Get all tile names (vocabulary)."""
        return list(self.tiles.keys())
    
    def stats(self) -> Dict:
        """Get registry statistics."""
        return {
            'total_tiles': len(self.tiles),
            'by_type': {k: len(v) for k, v in self.by_type.items()},
            'by_frequency': {k: len(v) for k, v in self.by_frequency.items()},
            'unique_tags': len(self.by_tag)
        }


# =============================================================================
# REAL-TIME TILE EXECUTOR
# =============================================================================

class RealtimeTileExecutor:
    """
    Execute tiles with real-time world data.
    Handles streaming inputs and outputs.
    """
    
    def __init__(self, registry: TileRegistry):
        self.registry = registry
        self.state = {}
        self.output_buffer = []
    
    def feed(self, tile_name: str, inputs: Dict[str, Any]) -> Any:
        """Feed data to a tile and get output."""
        tile = self.registry.lookup(tile_name)
        if not tile:
            return None
        
        # Execute tile
        namespace = {
            'np': np,
            'math': __import__('math'),
            **self.state,
            **inputs
        }
        
        try:
            if 'def ' in tile.python_impl:
                exec(tile.python_impl, namespace)
                func_name = tile.name
                if func_name in namespace:
                    args = [inputs.get(s.split(':')[0].strip()) for s in tile.input_slots if s]
                    return namespace[func_name](*args)
            else:
                return eval(tile.python_impl, namespace)
        except Exception as e:
            return f"ERROR: {str(e)[:50]}"
    
    def feed_stream(self, tile_name: str, data_stream: List[Dict]) -> List[Any]:
        """Feed a stream of data to a tile."""
        results = []
        for data in data_stream:
            result = self.feed(tile_name, data)
            results.append(result)
            self.output_buffer.append({
                'tile': tile_name,
                'input': data,
                'output': result,
                'timestamp': time.time()
            })
        return results
    
    def update_state(self, key: str, value: Any):
        """Update internal state."""
        self.state[key] = value


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Main tile generation and testing pipeline."""
    
    print("=" * 70)
    print("RTT TILE GENERATOR v4.0 - Mass Production with Kimi")
    print("=" * 70)
    
    # Test Kimi connection
    print("\n[TEST] Checking Kimi API connection...")
    test_response = query_kimi("Reply with: CONNECTION_OK")
    print(f"  Response: {test_response[:50]}...")
    
    if test_response.startswith("ERROR") or test_response.startswith("EXCEPTION"):
        print("  Connection failed! Using fallback generation.")
        use_api = False
    else:
        print("  Connection successful!")
        use_api = True
    
    # Generate tiles
    print("\n" + "=" * 70)
    print("PHASE 1: TILE GENERATION")
    print("=" * 70)
    
    generator = TileGenerator()
    
    if use_api:
        # Generate all tile types with 1 batch each
        results = generator.generate_all_types(batches_per_type=1)
        
        # Save generated tiles
        generator.save_tiles('/home/z/my-project/download/generated_tiles.json')
    else:
        # Fallback: create default tiles
        print("Using built-in tile definitions...")
        default_tiles = create_default_tiles()
        generator.generated_tiles = default_tiles
    
    # Create registry
    print("\n" + "=" * 70)
    print("PHASE 2: BUILD REGISTRY")
    print("=" * 70)
    
    registry = TileRegistry()
    for tile in generator.generated_tiles:
        registry.register(tile)
    
    stats = registry.stats()
    print(f"\n  Total tiles: {stats['total_tiles']}")
    print(f"  By type: {stats['by_type']}")
    print(f"  By frequency: {stats['by_frequency']}")
    print(f"  Unique tags: {stats['unique_tags']}")
    
    # Simulate tiles
    print("\n" + "=" * 70)
    print("PHASE 3: TILE SIMULATION")
    print("=" * 70)
    
    simulator = TileSimulator(generator.generated_tiles)
    sim_results = simulator.run_tests()
    
    successful = sum(1 for r in sim_results if r['error'] is None)
    print(f"\n  Simulated {len(sim_results)} tiles")
    print(f"  Successful: {successful}")
    print(f"  Failed: {len(sim_results) - successful}")
    
    # Show some results
    print("\n  Sample results:")
    for r in sim_results[:5]:
        status = "✓" if r['error'] is None else "✗"
        output_preview = str(r['output'])[:50] if r['output'] else "None"
        print(f"    {status} {r['tile']}: {output_preview}...")
    
    # Real-time executor test
    print("\n" + "=" * 70)
    print("PHASE 4: REAL-TIME EXECUTION TEST")
    print("=" * 70)
    
    executor = RealtimeTileExecutor(registry)
    
    # Feed some real-time data
    test_stream = [
        {'x': np.array([i, i+1, i+2])} 
        for i in range(5)
    ]
    
    print("\n  Testing norm tile with stream:")
    norm_results = executor.feed_stream('norm', test_stream)
    print(f"    Results: {[f'{r:.3f}' if isinstance(r, (int, float)) else r for r in norm_results]}")
    
    # Save simulation results
    with open('/home/z/my-project/download/tile_simulation_results.json', 'w') as f:
        json.dump({
            'simulation': [{k: str(v) if isinstance(v, np.ndarray) else v 
                          for k, v in r.items()} for r in sim_results],
            'stats': stats
        }, f, indent=2)
    
    print("\n" + "=" * 70)
    print("GENERATION COMPLETE")
    print("=" * 70)
    
    return generator, registry, simulator


def create_default_tiles() -> List[LogicTile]:
    """Create default tile set when API is unavailable."""
    defaults = [
        # ATOMIC
        LogicTile('id', 'Identity', 'ATOMIC', 'id(x) = x', 'lambda x: x', [], 'result', 'HIGH', [], ['core'], 'Identity function'),
        LogicTile('zero', 'Zero', 'ATOMIC', '0', '0', [], 'result', 'HIGH', [], ['constant'], 'Zero constant'),
        LogicTile('one', 'One', 'ATOMIC', '1', '1', [], 'result', 'HIGH', [], ['constant'], 'One constant'),
        
        # SLOT_1
        LogicTile('neg', 'Negate', 'SLOT_1', '-x', 'lambda x: -x', ['x'], 'result', 'HIGH', [], ['unary'], 'Negation'),
        LogicTile('abs', 'Absolute', 'SLOT_1', '|x|', 'lambda x: abs(x)', ['x'], 'result', 'HIGH', [], ['unary'], 'Absolute value'),
        LogicTile('norm', 'Norm', 'SLOT_1', '||x||', 'lambda x: np.linalg.norm(x)', ['x'], 'result', 'HIGH', ['np'], ['unary', 'vector'], 'Vector norm'),
        LogicTile('unit', 'Unit Vector', 'SLOT_1', 'x/||x||', 'lambda x: x / (np.linalg.norm(x) + 1e-10)', ['x'], 'result', 'HIGH', ['np', 'norm'], ['unary', 'vector'], 'Normalize to unit vector'),
        
        # SLOT_2
        LogicTile('add', 'Add', 'SLOT_2', 'a + b', 'lambda a, b: a + b', ['a', 'b'], 'result', 'HIGH', [], ['binary', 'arithmetic'], 'Addition'),
        LogicTile('sub', 'Subtract', 'SLOT_2', 'a - b', 'lambda a, b: a - b', ['a', 'b'], 'result', 'HIGH', [], ['binary', 'arithmetic'], 'Subtraction'),
        LogicTile('mul', 'Multiply', 'SLOT_2', 'a * b', 'lambda a, b: a * b', ['a', 'b'], 'result', 'HIGH', [], ['binary', 'arithmetic'], 'Multiplication'),
        LogicTile('div', 'Divide', 'SLOT_2', 'a / b', 'lambda a, b: a / (b + 1e-10)', ['a', 'b'], 'result', 'MED', [], ['binary', 'arithmetic'], 'Division'),
        LogicTile('dot', 'Dot Product', 'SLOT_2', 'a · b', 'lambda a, b: np.dot(a, b)', ['a', 'b'], 'result', 'HIGH', ['np'], ['binary', 'vector'], 'Dot product'),
        LogicTile('cross', 'Cross Product', 'SLOT_2', 'a × b', 'lambda a, b: np.cross(a, b)', ['a', 'b'], 'result', 'HIGH', ['np'], ['binary', 'vector', '3d'], 'Cross product'),
        LogicTile('min', 'Minimum', 'SLOT_2', 'min(a, b)', 'lambda a, b: min(a, b)', ['a', 'b'], 'result', 'HIGH', [], ['binary', 'comparison'], 'Minimum'),
        LogicTile('max', 'Maximum', 'SLOT_2', 'max(a, b)', 'lambda a, b: max(a, b)', ['a', 'b'], 'result', 'HIGH', [], ['binary', 'comparison'], 'Maximum'),
        
        # PERMUTATION
        LogicTile('cmp', 'Compose', 'SLOT_2', 'σ ∘ τ', 'lambda s, t: t[s]', ['sigma', 'tau'], 'result', 'HIGH', [], ['permutation'], 'Compose permutations'),
        LogicTile('inv', 'Inverse', 'SLOT_1', 'σ⁻¹', 'lambda s: np.argsort(s)', ['sigma'], 'result', 'HIGH', ['np'], ['permutation'], 'Inverse permutation'),
        
        # PHYSICAL
        LogicTile('ke', 'Kinetic Energy', 'SLOT_2', '½mv²', 'lambda m, v: 0.5 * m * np.dot(v, v)', ['mass', 'velocity'], 'energy', 'MED', ['np', 'dot'], ['physics', 'energy'], 'Kinetic energy'),
        LogicTile('mom', 'Momentum', 'SLOT_2', 'mv', 'lambda m, v: m * v', ['mass', 'velocity'], 'momentum', 'MED', [], ['physics', 'momentum'], 'Momentum'),
        
        # SPATIAL
        LogicTile('dist', 'Distance', 'SLOT_2', '|a - b|', 'lambda a, b: np.linalg.norm(a - b)', ['a', 'b'], 'distance', 'HIGH', ['np', 'norm'], ['spatial', 'distance'], 'Euclidean distance'),
        
        # INTUITION
        LogicTile('apr', 'Approaching', 'SLOT_2', 'r·v < 0', 'lambda r, v: np.dot(r, v) < 0', ['rel_pos', 'rel_vel'], 'bool', 'HIGH', ['np', 'dot'], ['intuition', 'collision'], 'Is object approaching?'),
        LogicTile('safe', 'Safe Distance', 'SLOT_1', '|r| > threshold', 'lambda r: np.linalg.norm(r) > 100', ['position'], 'bool', 'HIGH', ['np', 'norm'], ['intuition', 'safety'], 'Is distance safe?'),
        
        # REALTIME
        LogicTile('delta', 'Delta', 'SLOT_2', 'x₂ - x₁', 'lambda x1, x2: x2 - x1', ['prev', 'curr'], 'change', 'HIGH', [], ['realtime', 'change'], 'Change between values'),
        LogicTile('rate', 'Rate', 'SLOT_3', '(x₂-x₁)/(t₂-t₁)', 'lambda x1, x2, dt: (x2 - x1) / dt', ['prev', 'curr', 'dt'], 'rate', 'MED', [], ['realtime', 'rate'], 'Rate of change'),
    ]
    
    return defaults


if __name__ == "__main__":
    generator, registry, simulator = main()
