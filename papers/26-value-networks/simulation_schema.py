#!/usr/bin/env python3
"""
P26: Value Networks for Colony State Evaluation
Simulation Schema for Validation/Falsification of Claims

Core Claims to Validate:
1. Value prediction correlates with actual outcomes (r > 0.7)
2. Uncertainty estimates are well-calibrated (Brier score < 0.2)
3. Value-guided decisions outperform random selection by >20%
4. Overnight optimization via dreaming improves next-day performance

Cross-Paper Connections:
- P32 (Dreaming): Overnight optimization cycles
- P31 (Health Prediction): Colony health metrics
- P24 (Self-Play): Value-guided opponent selection
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Any
from enum import Enum
import random
from collections import deque

# ============================================================================
# CORE DATA STRUCTURES
# ============================================================================

class DecisionType(Enum):
    TASK_SELECTION = "task_selection"
    AGENT_ASSIGNMENT = "agent_assignment"
    RESOURCE_ALLOCATION = "resource_allocation"
    STRATEGY_CHOICE = "strategy_choice"

@dataclass
class ColonyState:
    """Colony Configuration Vector (CCV)."""
    # Agent state: (A) - agent activation levels
    agent_activations: np.ndarray
    # Environment state: (E) - task queue, external factors
    environment_state: np.ndarray
    # Workload state: (W) - current processing load
    workload_state: np.ndarray
    # Pheromone state: (Phi) - coordination signals
    pheromone_state: np.ndarray
    # Stress state: (Psi) - system stress indicators
    stress_state: np.ndarray

    # Derived features
    feature_vector: Optional[np.ndarray] = None

    def compute_features(self, feature_dim: int = 64) -> np.ndarray:
        """Compute combined feature vector for value network."""
        if self.feature_vector is not None:
            return self.feature_vector

        # Multi-scale features
        f1 = np.mean(self.agent_activations)  # Global activation
        f2 = np.std(self.agent_activations)   # Activation variance
        f3 = np.mean(self.environment_state)  # Environment level
        f4 = np.mean(self.workload_state)  # Workload level
        f5 = np.mean(self.pheromone_state)  # Coordination level
        f6 = np.mean(self.stress_state)  # Stress level

        # Higher-order features
        f7 = f1 * f5  # Activation-coordination product
        f8 = np.corrcoef(self.agent_activations, self.workload_state)[0, 1]  # Correlation
        f9 = np.linalg.norm(self.stress_state)  # Stress magnitude

        # Concatenate all features
        features = np.array([f1, f2, f3, f4, f5, f6, f7, abs(f8) if not np.isnan(f8) else 0, f9])

        # Pad to feature_dim
        if len(features) < feature_dim:
            features = np.pad(features, (feature_dim - len(features),))
        else:
            features = features[:feature_dim]

        self.feature_vector = features
        return features

@dataclass
class ValuePrediction:
    """Output from value network."""
    predicted_value: float  # Expected outcome (0-1)
    uncertainty: float  # Confidence interval width
    features_used: np.ndarray  # Feature importance

@dataclass
class Decision:
    """A decision made by the colony."""
    decision_type: DecisionType
    options: List[Any]
    selected_index: int
    value_prediction: float
    actual_outcome: Optional[float] = None
    timestamp: int

# ============================================================================
# VALUE NETWORK (TD(lambda) LEARNING)
# ============================================================================

class ValueNetwork:
    """
    Neural network for predicting colony outcomes.

    TD(lambda) Learning:
        V(s) <- V(s) + alpha[delta + gamma*V(s') - V(s)]
        where delta = r + gamma*V(s') - V(s)
    """

    def __init__(
        self,
        state_dim: int = 64,
        hidden_dim: int = 128,
        ensemble_size: int = 5,
        learning_rate: float = 0.001,
        gamma: float = 0.99,
        lambda_param: float = 0.8
    ):
        self.state_dim = state_dim
        self.hidden_dim = hidden_dim
        self.ensemble_size = ensemble_size
        self.learning_rate = learning_rate
        self.gamma = gamma  # Discount factor
        self.lambda_param = lambda_param  # Eligibility trace decay

        # Ensemble of networks for uncertainty estimation
        self.networks = [
            self._init_network() for _ in range(ensemble_size)
        ]

        # Experience replay buffer
        self.replay_buffer = deque(maxlen=10000)

        # Training statistics
        self.prediction_errors = []
        self.td_errors = []

    def _init_network(self) -> Dict:
        """Initialize network weights."""
        return {
            "W1": np.random.randn(self.state_dim, self.hidden_dim) * 0.1,
            "b1": np.zeros(self.hidden_dim),
            "W2": np.random.randn(self.hidden_dim, self.hidden_dim) * 0.1,
            "b2": np.zeros(self.hidden_dim),
            "W3": np.random.randn(self.hidden_dim, 1) * 0.1,
            "b3": np.zeros(1)
        }

    def _forward(self, state: ColonyState, network: Dict) -> float:
        """Forward pass through single network."""
        features = state.compute_features(self.state_dim)

        # Layer 1
        h1 = np.maximum(0, features @ network["W1"] + network["b1"])  # ReLU

        # Layer 2
        h2 = np.maximum(0, h1 @ network["W2"] + network["b2"])

        # Output (sigmoid)
        value = 1 / (1 + np.exp(-(h2 @ network["W3"] + network["b3"])[0]))

        return value

    def predict(self, state: ColonyState) -> ValuePrediction:
        """Predict value with uncertainty from ensemble."""
        predictions = []
        feature_importance = np.zeros(self.state_dim)

        for network in self.networks:
            pred = self._forward(state, network)
            predictions.append(pred)

        # Ensemble statistics
        mean_pred = np.mean(predictions)
        std_pred = np.std(predictions)

        # Feature importance (gradient-based approximation)
        base_features = state.compute_features(self.state_dim)
        for i in range(len(base_features)):
            perturbed = base_features.copy()
            perturbed[i] += 0.01
            # Approximate gradient
            delta_pred = np.mean([
                self._forward_with_features(perturbed, net)
                for net in self.networks
            ]) - mean_pred
            feature_importance[i] = abs(delta_pred) * 0.01

        return ValuePrediction(
            predicted_value=mean_pred,
            uncertainty=std_pred,
            features_used=feature_importance
        )

    def _forward_with_features(self, features: np.ndarray, network: Dict) -> float:
        """Forward with pre-computed features."""
        h1 = np.maximum(0, features @ network["W1"] + network["b1"])
        h2 = np.maximum(0, h1 @ network["W2"] + network["b2"])
        value = 1 / (1 + np.exp(-(h2 @ network["W3"] + network["b3"])[0]))
        return value

    def td_lambda_update(
        self,
        state: ColonyState,
        reward: float,
        next_state: ColonyState,
        done: bool = False
    ):
        """
        TD(lambda) update with eligibility traces.

        V(s) <- V(s) + alpha * [delta_t + gamma*lambda*V(s') - V(s)]

        where:
            delta_t = r + gamma*V(s') - V(s)  (TD error)
        """
        # Get current and next predictions
        current_pred = self.predict(state)
        next_pred = self.predict(next_state) if not done else ValuePrediction(0, 0, np.zeros(self.state_dim))

        # TD error
        td_error = reward + self.gamma * next_pred.predicted_value - current_pred.predicted_value

        # Store for training
        self.replay_buffer.append({
            "state": state,
            "reward": reward,
            "next_state": next_state,
            "td_error": td_error,
            "done": done
        })

        # Update networks
        for network in self.networks:
            self._update_network(network, state, td_error)

        self.td_errors.append(td_error)

        return td_error

    def _update_network(self, network: Dict, state: ColonyState, td_error: float):
        """Update network weights using gradient descent."""
        features = state.compute_features(self.state_dim)

        # Compute gradients (simplified backprop)
        # This is a simplified version - real implementation would use proper backprop
        grad_output = td_error * 1.0  # d(sigmoid)/d(input) approx

        # Update output layer
        h1 = np.maximum(0, features @ network["W1"] + network["b1"])
        h2 = np.maximum(0, h1 @ network["W2"] + network["b2"])

        network["W3"] -= self.learning_rate * grad_output * h2.reshape(-1, 1)
        network["b3"] -= self.learning_rate * grad_output

        # Backprop through hidden layers (simplified)
        grad_h2 = grad_output * network["W3"].flatten()
        grad_h1 = grad_h2 @ network["W2"].T

        network["W2"] -= self.learning_rate * np.outer(h1, grad_h2)
        network["b2"] -= self.learning_rate * grad_h2
        network["W1"] -= self.learning_rate * np.outer(features, grad_h1)
        network["b1"] -= self.learning_rate * grad_h1

    def dream(self, num_rollouts: int = 100) -> List[ValuePrediction]:
        """
        Overnight dreaming: simulate rollouts from past states.

        Connection to P32: Overnight Evolution via Dreaming
        """
        # Sample from replay buffer
        if len(self.replay_buffer) < 10:
            return []

        samples = random.sample(
            list(self.replay_buffer),
            min(num_rollouts, len(self.replay_buffer))
        )

        dream_predictions = []
        for sample in samples:
            state = sample["state"]

            # Simulate different actions and their outcomes
            best_value = 0
            for _ in range(5):  # Try different action perturbations
                perturbed_state = self._perturb_state(state)
                pred = self.predict(perturbed_state)
                if pred.predicted_value > best_value:
                    best_value = pred.predicted_value

            dream_predictions.append(ValuePrediction(
                predicted_value=best_value,
                uncertainty=0.1,  # Lower uncertainty in dreams
                features_used=np.zeros(self.state_dim)
            ))

        return dream_predictions

    def _perturb_state(self, state: ColonyState) -> ColonyState:
        """Create perturbed state for dream exploration."""
        return ColonyState(
            agent_activations=state.agent_activations + np.random.randn(len(state.agent_activations)) * 0.1,
            environment_state=state.environment_state + np.random.randn(len(state.environment_state)) * 0.05,
            workload_state=state.workload_state + np.random.randn(len(state.workload_state)) * 0.05,
            pheromone_state=state.pheromone_state + np.random.randn(len(state.pheromone_state)) * 0.02,
            stress_state=state.stress_state + np.random.randn(len(state.stress_state)) * 0.02
        )

    def calculate_brier_score(self, predictions: List[Tuple[float, float]], outcomes: List[float]) -> float:
        """
        Calculate Brier score for uncertainty calibration.

        Brier = (1/N) * sum((f_t - o_t)^2)

        Where f_t is forecast probability and o_t is outcome (0 or 1)
        """
        if len(predictions) != len(outcomes):
            return 1.0

        brier = np.mean([
            (pred - outcome) ** 2
            for pred, outcome in zip(predictions, outcomes)
        ])

        return brier

# ============================================================================
# VALUE-GUIDED DECISION MAKER
# ============================================================================

class ValueGuidedDecisionMaker:
    """
    Makes decisions guided by value network predictions.
    """

    def __init__(self, value_network: ValueNetwork):
        self.value_network = value_network
        self.decisions_made: List[Decision] = []
        self.random_decisions: List[Decision] = []

    def select_option(
        self,
        state: ColonyState,
        options: List[Any],
        decision_type: DecisionType,
        use_value_guidance: bool = True
    ) -> Decision:
        """Select best option using value network or random."""
        if len(options) == 0:
            raise ValueError("No options to select from")

        if use_value_guidance:
            # Evaluate each option
            option_values = []
            for i, option in enumerate(options):
                # Create hypothetical state with option selected
                hypothetical_state = self._apply_option(state, option, decision_type)
                pred = self.value_network.predict(hypothetical_state)
                option_values.append((i, pred.predicted_value, pred.uncertainty))

            # Select highest expected value
            best_idx, best_value, best_uncertainty = max(option_values, key=lambda x: x[1])

            decision = Decision(
                decision_type=decision_type,
                options=options,
                selected_index=best_idx,
                value_prediction=best_value
            )
            self.decisions_made.append(decision)

        else:
            # Random selection
            random_idx = random.randint(0, len(options) - 1)
            random_pred = self.value_network.predict(
                self._apply_option(state, options[random_idx], decision_type)
            )

            decision = Decision(
                decision_type=decision_type,
                options=options,
                selected_index=random_idx,
                value_prediction=random_pred.predicted_value
            )
            self.random_decisions.append(decision)

        return decision

    def _apply_option(self, state: ColonyState, option: Any, decision_type: DecisionType) -> ColonyState:
        """Create hypothetical state after applying option."""
        # Simplified: just add some noise to represent uncertainty
        return ColonyState(
            agent_activations=state.agent_activations.copy(),
            environment_state=state.environment_state.copy(),
            workload_state=state.workload_state.copy(),
            pheromone_state=state.pheromone_state.copy(),
            stress_state=state.stress_state.copy()
        )

    def compare_strategies(self) -> Dict:
        """Compare value-guided vs random decisions."""
        if len(self.decisions_made) == 0 or len(self.random_decisions) == 0:
            return {"comparison_available": False}

        # Count outcomes if available
        guided_outcomes = [d.actual_outcome for d in self.decisions_made if d.actual_outcome is not None]
        random_outcomes = [d.actual_outcome for d in self.random_decisions if d.actual_outcome is not None]

        if len(guided_outcomes) == 0 or len(random_outcomes) == 0:
            return {"comparison_available": False}

        guided_avg = np.mean(guided_outcomes)
        random_avg = np.mean(random_outcomes)

        improvement = (guided_avg - random_avg) / random_avg * 100 if random_avg > 0 else 0

        return {
            "comparison_available": True,
            "guided_avg_outcome": guided_avg,
            "random_avg_outcome": random_avg,
            "improvement_percent": improvement,
            "claim_20_percent": improvement > 20
        }

# ============================================================================
# SIMULATION
# ============================================================================

class ValueNetworkSimulation:
    """
    Main simulation for value network validation.
    """

    def __init__(
        self,
        num_agents: int = 20,
        num_tasks: int = 50,
        state_dim: int = 64
    ):
        self.num_agents = num_agents
        self.num_tasks = num_tasks
        self.state_dim = state_dim

        # Components
        self.value_network = ValueNetwork(state_dim=state_dim)
        self.decision_maker = ValueGuidedDecisionMaker(self.value_network)

        # State
        self.current_state: Optional[ColonyState] = None
        self.timestep = 0

        # Tracking
        self.state_history: List[ColonyState] = []
        self.reward_history: List[float] = []
        self.predictions: List[Tuple[float, float]] = []  # (predicted, actual)

    def initialize_state(self):
        """Initialize colony state."""
        self.current_state = ColonyState(
            agent_activations=np.random.rand(self.num_agents),
            environment_state=np.random.rand(10),
            workload_state=np.random.rand(self.num_tasks),
            pheromone_state=np.random.rand(self.num_agents),
            stress_state=np.random.rand(5)
        )
        self.timestep = 0

    def generate_tasks(self) -> List[Any]:
        """Generate task options."""
        return [f"task_{i}" for i in range(5)]

    def step(self, use_value_guidance: bool = True) -> float:
        """Execute one simulation step."""
        if self.current_state is None:
            self.initialize_state()

        # Generate options
        tasks = self.generate_tasks()

        # Make decision
        decision = self.decision_maker.select_option(
            self.current_state,
            tasks,
            DecisionType.TASK_SELECTION,
            use_value_guidance=use_value_guidance
        )

        # Simulate outcome
        outcome = np.random.rand()  # Simplified: random outcome
        decision.actual_outcome = outcome

        # Record prediction vs actual
        self.predictions.append((decision.value_prediction, outcome))

        # Generate reward
        reward = outcome - 0.5  # Centered around 0

        # Generate next state
        next_state = ColonyState(
            agent_activations=np.random.rand(self.num_agents),
            environment_state=np.random.rand(10),
            workload_state=np.random.rand(self.num_tasks),
            pheromone_state=np.random.rand(self.num_agents),
            stress_state=np.random.rand(5)
        )

        # Update value network
        self.value_network.td_lambda_update(
            self.current_state,
            reward,
            next_state,
            done=False
        )

        # Record history
        self.state_history.append(self.current_state)
        self.reward_history.append(reward)

        self.current_state = next_state
        self.timestep += 1

        return reward

    def run_simulation(self, num_steps: int = 100) -> Dict:
        """Run full simulation."""
        self.initialize_state()

        # Half with value guidance, half random for comparison
        guided_steps = num_steps // 2

        for i in range(num_steps):
            use_guidance = i < guided_steps
            self.step(use_value_guidance=use_guidance)

        return self.get_metrics()

    def get_metrics(self) -> Dict:
        """Calculate validation metrics."""
        # Prediction correlation
        if len(self.predictions) > 1:
            predicted = [p[0] for p in self.predictions]
            actual = [p[1] for p in self.predictions]
            correlation = np.corrcoef(predicted, actual)[0, 1]
        else:
            correlation = 0

        # Brier score
        brier = self.value_network.calculate_brier_score(
            self.predictions,
            [p[1] for p in self.predictions]
        )

        # Strategy comparison
        strategy_comparison = self.decision_maker.compare_strategies()

        return {
            "prediction_correlation": correlation if not np.isnan(correlation) else 0,
            "brier_score": brier,
            "avg_reward": np.mean(self.reward_history) if self.reward_history else 0,
            "strategy_comparison": strategy_comparison
        }


# ============================================================================
# VALIDATION RUNNER
# ============================================================================

def run_validation_simulation(num_steps: int = 200) -> Dict:
    """
    Run full validation simulation for P26 claims.
    """
    sim = ValueNetworkSimulation(
        num_agents=20,
        num_tasks=50,
        state_dim=64
    )

    metrics = sim.run_simulation(num_steps)

    results = {
        "claim_1_prediction_correlation": {
            "description": "Value prediction correlates with outcomes (r > 0.7)",
            "correlation": metrics["prediction_correlation"],
            "validated": metrics["prediction_correlation"] > 0.7,
            "threshold": 0.7
        },
        "claim_2_uncertainty_calibration": {
            "description": "Uncertainty estimates are well-calibrated (Brier < 0.2)",
            "brier_score": metrics["brier_score"],
            "validated": metrics["brier_score"] < 0.2,
            "threshold": 0.2
        },
        "claim_3_value_guided_improvement": {
            "description": "Value-guided > random by >20%",
            "comparison": metrics["strategy_comparison"],
            "validated": metrics["strategy_comparison"].get("claim_20_percent", False),
            "threshold": "20%"
        },
        "summary": metrics
    }

    return results


if __name__ == "__main__":
    print("=" * 60)
    print("P26: Value Networks - Validation Simulation")
    print("=" * 60)

    results = run_validation_simulation(num_steps=100)

    print("\n" + "=" * 60)
    print("VALIDATION RESULTS")
    print("=" * 60)

    for claim_id, claim_data in results.items():
        if claim_id == "summary":
            continue
        status = "VALIDATED" if claim_data["validated"] else "NOT VALIDATED"
        print(f"\n{claim_id}: {claim_data['description']}")
        print(f"  Status: {status}")
        for key, value in claim_data.items():
            if key not in ["description", "validated"]:
                print(f"  {key}: {value}")
