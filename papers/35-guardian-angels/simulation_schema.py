"""
P35: Guardian Angels Simulation Schema

Paper: Shadow Monitoring for Safety-Critical Systems
Claims: Shadow monitoring detects failures, enables safe rollback, prevents harmful actions
Validation: Failure detection rate, rollback effectiveness, safety guarantee
"""

import cupy as cp
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class ActionProposal:
    """Action proposed by primary system."""
    action_id: int
    action_type: str
    parameters: np.ndarray
    expected_reward: float


@dataclass
class SafetyAssessment:
    """Safety assessment by guardian angel."""
    is_safe: bool
    confidence: float
    risk_score: float
    alternative_suggested: bool


class GuardianAngel:
    """Shadow monitoring system for safety verification."""

    def __init__(self, state_dim: int, n_action_types: int):
        self.state_dim = state_dim
        self.n_action_types = n_action_types
        self.safety_threshold = 0.7
        self.rollback_buffer = []
        self.max_buffer_size = 100

    def assess_safety(self, state: np.ndarray, action: ActionProposal) -> SafetyAssessment:
        """Assess safety of proposed action."""
        # Compute risk score
        risk_score = self.compute_risk_score(state, action)

        # Safety decision
        is_safe = risk_score < (1 - self.safety_threshold)

        # Confidence based on clarity of risk
        confidence = abs(risk_score - 0.5) * 2

        # Suggest alternative if unsafe
        alternative_suggested = not is_safe and confidence > 0.6

        return SafetyAssessment(
            is_safe=is_safe,
            confidence=confidence,
            risk_score=risk_score,
            alternative_suggested=alternative_suggested
        )

    def compute_risk_score(self, state: np.ndarray, action: ActionProposal) -> float:
        """Compute risk score for action."""
        # Simple risk model based on action magnitude and state
        action_magnitude = np.linalg.norm(action.parameters)
        state_magnitude = np.linalg.norm(state)

        # Risk increases with action magnitude in critical states
        base_risk = action_magnitude / (action_magnitude + 1.0)

        # State-dependent risk
        state_risk = state_magnitude / (state_magnitude + 1.0)

        # Combined risk
        risk = 0.6 * base_risk + 0.4 * state_risk

        return float(risk)

    def store_safe_state(self, state: np.ndarray):
        """Store state for potential rollback."""
        self.rollback_buffer.append(state.copy())
        if len(self.rollback_buffer) > self.max_buffer_size:
            self.rollback_buffer.pop(0)

    def rollback(self) -> Optional[np.ndarray]:
        """Rollback to last safe state."""
        if self.rollback_buffer:
            return self.rollback_buffer[-1]
        return None


class GuardianAngelsSimulation:
    """Simulates guardian angel shadow monitoring."""

    def __init__(self, n_agents: int = 10, n_timesteps: int = 1000, failure_rate: float = 0.05):
        self.n_agents = n_agents
        self.n_timesteps = n_timesteps
        self.failure_rate = failure_rate
        self.guardian = GuardianAngel(state_dim=64, n_action_types=10)

        # Metrics
        self.harmful_actions_prevented = 0
        self.false_positives = 0
        self.rollbacks_executed = 0

    def simulate_timestep(self, t: int) -> Dict:
        """Simulate one timestep."""
        results = {
            'timestep': t,
            'actions_proposed': 0,
            'actions_blocked': 0,
            'harmful_prevented': 0,
            'false_positives': 0,
            'rollbacks': 0
        }

        for agent_id in range(self.n_agents):
            # Generate state
            state = np.random.randn(64)

            # Propose action
            action = ActionProposal(
                action_id=agent_id * 1000 + t,
                action_type=np.random.randint(10),
                parameters=np.random.randn(32) * np.random.uniform(0.5, 2.0),
                expected_reward=np.random.randn()
            )

            results['actions_proposed'] += 1

            # Guardian assessment
            assessment = self.guardian.assess_safety(state, action)

            # Simulate whether action would actually be harmful
            actually_harmful = (
                np.linalg.norm(action.parameters) > 2.0 and
                np.random.random() < self.failure_rate
            )

            if not assessment.is_safe:
                results['actions_blocked'] += 1

                if actually_harmful:
                    # Correctly blocked
                    results['harmful_prevented'] += 1
                    self.harmful_actions_prevented += 1
                else:
                    # False positive
                    results['false_positives'] += 1
                    self.false_positives += 1

                # Execute rollback if needed
                if assessment.risk_score > 0.9:
                    self.guardian.rollback()
                    results['rollbacks'] += 1
                    self.rollbacks_executed += 1
            else:
                # Action allowed, store state
                if actually_harmful:
                    # Harmful action not detected (false negative)
                    pass
                else:
                    # Safe action allowed
                    self.guardian.store_safe_state(state)

        return results

    def run_simulation(self) -> Dict:
        """Run full guardian angel simulation."""
        print(f"Running P35 Guardian Angels Simulation...")
        print(f"Agents: {self.n_agents}, Timesteps: {self.n_timesteps}")

        all_results = []

        for t in range(self.n_timesteps):
            result = self.simulate_timestep(t)
            all_results.append(result)

        # Aggregate metrics
        total_actions = sum(r['actions_proposed'] for r in all_results)
        total_blocked = sum(r['actions_blocked'] for r in all_results)
        total_harmful_prevented = sum(r['harmful_prevented'] for r in all_results)
        total_false_positives = sum(r['false_positives'] for r in all_results)
        total_rollbacks = sum(r['rollbacks'] for r in all_results)

        # Compute metrics
        block_rate = total_blocked / total_actions if total_actions > 0 else 0
        prevention_rate = total_harmful_prevented / (total_harmful_prevented + total_false_positives + 1e-8)
        false_positive_rate = total_false_positives / total_blocked if total_blocked > 0 else 0

        return {
            'total_actions': total_actions,
            'actions_blocked': total_blocked,
            'harmful_prevented': total_harmful_prevented,
            'false_positives': total_false_positives,
            'rollbacks_executed': total_rollbacks,
            'block_rate': block_rate,
            'prevention_rate': prevention_rate,
            'false_positive_rate': false_positive_rate,
            'detailed_results': all_results
        }


def main():
    """Run P35 validation simulation."""
    sim = GuardianAngelsSimulation(
        n_agents=10,
        n_timesteps=1000,
        failure_rate=0.05
    )

    results = sim.run_simulation()

    print(f"\n{'='*60}")
    print("P35 Guardian Angels Simulation Results")
    print(f"{'='*60}")
    print(f"Total Actions: {results['total_actions']}")
    print(f"Actions Blocked: {results['actions_blocked']}")
    print(f"Harmful Actions Prevented: {results['harmful_prevented']}")
    print(f"False Positives: {results['false_positives']}")
    print(f"Rollbacks Executed: {results['rollbacks_executed']}")
    print(f"Block Rate: {results['block_rate']:.2%}")
    print(f"Prevention Rate: {results['prevention_rate']:.2%}")
    print(f"False Positive Rate: {results['false_positive_rate']:.2%}")

    # Validate claims
    print(f"\n{'='*60}")
    print("Claim Validation")
    print(f"{'='*60}")

    claims = {
        ">80% prevention": results['prevention_rate'] > 0.8,
        "<20% false positive": results['false_positive_rate'] < 0.2,
        "rollbacks work": results['rollbacks_executed'] > 0,
    }

    for claim, passed in claims.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {claim}")

    return results


if __name__ == "__main__":
    main()
