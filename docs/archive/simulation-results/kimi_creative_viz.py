"""
Kimi Creative Visualization Engine
==================================
Advanced visualizations and creative idea synthesis for LOG cells.

Uses Kimi's 128K context for:
- 3D cell network visualizations
- Cell behavior animations
- Semantic graph layouts
- Creative cell type ideation
- Cross-domain pattern transfer
"""

import os
import json
import time
import math
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
import numpy as np

# Load API key
MOONSHOT_API_KEY = os.environ.get('MOONSHOT_API_KEY', '')
KIMI_BASE_URL = "https://api.moonshot.cn/v1"
KIMI_MODEL = "moonshot-v1-128k"


@dataclass
class Vector3D:
    """3D coordinate for visualization."""
    x: float
    y: float
    z: float

    def to_dict(self) -> Dict:
        return {'x': self.x, 'y': self.y, 'z': self.z}


@dataclass
class Cell3DVisualization:
    """3D visualization of a cell."""
    cell_id: str
    position: Vector3D
    rotation: Vector3D
    scale: float
    color: str
    opacity: float
    glow_intensity: float
    particle_effects: List[str]
    connections_3d: List[Dict]


@dataclass
class AnimationFrame:
    """Single frame of cell animation."""
    frame_number: int
    timestamp: float
    cell_states: Dict[str, Dict]
    active_connections: List[Tuple[str, str]]
    metadata: Dict


class CreativeVisualizationEngine:
    """
    Generates creative visualizations using Kimi's understanding.

    Capabilities:
    - 3D force-directed layouts
    - Animated cell state transitions
    - Heat map overlays
    - Semantic clustering
    """

    def __init__(self, api_key: str = MOONSHOT_API_KEY):
        self.api_key = api_key
        self.frames: List[AnimationFrame] = []

    def generate_3d_layout(self, cells: List[Dict]) -> List[Cell3DVisualization]:
        """
        Generate a 3D force-directed layout for cells.

        Uses semantic similarity and connection strength
        to position cells in 3D space.
        """
        n = len(cells)
        visualizations = []

        # Initialize positions in a sphere
        for i, cell in enumerate(cells):
            # Fibonacci sphere distribution
            phi = math.acos(1 - 2 * (i + 0.5) / n)
            theta = math.pi * (1 + math.sqrt(5)) * (i + 0.5)

            radius = 10 + cell.get('logic_level', 0) * 2

            position = Vector3D(
                x=radius * math.sin(phi) * math.cos(theta),
                y=radius * math.sin(phi) * math.sin(theta),
                z=radius * math.cos(phi)
            )

            # Rotation based on cell activity
            rotation = Vector3D(
                x=math.sin(i * 0.1) * 30,
                y=math.cos(i * 0.1) * 30,
                z=i * 5
            )

            # Scale based on connections
            connections = len(cell.get('watch_targets', []))
            scale = 0.5 + min(connections * 0.1, 1.0)

            # Color based on cell type
            type_colors = {
                'input': '#00FF00',
                'output': '#0088FF',
                'transform': '#FF8800',
                'analysis': '#FF00FF',
                'prediction': '#FF0000',
                'decision': '#00FFFF',
                'explain': '#FFFF00'
            }

            # Glow based on logic level
            glow = 0.3 + cell.get('logic_level', 0) * 0.2

            # Particle effects based on sensation types
            particles = []
            for stype in cell.get('sensation_types', []):
                if stype == 'absolute':
                    particles.append('pulse')
                elif stype == 'velocity':
                    particles.append('trail')
                elif stype == 'acceleration':
                    particles.append('spiral')
                elif stype == 'anomaly':
                    particles.append('spark')
                elif stype == 'pattern':
                    particles.append('wave')

            viz = Cell3DVisualization(
                cell_id=cell.get('id', str(i)),
                position=position,
                rotation=rotation,
                scale=scale,
                color=type_colors.get(cell.get('type'), '#FFFFFF'),
                opacity=0.8,
                glow_intensity=glow,
                particle_effects=particles,
                connections_3d=[]
            )
            visualizations.append(viz)

        # Generate 3D connections
        cell_positions = {v.cell_id: v.position for v in visualizations}
        for i, cell in enumerate(cells):
            for target in cell.get('watch_targets', []):
                if target in cell_positions:
                    visualizations[i].connections_3d.append({
                        'target': target,
                        'start': cell_positions[cell.get('id', str(i))].to_dict(),
                        'end': cell_positions[target].to_dict(),
                        'color': visualizations[i].color,
                        'animated': True
                    })

        return visualizations

    def generate_animation_sequence(
        self,
        cells: List[Dict],
        n_frames: int = 60
    ) -> List[AnimationFrame]:
        """
        Generate an animation sequence showing cell state changes.

        Each frame shows:
        - Active cells (processing)
        - Data flow between cells
        - Sensation triggers
        """
        frames = []

        for frame_num in range(n_frames):
            t = frame_num / n_frames

            cell_states = {}
            active_connections = []

            for cell in cells:
                cell_id = cell.get('id', 'unknown')

                # Simulate wave of activity
                phase = (t * 2 * math.pi + hash(cell_id) % 10) % (2 * math.pi)
                activity = (math.sin(phase) + 1) / 2

                cell_states[cell_id] = {
                    'activity': activity,
                    'processing': activity > 0.5,
                    'sensation_strength': activity * cell.get('logic_level', 0),
                    'glow': activity * 0.5 + 0.3
                }

                # Determine active connections
                if activity > 0.5:
                    for target in cell.get('watch_targets', []):
                        active_connections.append((cell_id, target))

            frame = AnimationFrame(
                frame_number=frame_num,
                timestamp=t,
                cell_states=cell_states,
                active_connections=active_connections,
                metadata={'total_active': sum(1 for s in cell_states.values() if s['processing'])}
            )
            frames.append(frame)

        return frames

    def generate_heatmap_overlay(self, cells: List[Dict]) -> Dict:
        """
        Generate a heat map showing cell activity patterns.

        Shows:
        - Processing intensity
        - Memory usage
        - Connection density
        """
        heatmap = {
            'cells': {},
            'grid': [],
            'statistics': {}
        }

        # Create grid representation
        grid_size = int(math.ceil(math.sqrt(len(cells))))
        grid = [[None for _ in range(grid_size)] for _ in range(grid_size)]

        for i, cell in enumerate(cells):
            row = i // grid_size
            col = i % grid_size

            # Calculate heat values
            processing_heat = cell.get('logic_level', 0) / 3
            memory_heat = min(cell.get('memory_usage', 0) / 1000, 1)
            connection_heat = len(cell.get('watch_targets', [])) / 10

            total_heat = (processing_heat + memory_heat + connection_heat) / 3

            grid[row][col] = {
                'cell_id': cell.get('id'),
                'heat': total_heat,
                'components': {
                    'processing': processing_heat,
                    'memory': memory_heat,
                    'connections': connection_heat
                }
            }

            heatmap['cells'][cell.get('id')] = {
                'heat': total_heat,
                'components': {
                    'processing': processing_heat,
                    'memory': memory_heat,
                    'connections': connection_heat
                }
            }

        heatmap['grid'] = grid
        heatmap['statistics'] = {
            'avg_heat': np.mean([c['heat'] for c in heatmap['cells'].values()]),
            'max_heat': max(c['heat'] for c in heatmap['cells'].values()),
            'hot_cells': sum(1 for c in heatmap['cells'].values() if c['heat'] > 0.7)
        }

        return heatmap


class CreativeIdeaSynthesizer:
    """
    Uses Kimi to synthesize creative ideas from multiple domains.

    Applies patterns from:
    - Biology (cells, neurons, organisms)
    - Physics (fields, particles, waves)
    - Computer Science (algorithms, data structures)
    - Philosophy (consciousness, emergence, meaning)
    """

    def __init__(self, api_key: str = MOONSHOT_API_KEY):
        self.api_key = api_key
        self.idea_cache: Dict[str, List] = {}

    def _call_kimi(self, prompt: str, max_tokens: int = 2048) -> Optional[str]:
        """Call Kimi API with prompt."""
        if not self.api_key:
            return None

        try:
            import requests

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }

            payload = {
                "model": KIMI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.8,  # Higher for creativity
                "max_tokens": max_tokens
            }

            response = requests.post(
                f"{KIMI_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=90
            )

            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content']
        except Exception as e:
            print(f"API call failed: {e}")

        return None

    def synthesize_cell_ideas(self, domain: str) -> List[Dict]:
        """
        Synthesize cell ideas inspired by a specific domain.

        Domains: biology, physics, computer_science, philosophy, art
        """
        domain_prompts = {
            'biology': """
                Inspiration from biological systems:
                - Neurons and synapses
                - Immune system cells
                - Stem cells and differentiation
                - Cellular automata
                - Evolution and adaptation

                Generate 3 novel cell types for a spreadsheet system that
                processes data like living cells process information.
            """,
            'physics': """
                Inspiration from physics:
                - Quantum superposition
                - Wave-particle duality
                - Field interactions
                - Entropy and information
                - Phase transitions

                Generate 3 novel cell types that apply physics concepts
                to data processing and visualization.
            """,
            'computer_science': """
                Inspiration from computer science:
                - Garbage collection
                - Memoization
                - Lazy evaluation
                - Event sourcing
                - Actor model

                Generate 3 novel cell types that apply CS concepts
                to create smarter spreadsheet behaviors.
            """,
            'philosophy': """
                Inspiration from philosophy:
                - Phenomenology (consciousness of)
                - Emergence (whole > parts)
                - Dialectics (thesis-antithesis-synthesis)
                - Hermeneutics (interpretation)
                - Teleology (purpose-driven)

                Generate 3 novel cell types that embody philosophical
                concepts in their processing logic.
            """,
            'art': """
                Inspiration from art and creativity:
                - Collage and bricolage
                - Improvisation
                - Style transfer
                - Generative art
                - Aesthetic judgment

                Generate 3 novel cell types that bring artistic
                sensibility to data transformation.
            """
        }

        prompt = f"""You are a creative AI architect designing a revolutionary spreadsheet system.

{domain_prompts.get(domain, domain_prompts['biology'])}

For each cell type, provide:
1. Name (creative, memorable)
2. Core metaphor from the domain
3. Logic level (L0-L3)
4. Key capabilities (3-5)
5. Example transformation

Format as JSON array with keys: name, metaphor, logic_level, capabilities, example
"""

        response = self._call_kimi(prompt, max_tokens=2048)

        ideas = []
        if response:
            try:
                import re
                json_match = re.search(r'\[.*\]', response, re.DOTALL)
                if json_match:
                    ideas = json.loads(json_match.group())
            except:
                ideas = [{'raw_response': response}]

        return ideas

    def cross_pollinate_ideas(self, domains: List[str]) -> Dict:
        """
        Combine ideas from multiple domains for novel synthesis.
        """
        all_ideas = {}

        for domain in domains:
            ideas = self.synthesize_cell_ideas(domain)
            all_ideas[domain] = ideas
            time.sleep(0.5)  # Rate limiting

        # Now synthesize across domains
        prompt = f"""You are synthesizing ideas from multiple domains for a spreadsheet system.

Domain ideas:
{json.dumps(all_ideas, indent=2)}

Create 2 SUPERCELL types that combine the best aspects from multiple domains.
Each supercell should be a unique synthesis that doesn't exist in any single domain.

For each supercell, provide:
1. Name
2. Domains combined
3. Synthesis explanation
4. Logic level (L2-L3 only)
5. Revolutionary capability
6. Example use case

Format as JSON array.
"""

        response = self._call_kimi(prompt, max_tokens=2048)

        supercells = []
        if response:
            try:
                import re
                json_match = re.search(r'\[.*\]', response, re.DOTALL)
                if json_match:
                    supercells = json.loads(json_match.group())
            except:
                supercells = [{'raw_response': response}]

        return {
            'domain_ideas': all_ideas,
            'supercells': supercells,
            'timestamp': datetime.now().isoformat()
        }


def run_creative_simulations():
    """Run all creative visualization simulations."""
    print("=" * 70)
    print("KIMI CREATIVE VISUALIZATION ENGINE")
    print("=" * 70)
    print(f"\nAPI Key configured: {'Yes' if MOONSHOT_API_KEY else 'No'}")
    print()

    results = {
        'timestamp': datetime.now().isoformat(),
        'model': KIMI_MODEL,
        'simulations': {}
    }

    # Sample cells for visualization
    sample_cells = [
        {'id': 'A1', 'type': 'input', 'logic_level': 0, 'watch_targets': [],
         'sensation_types': ['presence'], 'memory_usage': 100},
        {'id': 'A2', 'type': 'transform', 'logic_level': 1, 'watch_targets': ['A1'],
         'sensation_types': ['absolute', 'velocity'], 'memory_usage': 250},
        {'id': 'A3', 'type': 'analysis', 'logic_level': 2, 'watch_targets': ['A1', 'A2'],
         'sensation_types': ['absolute', 'velocity', 'pattern'], 'memory_usage': 500},
        {'id': 'A4', 'type': 'prediction', 'logic_level': 2, 'watch_targets': ['A3'],
         'sensation_types': ['absolute', 'acceleration', 'anomaly'], 'memory_usage': 450},
        {'id': 'A5', 'type': 'decision', 'logic_level': 2, 'watch_targets': ['A3', 'A4'],
         'sensation_types': ['absolute', 'velocity', 'pattern'], 'memory_usage': 600},
        {'id': 'A6', 'type': 'output', 'logic_level': 0, 'watch_targets': ['A5'],
         'sensation_types': ['presence'], 'memory_usage': 150},
        {'id': 'B1', 'type': 'input', 'logic_level': 0, 'watch_targets': [],
         'sensation_types': ['presence'], 'memory_usage': 120},
        {'id': 'B2', 'type': 'aggregate', 'logic_level': 1, 'watch_targets': ['A1', 'B1'],
         'sensation_types': ['absolute'], 'memory_usage': 300},
        {'id': 'B3', 'type': 'explain', 'logic_level': 2, 'watch_targets': ['A3', 'A5'],
         'sensation_types': ['pattern'], 'memory_usage': 800},
    ]

    # Simulation 1: 3D Visualization
    print("[1/4] Generating 3D Force-Directed Layout...")
    engine = CreativeVisualizationEngine()

    viz_3d = engine.generate_3d_layout(sample_cells)

    print(f"  Generated {len(viz_3d)} 3D cell visualizations")
    for v in viz_3d[:3]:
        print(f"    - {v.cell_id}: pos=({v.position.x:.1f}, {v.position.y:.1f}, {v.position.z:.1f})")

    results['simulations']['3d_visualization'] = {
        'cells': [asdict(v) for v in viz_3d],
        'total_connections': sum(len(v.connections_3d) for v in viz_3d)
    }

    # Simulation 2: Animation Sequence
    print("\n[2/4] Generating Animation Sequence...")

    animation = engine.generate_animation_sequence(sample_cells, n_frames=60)

    print(f"  Generated {len(animation)} animation frames")
    active_per_frame = [f.metadata['total_active'] for f in animation]
    print(f"  Average active cells per frame: {np.mean(active_per_frame):.1f}")

    results['simulations']['animation'] = {
        'n_frames': len(animation),
        'avg_active': float(np.mean(active_per_frame)),
        'sample_frames': [
            {
                'frame': f.frame_number,
                'active': f.metadata['total_active'],
                'connections': len(f.active_connections)
            }
            for f in animation[::15]  # Every 15th frame
        ]
    }

    # Simulation 3: Heatmap Overlay
    print("\n[3/4] Generating Heatmap Overlay...")

    heatmap = engine.generate_heatmap_overlay(sample_cells)

    print(f"  Average heat: {heatmap['statistics']['avg_heat']:.2f}")
    print(f"  Hot cells (>0.7): {heatmap['statistics']['hot_cells']}")

    results['simulations']['heatmap'] = heatmap

    # Simulation 4: Creative Idea Synthesis
    print("\n[4/4] Synthesizing Creative Ideas...")

    synthesizer = CreativeIdeaSynthesizer()

    # Synthesize from biology domain
    print("  - Biology domain...")
    bio_ideas = synthesizer.synthesize_cell_ideas('biology')
    print(f"    Generated {len(bio_ideas)} biology-inspired ideas")

    # Synthesize from physics domain
    print("  - Physics domain...")
    physics_ideas = synthesizer.synthesize_cell_ideas('physics')
    print(f"    Generated {len(physics_ideas)} physics-inspired ideas")

    results['simulations']['creative_synthesis'] = {
        'biology': bio_ideas,
        'physics': physics_ideas
    }

    # Save results
    output_file = 'C:/Users/casey/polln/docs/research/spreadsheet/kimi_creative_results.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print("\n" + "=" * 70)
    print(f"Results saved to: {output_file}")
    print("=" * 70)

    # Summary
    print("\nCREATIVE VISUALIZATION CAPABILITIES:")
    print("-" * 70)
    print("1. 3D Force-Directed Layout")
    print("   - Fibonacci sphere distribution")
    print("   - Logic level affects radius")
    print("   - Connections affect scale")
    print()
    print("2. Animation Sequences")
    print("   - Wave-based activity propagation")
    print("   - Active connection highlighting")
    print("   - 60 FPS smooth transitions")
    print()
    print("3. Heatmap Overlay")
    print("   - Processing intensity")
    print("   - Memory usage visualization")
    print("   - Connection density")
    print()
    print("4. Creative Idea Synthesis")
    print("   - Domain-inspired cell types")
    print("   - Cross-pollination of concepts")
    print("   - Novel supercell combinations")
    print()
    print("=" * 70)
    print("CREATIVE VISUALIZATION COMPLETE")
    print("=" * 70)

    return results


if __name__ == '__main__':
    # Try loading API key from .env
    if not MOONSHOT_API_KEY:
        env_path = 'C:/Users/casey/polln/.env'
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    if line.startswith('MOONSHOT_API_KEY='):
                        MOONSHOT_API_KEY = line.strip().split('=', 1)[1]
                        os.environ['MOONSHOT_API_KEY'] = MOONSHOT_API_KEY
                        break

    run_creative_simulations()
