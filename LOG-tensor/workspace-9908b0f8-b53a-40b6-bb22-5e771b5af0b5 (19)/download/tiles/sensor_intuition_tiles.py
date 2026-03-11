"""
RTT SENSOR-INTUITION TILES v3.0
===============================

Novel tiles for real-time sensor integration and instant intuition.
Based on: origin-as-self, viewpoint-as-structure, trajectory prediction.

Key Insight (User):
    "Two planes avoid each other because from far away they have intuition 
    about how backgrounds are supposed to change behind an object. A momentary 
    glimpse lets them visualize the 5-minute predictor line ahead, including 
    speed, by visualizing the 5 minutes behind. They can infer intention with 
    extremely little data because all questions have tiles process the answer."

Design Philosophy:
    - Sensors nudge computation like bumping a pinball game
    - Origin = self, viewpoint = structure
    - Travel plane/axis contains massive information
    - Tiles answer questions as fast as you can say them
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math
import numpy as np
from dataclasses import dataclass, field
from typing import Optional, Tuple, List, Dict, Callable, Any
from collections import deque
import time

# =============================================================================
# TINY MODEL INTEGRATION PATTERNS
# =============================================================================

@dataclass
class TinyModelConfig:
    """Configuration for tiny model integration (FunctionGemma, SmolVLM, etc.)"""
    name: str
    input_dim: int
    output_dim: int
    context_length: int
    latency_target_ms: float = 50.0  # Target latency for real-time
    
    # Known tiny models
    TINY_MODELS = {
        'function_gemma_2b': {'dim': 2048, 'ctx': 8192, 'latency_ms': 30},
        'smolvlm_256m': {'dim': 512, 'ctx': 2048, 'latency_ms': 10},
        'phi_3_mini': {'dim': 3072, 'ctx': 4096, 'latency_ms': 25},
        'tiny_llama_1b': {'dim': 2048, 'ctx': 2048, 'latency_ms': 15},
        'mobilebert': {'dim': 768, 'ctx': 512, 'latency_ms': 8},
    }


class TinyModelInterface:
    """
    Interface for integrating tiny models as sensor processors.
    
    Design: Tiny models provide "intuition" tiles - fast inference
    that nudges the main computation like bumping a pinball game.
    """
    
    def __init__(self, model_name: str = 'smolvlm_256m'):
        self.config = TinyModelConfig(
            name=model_name,
            input_dim=TinyModelConfig.TINY_MODELS.get(model_name, {}).get('dim', 512),
            output_dim=TinyModelConfig.TINY_MODELS.get(model_name, {}).get('dim', 512),
            context_length=TinyModelConfig.TINY_MODELS.get(model_name, {}).get('ctx', 2048),
            latency_target_ms=TinyModelConfig.TINY_MODELS.get(model_name, {}).get('latency_ms', 20)
        )
        
        # Minimal adapter layers
        self.sensor_adapter = nn.Linear(self.config.input_dim, 128)
        self.output_adapter = nn.Linear(128, self.config.output_dim)
        
    def process_sensor_input(self, sensor_data: torch.Tensor) -> torch.Tensor:
        """
        Process sensor input through tiny model intuition.
        
        Returns a "nudge" vector - small adjustment to main computation.
        """
        # Compress sensor data to minimal representation
        compressed = self.sensor_adapter(sensor_data)
        compressed = F.relu(compressed)
        
        # Output nudge vector
        nudge = self.output_adapter(compressed)
        nudge = torch.tanh(nudge) * 0.1  # Small nudges, not large changes
        
        return nudge


# =============================================================================
# SENSOR TILES - Real-Time Input Processing
# =============================================================================

@dataclass
class SensorReading:
    """Single sensor reading with timestamp and origin reference."""
    timestamp: float
    value: torch.Tensor
    origin_id: int  # ID of the origin/self reference
    sensor_type: str
    confidence: float = 1.0


class SensorTile:
    """
    TILE: sensor
    
    Real-time sensor input that "nudges" computation.
    Like bumping a pinball game - small adjustments with big effects.
    
    Key insight: Sensor data is STRUCTURAL, not just numerical.
    Position relative to origin = understanding of self in space.
    """
    
    def __init__(self, buffer_size: int = 300):  # 5 min at 1Hz
        self.buffer = deque(maxlen=buffer_size)
        self.origin_position = torch.zeros(3)  # Self position
        self.origin_orientation = torch.eye(3)  # Self orientation
        self.last_update = time.time()
        
    def update_origin(self, position: torch.Tensor, orientation: torch.Tensor):
        """Update origin (self) reference frame."""
        self.origin_position = position
        self.origin_orientation = orientation
        
    def ingest(self, reading: SensorReading) -> Dict[str, torch.Tensor]:
        """
        Ingest sensor reading and compute structural relationships.
        
        Returns:
            - relative_position: Position relative to origin (self)
            - relative_velocity: Velocity in origin's frame
            - trajectory_hint: Direction of travel hint
        """
        self.buffer.append(reading)
        self.last_update = time.time()
        
        # Compute relative position (structural understanding)
        relative_pos = reading.value[:3] - self.origin_position
        
        # Transform to origin's frame (viewpoint = structure)
        relative_pos_origin = self.origin_orientation @ relative_pos
        
        # Compute trajectory hint if enough history
        trajectory_hint = torch.zeros(3)
        if len(self.buffer) > 10:
            recent = list(self.buffer)[-10:]
            positions = torch.stack([r.value[:3] for r in recent])
            trajectory_hint = positions[-1] - positions[0]
            trajectory_hint = trajectory_hint / (trajectory_hint.norm() + 1e-10)
        
        return {
            'relative_position': relative_pos_origin,
            'trajectory_hint': trajectory_hint,
            'confidence': torch.tensor(reading.confidence)
        }
    
    def compute_nudge(self, main_state: torch.Tensor) -> torch.Tensor:
        """
        Compute "pinball nudge" - small adjustment based on sensor input.
        
        The nudge is STRUCTURAL, not random:
        - If object approaching origin → nudge toward avoidance
        - If trajectory crossing → nudge toward perpendicular
        """
        if len(self.buffer) == 0:
            return torch.zeros_like(main_state[:3])
        
        latest = self.buffer[-1]
        relative_pos = latest.value[:3] - self.origin_position
        
        # Distance-based nudge magnitude
        distance = relative_pos.norm()
        nudge_magnitude = 0.1 * torch.exp(-distance / 10.0)
        
        # Direction: perpendicular to approach
        if len(self.buffer) > 5:
            recent = list(self.buffer)[-5:]
            velocity = recent[-1].value[:3] - recent[0].value[:3]
            if velocity.norm() > 1e-6:
                # Perpendicular direction
                perpendicular = torch.cross(velocity, relative_pos)
                perpendicular = perpendicular / (perpendicular.norm() + 1e-10)
                return perpendicular * nudge_magnitude
        
        return relative_pos / (distance + 1e-10) * nudge_magnitude


# =============================================================================
# ORIGIN-AS-SELF STRUCTURAL TILES
# =============================================================================

class OriginTile:
    """
    TILE: origin
    
    Origin = Self = Reference frame for all structural understanding.
    
    Key insight: "Understanding the plane of travel and axis that another 
    object is traveling on greatly already contains a lot of information 
    about it and the relationship of the origin self and the object."
    
    This tile makes viewpoint STRUCTURAL, not just mathematical.
    """
    
    def __init__(self):
        self.self_position = torch.zeros(3)
        self.self_velocity = torch.zeros(3)
        self.self_orientation = torch.eye(3)
        self.self_angular_velocity = torch.zeros(3)
        
    def compute_travel_plane(self, other_position: torch.Tensor, 
                             other_velocity: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        Compute the travel plane for another object relative to self.
        
        The travel plane contains:
        - Normal: perpendicular to the plane of travel
        - The plane itself contains: origin, other_position, other_position + velocity
        
        Returns structural understanding of the object's trajectory.
        """
        # Relative position and velocity
        rel_pos = other_position - self.self_position
        rel_vel = other_velocity - self.self_velocity
        
        # Travel plane normal (cross product defines the plane)
        if rel_pos.norm() > 1e-6 and rel_vel.norm() > 1e-6:
            plane_normal = torch.cross(rel_pos, rel_vel)
            plane_normal = plane_normal / (plane_normal.norm() + 1e-10)
        else:
            plane_normal = torch.zeros(3)
        
        # Distance to travel plane (how close am I to their path?)
        # If distance is small, I'm in their path
        distance_to_plane = torch.abs(torch.dot(self.self_position - other_position, plane_normal))
        
        # Time to closest approach
        # Solve: d/dt |rel_pos + rel_vel * t|^2 = 0
        # t = -rel_pos · rel_vel / |rel_vel|^2
        if rel_vel.norm() > 1e-6:
            time_to_closest = -torch.dot(rel_pos, rel_vel) / (rel_vel.norm() ** 2)
        else:
            time_to_closest = torch.tensor(float('inf'))
        
        return {
            'plane_normal': plane_normal,
            'distance_to_plane': distance_to_plane,
            'time_to_closest': time_to_closest,
            'relative_position': rel_pos,
            'relative_velocity': rel_vel,
            'in_path': distance_to_plane < 1.0 and time_to_closest > 0  # Danger zone
        }
    
    def infer_intention(self, trajectory_history: List[torch.Tensor]) -> Dict[str, Any]:
        """
        Infer intention from trajectory history.
        
        Key insight: "A momentary glimpse lets them visualize the 5-minute 
        predictor line ahead, including speed, by visualizing the 5 minutes 
        behind. They can infer intention with extremely little data."
        """
        if len(trajectory_history) < 2:
            return {'intention': 'unknown', 'confidence': 0.0}
        
        # Convert to tensor
        positions = torch.stack(trajectory_history)
        
        # Fit linear trajectory (simple intention model)
        # More sophisticated: fit polynomial or use Kalman filter
        time_points = torch.linspace(0, len(positions) - 1, len(positions))
        
        # Linear regression for velocity estimate
        mean_t = time_points.mean()
        mean_pos = positions.mean(dim=0)
        
        velocity_estimate = torch.sum(
            (time_points - mean_t).unsqueeze(-1) * (positions - mean_pos), dim=0
        ) / torch.sum((time_points - mean_t) ** 2)
        
        # Predict future position (5 minutes ahead)
        dt_future = 300.0  # 5 minutes in seconds
        predicted_position = positions[-1] + velocity_estimate * dt_future
        
        # Intention inference
        speed = velocity_estimate.norm()
        direction = velocity_estimate / (speed + 1e-10)
        
        # Intention classification based on trajectory patterns
        if speed < 0.1:
            intention = 'stationary'
        elif torch.abs(direction[2]) > 0.8:  # Mostly vertical
            intention = 'climbing' if direction[2] > 0 else 'descending'
        elif speed > 100:
            intention = 'transit'
        else:
            intention = 'maneuvering'
        
        # Confidence from trajectory consistency
        predicted_past = positions[0] + velocity_estimate * time_points
        error = torch.mean((positions - predicted_past) ** 2)
        confidence = torch.exp(-error)
        
        return {
            'intention': intention,
            'velocity_estimate': velocity_estimate,
            'predicted_position': predicted_position,
            'speed': speed,
            'direction': direction,
            'confidence': confidence.item()
        }


# =============================================================================
# INTUITION TILES - Fast Answer Processing
# =============================================================================

class IntuitionTile:
    """
    TILE: intuition
    
    Tiles that answer questions as fast as you can say them.
    
    Key insight: "All questions have tiles process the answer meaning 
    they only have to say a few words to themselves and they have the 
    answer as quick as they can say it."
    
    Design: Pre-computed tile responses that are "ready to say."
    """
    
    # Pre-defined intuition patterns
    INTUITIONS = {
        # Navigation intuitions
        'on_collision_course': lambda d: d['time_to_closest'] > 0 and d['time_to_closest'] < 60,
        'approaching': lambda d: torch.dot(d['relative_position'], d['relative_velocity']) < 0,
        'receding': lambda d: torch.dot(d['relative_position'], d['relative_velocity']) > 0,
        'crossing_path': lambda d: d['distance_to_plane'] < 10 and d['time_to_closest'] > 0,
        
        # Intention intuitions
        'will_pass_ahead': lambda d: d['time_to_closest'] > 5 and d['distance_to_plane'] > 5,
        'will_pass_behind': lambda d: d['time_to_closest'] < -5,
        'parallel_course': lambda d: torch.abs(d['relative_velocity'][0]) < 1.0,
        
        # Speed intuitions
        'faster_than_me': lambda d: d['relative_velocity'].norm() > 0,
        'slower_than_me': lambda d: d['relative_velocity'].norm() < 0,
        
        # General intuitions
        'safe_distance': lambda d: d['relative_position'].norm() > 100,
        'danger_close': lambda d: d['relative_position'].norm() < 10,
    }
    
    @classmethod
    def quick_answer(cls, question: str, data: Dict[str, torch.Tensor]) -> Tuple[bool, float]:
        """
        Get instant answer to a question.
        
        Returns:
            - answer: Boolean result
            - confidence: How confident in the answer
        """
        if question not in cls.INTUITIONS:
            return False, 0.0
        
        try:
            result = cls.INTUITIONS[question](data)
            
            # Convert to boolean and confidence
            if isinstance(result, torch.Tensor):
                answer = result.item()
                confidence = 0.8  # Default confidence for tensor results
            else:
                answer = result
                confidence = 0.9  # Higher confidence for boolean results
            
            return bool(answer), confidence
        except:
            return False, 0.0
    
    @classmethod
    def multi_question(cls, questions: List[str], data: Dict[str, torch.Tensor]) -> Dict[str, Tuple[bool, float]]:
        """
        Answer multiple questions instantly.
        
        This is the "say a few words to yourself" mechanism:
        Multiple intuitions fire in parallel, all answers come at once.
        """
        return {q: cls.quick_answer(q, data) for q in questions}


# =============================================================================
# TRAJECTORY PREDICTOR TILE
# =============================================================================

class TrajectoryPredictorTile:
    """
    TILE: traj_pred
    
    5-minute predictor from 5-minute history.
    
    Key insight: "Visualize the 5-minute predictor line ahead of the plane 
    including speed by visualizing the 5-minute behind that they have been 
    watching and imagining the destination."
    """
    
    def __init__(self, history_window: int = 300, prediction_window: int = 300):
        self.history = deque(maxlen=history_window)  # 5 minutes at 1Hz
        self.prediction_window = prediction_window
        
    def observe(self, position: torch.Tensor, velocity: torch.Tensor, timestamp: float):
        """Add observation to history."""
        self.history.append({
            'position': position,
            'velocity': velocity,
            'timestamp': timestamp
        })
    
    def predict(self, dt: float = 1.0, steps: int = 300) -> torch.Tensor:
        """
        Predict future trajectory.
        
        Uses simple extrapolation with uncertainty growth.
        """
        if len(self.history) < 2:
            return torch.zeros(steps, 3)
        
        # Fit velocity from recent history
        recent = list(self.history)[-30:]  # Last 30 seconds
        positions = torch.stack([h['position'] for h in recent])
        velocities = torch.stack([h['velocity'] for h in recent])
        
        # Average velocity with recency weighting
        weights = torch.exp(torch.linspace(0, 1, len(velocities)))
        weights = weights / weights.sum()
        mean_velocity = (velocities * weights.unsqueeze(-1)).sum(dim=0)
        
        # Predict with uncertainty growth
        predictions = torch.zeros(steps, 3)
        current_pos = positions[-1]
        
        for i in range(steps):
            t = (i + 1) * dt
            # Position prediction
            predictions[i] = current_pos + mean_velocity * t
            
            # Note: Uncertainty grows as sqrt(t) but not stored here
        
        return predictions
    
    def predict_line(self) -> Dict[str, torch.Tensor]:
        """
        Get the predictor line summary.
        
        Returns the "intuition line" - key points for quick understanding.
        """
        full_prediction = self.predict()
        
        # Key points: 1 min, 5 min ahead
        one_min = full_prediction[60] if len(full_prediction) > 60 else full_prediction[-1]
        five_min = full_prediction[-1]
        
        # Direction and speed
        if len(self.history) > 0:
            recent_vel = self.history[-1]['velocity']
            speed = recent_vel.norm()
            direction = recent_vel / (speed + 1e-10)
        else:
            speed = torch.tensor(0.0)
            direction = torch.zeros(3)
        
        return {
            'one_minute_ahead': one_min,
            'five_minute_ahead': five_min,
            'speed': speed,
            'direction': direction,
            'full_trajectory': full_prediction
        }


# =============================================================================
# BACKGROUND CHANGE TILE
# =============================================================================

class BackgroundChangeTile:
    """
    TILE: bg_change
    
    Understand trajectory from background changes.
    
    Key insight: "Intuition about how backgrounds are supposed to change 
    behind an object and a momentary glimpse."
    
    Background parallax encodes depth and velocity.
    """
    
    def __init__(self, background_size: int = 64):
        self.background_buffer = deque(maxlen=30)  # Last 30 frames
        self.background_size = background_size
        
    def observe_background(self, background: torch.Tensor):
        """Observe background (visual features)."""
        # Ensure consistent size
        if background.shape != (self.background_size, self.background_size):
            background = F.interpolate(
                background.unsqueeze(0).unsqueeze(0),
                size=(self.background_size, self.background_size),
                mode='bilinear'
            ).squeeze()
        
        self.background_buffer.append(background)
    
    def compute_motion_from_parallax(self) -> torch.Tensor:
        """
        Infer motion from background parallax.
        
        Objects closer to observer: faster parallax
        Objects farther: slower parallax
        
        Returns estimated velocity from background changes.
        """
        if len(self.background_buffer) < 2:
            return torch.zeros(2)  # 2D motion estimate
        
        # Simple optical flow between last two frames
        prev = self.background_buffer[-2]
        curr = self.background_buffer[-1]
        
        # Gradient-based flow estimation (simplified)
        grad_x = curr[:, 1:] - curr[:, :-1]
        grad_y = curr[1:, :] - curr[:-1, :]
        
        # Average motion
        flow_x = (curr[:, 1:] - prev[:, 1:]).mean()
        flow_y = (curr[1:, :] - prev[1:, :]).mean()
        
        return torch.tensor([flow_x, flow_y])
    
    def detect_approaching(self) -> float:
        """
        Detect if objects are approaching (looming).
        
        Looming = expansion of visual field.
        """
        if len(self.background_buffer) < 10:
            return 0.0
        
        # Compare edge expansion over time
        early = self.background_buffer[0]
        late = self.background_buffer[-1]
        
        # Edge detection
        early_edges = torch.abs(early[1:, :] - early[:-1, :]).mean()
        late_edges = torch.abs(late[1:, :] - late[:-1, :]).mean()
        
        # Expansion = more edges visible
        expansion = (late_edges - early_edges) / (early_edges + 1e-10)
        
        return expansion.item()


# =============================================================================
# AGENT LOOP TILES - Small Task Processors
# =============================================================================

class AgentLoopTile:
    """
    TILE: agent_loop
    
    Small task processor that runs continuously.
    
    Design: Minimal computation, maximum insight.
    Works on specific tasks with tile-based processing.
    """
    
    def __init__(self, task_name: str, processor: Callable):
        self.task_name = task_name
        self.processor = processor
        self.state = {}
        self.last_result = None
        
    def tick(self, input_data: Any) -> Any:
        """Single tick of the agent loop."""
        self.last_result = self.processor(input_data, self.state)
        return self.last_result
    
    def get_state(self) -> Dict:
        """Get current state for debugging."""
        return {
            'task': self.task_name,
            'state': self.state,
            'last_result': self.last_result
        }


# Pre-defined agent loop processors
def collision_avoidance_processor(data: Dict, state: Dict) -> Dict:
    """Process collision avoidance logic."""
    origin = data.get('origin', torch.zeros(3))
    other_pos = data.get('other_position', torch.zeros(3))
    other_vel = data.get('other_velocity', torch.zeros(3))
    
    # Compute travel plane
    rel_pos = other_pos - origin
    rel_vel = other_vel - data.get('self_velocity', torch.zeros(3))
    
    # Time to closest approach
    if rel_vel.norm() > 1e-6:
        t_closest = -torch.dot(rel_pos, rel_vel) / (rel_vel.norm() ** 2)
    else:
        t_closest = torch.tensor(float('inf'))
    
    # Determine action
    if t_closest > 0 and t_closest < 30:  # Within 30 seconds
        # Compute avoidance direction (perpendicular to approach)
        avoid_dir = torch.cross(rel_pos, rel_vel)
        avoid_dir = avoid_dir / (avoid_dir.norm() + 1e-10)
        action = 'avoid_perpendicular'
    elif t_closest > 30:
        action = 'monitor'
    else:
        action = 'clear'
    
    return {
        'action': action,
        'avoid_direction': avoid_dir if 'avoid_dir' in dir() else torch.zeros(3),
        'time_to_closest': t_closest.item()
    }


def intention_tracking_processor(data: Dict, state: Dict) -> Dict:
    """Track intention of observed objects."""
    history_key = data.get('object_id', 'default')
    
    if 'histories' not in state:
        state['histories'] = {}
    
    if history_key not in state['histories']:
        state['histories'][history_key] = deque(maxlen=300)
    
    # Add current observation
    state['histories'][history_key].append({
        'position': data.get('position', torch.zeros(3)),
        'velocity': data.get('velocity', torch.zeros(3)),
        'timestamp': data.get('timestamp', time.time())
    })
    
    # Infer intention
    history = list(state['histories'][history_key])
    if len(history) < 10:
        return {'intention': 'unknown', 'confidence': 0.0}
    
    positions = torch.stack([h['position'] for h in history])
    velocities = torch.stack([h['velocity'] for h in history])
    
    # Trend analysis
    mean_vel = velocities.mean(dim=0)
    speed = mean_vel.norm()
    
    if speed < 0.1:
        intention = 'stationary'
    elif mean_vel[2] > 5:
        intention = 'climbing'
    elif mean_vel[2] < -5:
        intention = 'descending'
    else:
        intention = 'cruising'
    
    # Velocity consistency = confidence
    vel_std = velocities.std(dim=0).norm()
    confidence = torch.exp(-vel_std / 10).item()
    
    return {
        'intention': intention,
        'confidence': confidence,
        'mean_velocity': mean_vel,
        'speed': speed
    }


# =============================================================================
# FAST-ANSWER TILE SYSTEM
# =============================================================================

class FastAnswerSystem:
    """
    System for instant question-answering via tiles.
    
    Key insight: "Tiles answer questions as fast as you can say them."
    
    Design: Pre-register question-answer tile pairs.
    Query returns answer instantly with confidence.
    """
    
    def __init__(self):
        self.registered_tiles = {}
        self.cache = {}
        
    def register(self, question: str, tile_class: type, data_key: str):
        """Register a question with its answering tile."""
        self.registered_tiles[question] = {
            'tile': tile_class,
            'data_key': data_key
        }
    
    def query(self, question: str, data: Dict) -> Tuple[Any, float, float]:
        """
        Query for instant answer.
        
        Returns:
            - answer: The result
            - confidence: Confidence in result
            - time_ms: Time taken in milliseconds
        """
        start = time.time()
        
        if question in self.cache:
            cached = self.cache[question]
            if time.time() - cached['timestamp'] < 1.0:  # 1 second cache
                return cached['answer'], cached['confidence'], 0.0
        
        if question not in self.registered_tiles:
            return None, 0.0, 0.0
        
        tile_info = self.registered_tiles[question]
        tile_class = tile_info['tile']
        data_key = tile_info['data_key']
        
        if data_key not in data:
            return None, 0.0, 0.0
        
        # Get answer from tile
        answer, confidence = tile_class.quick_answer(question, data[data_key])
        
        elapsed = (time.time() - start) * 1000  # ms
        
        # Cache result
        self.cache[question] = {
            'answer': answer,
            'confidence': confidence,
            'timestamp': time.time()
        }
        
        return answer, confidence, elapsed
    
    def batch_query(self, questions: List[str], data: Dict) -> Dict[str, Tuple[Any, float, float]]:
        """Query multiple questions at once."""
        return {q: self.query(q, data) for q in questions}


# =============================================================================
# DEMONSTRATION
# =============================================================================

def demonstrate_sensor_intuition_tiles():
    """Demonstrate the sensor-intuition tile system."""
    
    print("=" * 70)
    print("SENSOR-INTUITION TILE DEMONSTRATION")
    print("=" * 70)
    
    # 1. Sensor Tile Demo
    print("\n[1] SENSOR TILE - Pinball Nudge")
    sensor = SensorTile()
    
    # Simulate incoming object
    for i in range(20):
        t = i * 0.1
        position = torch.tensor([10.0 - t * 2, 5.0, 0.0])  # Approaching
        reading = SensorReading(
            timestamp=time.time() + t,
            value=position,
            origin_id=0,
            sensor_type='radar'
        )
        result = sensor.ingest(reading)
    
    nudge = sensor.compute_nudge(torch.zeros(3))
    print(f"  Object approaching from {[10, 5, 0]}")
    print(f"  Computed nudge direction: {nudge.tolist()}")
    print(f"  Nudge magnitude: {nudge.norm().item():.4f}")
    
    # 2. Origin Tile Demo
    print("\n[2] ORIGIN TILE - Travel Plane Analysis")
    origin = OriginTile()
    origin.self_position = torch.tensor([0.0, 0.0, 0.0])
    origin.self_velocity = torch.tensor([50.0, 0.0, 0.0])  # Moving east at 50 m/s
    
    other_pos = torch.tensor([100.0, 50.0, 0.0])
    other_vel = torch.tensor([-50.0, 0.0, 0.0])  # Moving west
    
    travel_plane = origin.compute_travel_plane(other_pos, other_vel)
    print(f"  Self: position={[0,0,0]}, velocity=[50,0,0]")
    print(f"  Other: position={[100,50,0]}, velocity=[-50,0,0]")
    print(f"  Plane normal: {travel_plane['plane_normal'].tolist()}")
    print(f"  Time to closest: {travel_plane['time_to_closest'].item():.1f}s")
    print(f"  In path: {travel_plane['in_path']}")
    
    # 3. Intuition Tile Demo
    print("\n[3] INTUITION TILE - Quick Answers")
    data = {
        'relative_position': travel_plane['relative_position'],
        'relative_velocity': travel_plane['relative_velocity'],
        'distance_to_plane': travel_plane['distance_to_plane'],
        'time_to_closest': travel_plane['time_to_closest']
    }
    
    questions = [
        'on_collision_course',
        'approaching',
        'receding',
        'safe_distance',
        'will_pass_ahead'
    ]
    
    answers = IntuitionTile.multi_question(questions, data)
    for q, (ans, conf) in answers.items():
        print(f"  {q}: {ans} (confidence: {conf:.2f})")
    
    # 4. Trajectory Predictor Demo
    print("\n[4] TRAJECTORY PREDICTOR - 5 Minute Forecast")
    traj = TrajectoryPredictorTile()
    
    # Simulate 5 minutes of history
    for i in range(300):
        t = i * 1.0
        pos = torch.tensor([t * 50.0, 100.0 * math.sin(t / 30), 0.0])
        vel = torch.tensor([50.0, 100.0 * math.cos(t / 30) / 30, 0.0])
        traj.observe(pos, vel, t)
    
    prediction = traj.predict_line()
    print(f"  Current position: {list(traj.history)[-1]['position'].tolist()}")
    print(f"  Speed: {prediction['speed'].item():.1f} m/s")
    print(f"  Direction: {prediction['direction'].tolist()}")
    print(f"  1 minute ahead: {prediction['one_minute_ahead'].tolist()}")
    print(f"  5 minutes ahead: {prediction['five_minute_ahead'].tolist()}")
    
    # 5. Agent Loop Demo
    print("\n[5] AGENT LOOP - Collision Avoidance")
    avoidance_agent = AgentLoopTile('collision_avoidance', collision_avoidance_processor)
    
    result = avoidance_agent.tick({
        'origin': torch.zeros(3),
        'other_position': torch.tensor([100.0, 0.0, 0.0]),
        'other_velocity': torch.tensor([-60.0, 0.0, 0.0]),
        'self_velocity': torch.tensor([50.0, 0.0, 0.0])
    })
    
    print(f"  Action: {result['action']}")
    print(f"  Time to closest: {result['time_to_closest']:.1f}s")
    if result['avoid_direction'].norm() > 0:
        print(f"  Avoid direction: {result['avoid_direction'].tolist()}")
    
    # 6. Fast Answer System Demo
    print("\n[6] FAST ANSWER SYSTEM - Instant Queries")
    fast_system = FastAnswerSystem()
    
    # Register questions
    for q in questions:
        fast_system.register(q, IntuitionTile, 'default')
    
    # Query all
    results = fast_system.batch_query(questions, {'default': data})
    print(f"  Queried {len(questions)} questions")
    total_time = sum(r[2] for r in results.values())
    print(f"  Total time: {total_time:.3f}ms")
    print(f"  Average per query: {total_time/len(questions):.3f}ms")
    
    print("\n" + "=" * 70)
    print("DEMONSTRATION COMPLETE")
    print("=" * 70)
    
    return {
        'sensor_nudge': nudge.tolist(),
        'travel_plane': {k: v.tolist() if isinstance(v, torch.Tensor) else v 
                        for k, v in travel_plane.items()},
        'intuition_answers': {q: (a, c) for q, (a, c) in answers.items()},
        'trajectory_prediction': {k: v.tolist() if isinstance(v, torch.Tensor) else v 
                                  for k, v in prediction.items() if k != 'full_trajectory'},
        'agent_result': result,
        'fast_answer_time_ms': total_time
    }


if __name__ == "__main__":
    results = demonstrate_sensor_intuition_tiles()
