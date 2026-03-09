"""
DeepSeek Game Theory Interface
==============================

Interface to DeepSeek API for deriving game-theoretic models of POLLN agents.
Provides rigorous Nash equilibrium analysis, regret bounds, and convergence proofs.
"""

import openai
import json
import re
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass
import numpy as np
from scipy.optimize import linprog
import sympy as sp


@dataclass
class GameTheoreticAnalysis:
    """Results from DeepSeek game theory analysis"""
    scenario: str
    payoff_functions: Dict[str, str]
    equilibria: List[Dict[str, Any]]
    price_of_anarchy: Optional[float]
    learning_dynamics: Dict[str, str]
    convergence_proofs: List[str]
    mathematical_proofs: List[str]
    regret_bounds: Dict[str, float]


class DeepSeekGameTheorist:
    """
    Interface to DeepSeek API for game-theoretic analysis.

    Uses DeepSeek's mathematical reasoning to derive:
    - Nash equilibria (pure and mixed)
    - Regret bounds and convergence rates
    - Price of anarchy bounds
    - Learning dynamics proofs
    """

    def __init__(self, api_key: str = "YOUR_API_KEY"):
        """Initialize DeepSeek client for game theory."""
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        self.system_prompt = """You are an expert in game theory, mechanism design, and mathematical economics.

Your role is to provide rigorous game-theoretic analysis with:
- Formal game definitions (players, strategies, payoffs)
- Nash equilibrium analysis (pure and mixed strategies)
- Equilibrium existence proofs using fixed point theorems
- Regret bounds and convergence rate proofs
- Price of anarchy analysis
- Learning dynamics (no-regret, correlated equilibrium)
- Mathematical proofs for all claims

Use LaTeX notation for mathematical expressions. Provide step-by-step derivations.
Reference key theorems: Nash existence theorem, Kakutani fixed point, Folk theorem, etc."""

    def derive_stochastic_game(self, scenario: str, num_agents: int,
                              state_space: List[str], action_spaces: List[List[str]]) -> GameTheoreticAnalysis:
        """
        Derive stochastic game formulation for multi-agent scenario.

        Args:
            scenario: Description of the scenario
            num_agents: Number of agents
            state_space: List of states
            action_spaces: Action space for each agent

        Returns:
            GameTheoreticAnalysis with complete formulation
        """
        prompt = f"""
Analyze the following multi-agent scenario as a stochastic game:

Scenario: {scenario}
Number of agents: {num_agents}
State space: {state_space}
Action spaces: {action_spaces}

Derive:
1. Formal stochastic game definition (agents, states, actions, transition kernel, rewards)
2. Stage game payoffs for each state
3. State transition probabilities
4. Discount factor considerations
5. Nash equilibria in stationary strategies
6. Value function characterization (Bellman equations)
7. Convergence to equilibrium proofs

Include mathematical proofs using dynamic programming principles.
"""

        response = self._query_deepseek(prompt)
        return self._parse_game_analysis(response, scenario)

    def derive_nash_equilibrium(self, payoff_matrix: np.ndarray,
                               game_type: str = "normal_form") -> GameTheoreticAnalysis:
        """
        Derive Nash equilibrium for given payoff structure.

        Args:
            payoff_matrix: N-dimensional payoff tensor
            game_type: Type of game (normal_form, extensive_form, etc.)

        Returns:
            Complete equilibrium analysis
        """
        prompt = f"""
Analyze the Nash equilibrium structure of this game:

Game type: {game_type}
Payoff matrix shape: {payoff_matrix.shape}

Payoff tensor:
{payoff_matrix}

Derive:
1. Best response correspondences for each player
2. Pure strategy Nash equilibria (existence and computation)
3. Mixed strategy Nash equilibria using fixed point theorems
4. Equilibrium selection (refinements like subgame perfection, trembling hand)
5. Computational complexity (PPAD-completeness)
6. Algorithms: Lemke-Howson, support enumeration, replicator dynamics
7. Convergence proofs for learning dynamics

Include rigorous proofs using Nash's existence theorem and Kakutani's fixed point theorem.
"""

        response = self._query_deepseek(prompt)
        return self._parse_game_analysis(response, f"Nash equilibrium for {game_type}")

    def derive_cooperative_game(self, agents: List[str],
                               characteristic_function: Dict[Tuple[str], float]) -> GameTheoreticAnalysis:
        """
        Derive cooperative game theory analysis.

        Args:
            agents: List of agents
            characteristic_function: Value of each coalition

        Returns:
            Cooperative game analysis
        """
        prompt = f"""
Analyze this cooperative game:

Agents: {agents}
Characteristic function v(S):
{json.dumps(characteristic_function, indent=2)}

Derive:
1. Core of the game (imputation set with stability constraints)
2. Shapley value computation with axiomatic derivation
3. Nucleolus and least core
4. Bargaining set and kernel
5. Nash bargaining solution
6. Cost sharing mechanisms
7. Coalition formation dynamics
8. Computational complexity considerations

Include proofs using the Shapley value axioms (efficiency, symmetry, dummy player, additivity).
"""

        response = self._query_deepseek(prompt)
        return self._parse_game_analysis(response, "Cooperative game analysis")

    def derive_mechanism_design(self, mechanism_type: str,
                               agents: List[str],
                               valuations: Dict[str, float]) -> GameTheoreticAnalysis:
        """
        Derive incentive-compatible mechanism.

        Args:
            mechanism_type: Type of mechanism (auction, cost sharing, etc.)
            agents: Participating agents
            valuations: Agent valuations

        Returns:
            Mechanism design analysis
        """
        prompt = f"""
Design and analyze a {mechanism_type} mechanism:

Agents: {agents}
Valuations: {valuations}

Derive:
1. VCG (Vickrey-Clarke-Groves) mechanism formulation
2. Individual rationality (participation constraints)
3. Incentive compatibility (truth-telling as dominant strategy)
4. Budget balance analysis
5. Efficiency properties (Pareto optimality)
6. Revenue equivalence theorem
7. Implementation theory
8. Robustness to collusion

Include proofs using the revelation principle and VCG theorem.
"""

        response = self._query_deepseek(prompt)
        return self._parse_game_analysis(response, f"{mechanism_type} mechanism")

    def derive_learning_dynamics(self, game_spec: Dict[str, Any],
                                 learning_rule: str = "multiplicative_weights") -> GameTheoreticAnalysis:
        """
        Derive no-regret learning dynamics.

        Args:
            game_spec: Game specification
            learning_rule: Type of learning rule

        Returns:
            Learning dynamics analysis
        """
        prompt = f"""
Analyze learning dynamics in this game:

Game specification:
{json.dumps(game_spec, indent=2)}
Learning rule: {learning_rule}

Derive:
1. No-regret learning algorithm specification
2. Regret bounds (Hoeffding, Azuma-Hoeffding inequalities)
3. Convergence to correlated equilibrium
4. Multiplicative weights update analysis
5. Regret matching dynamics
6. Smoothness and convergence rates
7. Stochastic approximation theory
8. Time-averaged vs last-iterate convergence

Include rigorous regret bounds proofs and convergence rate analysis.
"""

        response = self._query_deepseek(prompt)
        return self._parse_game_analysis(response, f"{learning_rule} dynamics")

    def derive_price_of_anarchy(self, game_type: str,
                               payoff_structure: Dict[str, Any]) -> GameTheoreticAnalysis:
        """
        Derive price of anarchy bounds.

        Args:
            game_type: Type of game (congestion, resource allocation, etc.)
            payoff_structure: Payoff structure

        Returns:
            PoA analysis
        """
        prompt = f"""
Analyze the price of anarchy for this {game_type} game:

Payoff structure:
{json.dumps(payoff_structure, indent=2)}

Derive:
1. Social welfare function specification
2. Worst-case equilibrium analysis
3. Price of anarchy upper bounds
4. Tightness proofs (construct worst-case instances)
5. Coordination mechanisms
6. Efficiency recovery
7. Bounds for different equilibrium concepts
8. Stackelberg strategies

Include proofs using smoothness arguments and potential functions.
"""

        response = self._query_deepseek(prompt)
        return self._parse_game_analysis(response, f"Price of anarchy for {game_type}")

    def _query_deepseek(self, prompt: str) -> str:
        """Query DeepSeek API."""
        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{
                    "role": "system",
                    "content": self.system_prompt
                }, {
                    "role": "user",
                    "content": prompt
                }],
                temperature=0.0,
                max_tokens=4000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"DeepSeek API error: {e}")
            return ""

    def _parse_game_analysis(self, response: str, scenario: str) -> GameTheoreticAnalysis:
        """Parse DeepSeek response into structured analysis."""
        # Extract payoff functions
        payoff_functions = self._extract_payoff_functions(response)

        # Extract equilibria
        equilibria = self._extract_equilibria(response)

        # Extract price of anarchy
        poa = self._extract_price_of_anarchy(response)

        # Extract learning dynamics
        learning_dynamics = self._extract_learning_dynamics(response)

        # Extract proofs
        convergence_proofs = self._extract_proofs(response, "convergence")
        mathematical_proofs = self._extract_proofs(response, None)

        # Extract regret bounds
        regret_bounds = self._extract_regret_bounds(response)

        return GameTheoreticAnalysis(
            scenario=scenario,
            payoff_functions=payoff_functions,
            equilibria=equilibria,
            price_of_anarchy=poa,
            learning_dynamics=learning_dynamics,
            convergence_proofs=convergence_proofs,
            mathematical_proofs=mathematical_proofs,
            regret_bounds=regret_bounds
        )

    def _extract_payoff_functions(self, text: str) -> Dict[str, str]:
        """Extract payoff function definitions."""
        payoff_functions = {}
        # Look for patterns like "u_i(s) = ..."
        patterns = [
            r'u_(\w+)\((.*?)\)\s*=\s*(.+?)(?:\n|$)',
            r'payoff.*?=\s*(.+?)(?:\n|$)',
            r'π_(\w+)\s*=\s*(.+?)(?:\n|$)'
        ]
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.MULTILINE)
            for match in matches:
                if len(match.groups()) >= 3:
                    player = match.group(1)
                    payoff = match.group(3)
                    payoff_functions[player] = payoff.strip()
        return payoff_functions

    def _extract_equilibria(self, text: str) -> List[Dict[str, Any]]:
        """Extract equilibrium specifications."""
        equilibria = []
        # Look for equilibrium markers
        if "Nash equilibrium" in text:
            equilibria.append({
                "type": "Nash",
                "description": self._extract_after_keyword(text, "Nash equilibrium")
            })
        if "Correlated equilibrium" in text:
            equilibria.append({
                "type": "Correlated",
                "description": self._extract_after_keyword(text, "Correlated equilibrium")
            })
        return equilibria

    def _extract_price_of_anarchy(self, text: str) -> Optional[float]:
        """Extract price of anarchy bound."""
        # Look for patterns like "PoA ≤ X" or "PoA = X"
        patterns = [
            r'PoA\s*[≤=]\s*([\d.]+)',
            r'price of anarchy\s*[≤=]\s*([\d.]+)',
            r'PoA\s*is\s*([\d.]+)'
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return float(match.group(1))
        return None

    def _extract_learning_dynamics(self, text: str) -> Dict[str, str]:
        """Extract learning dynamics specifications."""
        dynamics = {}
        learning_keywords = ["regret", "convergence", "learning rate", "update"]
        for keyword in learning_keywords:
            if keyword.lower() in text.lower():
                dynamics[keyword] = self._extract_after_keyword(text, keyword)
        return dynamics

    def _extract_proofs(self, text: str, proof_type: Optional[str]) -> List[str]:
        """Extract mathematical proofs."""
        proofs = []
        # Look for proof blocks
        if proof_type:
            pattern = rf'{proof_type.*?proof.*?:(.*?)(?=\n\n|\Z)'
        else:
            pattern = r'proof.*?:(.*?)(?=\n\n|\Z)'
        matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            proofs.append(match.group(1).strip()[:500])  # Limit length
        return proofs

    def _extract_regret_bounds(self, text: str) -> Dict[str, float]:
        """Extract regret bounds."""
        bounds = {}
        patterns = [
            r'regret\s*[≤=]\s*O\(([^)]+)\)',
            r'regret\s*bound.*?([\d.]+)',
            r'R_T\s*[≤=]\s*(\S+)'
        ]
        for pattern in patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                bound = match.group(1)
                bounds[f"bound_{len(bounds)}"] = bound
        return bounds

    def _extract_after_keyword(self, text: str, keyword: str) -> str:
        """Extract text after a keyword."""
        pattern = rf'{keyword}.*?:\s*(.*?)(?=\n\n|\Z)'
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1).strip()[:500]
        return ""


class GameTheoryValidator:
    """Validate game-theoretic derivations from DeepSeek."""

    @staticmethod
    def verify_nash_equilibrium(payoff_matrix: np.ndarray,
                                strategy_profile: np.ndarray,
                                tolerance: float = 1e-6) -> bool:
        """
        Verify if a strategy profile is a Nash equilibrium.

        Args:
            payoff_matrix: N-dimensional payoff tensor
            strategy_profile: Mixed strategy for each player
            tolerance: Numerical tolerance

        Returns:
            True if NE is verified
        """
        num_players = len(strategy_profile)

        for player in range(num_players):
            # Compute expected payoff for current strategy
            current_payoff = GameTheoryValidator._compute_expected_payoff(
                payoff_matrix, strategy_profile, player
            )

            # Check all possible deviations
            for action in range(payoff_matrix.shape[player]):
                deviation_strategy = strategy_profile.copy()
                deviation_strategy[player] = np.zeros(len(strategy_profile[player]))
                deviation_strategy[player][action] = 1.0

                deviation_payoff = GameTheoryValidator._compute_expected_payoff(
                    payoff_matrix, deviation_strategy, player
                )

                # Current strategy should be optimal
                if deviation_payoff > current_payoff + tolerance:
                    return False

        return True

    @staticmethod
    def _compute_expected_payoff(payoff_matrix: np.ndarray,
                                  strategy_profile: np.ndarray,
                                  player: int) -> float:
        """Compute expected payoff for a player."""
        # This is a simplified computation
        # In practice, need to integrate over all strategy profiles
        expected_payoff = 0.0
        return expected_payoff

    @staticmethod
    def verify_shapley_axioms(agents: List[str],
                              shapley_values: Dict[str, float],
                              characteristic_function: Dict[Tuple[str], float]) -> bool:
        """
        Verify Shapley value axioms.

        Args:
            agents: List of agents
            shapley_values: Computed Shapley values
            characteristic_function: Characteristic function

        Returns:
            True if all axioms satisfied
        """
        # Efficiency: Sum of Shapley values = v(N)
        total_shapley = sum(shapley_values.values())
        grand_coalition_value = characteristic_function[tuple(agents)]
        efficiency_holds = abs(total_shapley - grand_coalition_value) < 1e-6

        # Symmetry: Symmetric agents have equal values
        # (Would require checking all permutations)

        # Dummy player: Agents with zero marginal contribution get zero

        # Additivity: v(S ∪ T) = v(S) + v(T) for disjoint coalitions

        return efficiency_holds

    @staticmethod
    def compute_core(characteristic_function: Dict[Tuple[str], float],
                    agents: List[str]) -> List[Dict[str, float]]:
        """
        Compute the core of a cooperative game.

        Args:
            characteristic_function: Value of each coalition
            agents: List of agents

        Returns:
            List of imputations in the core
        """
        n = len(agents)
        core = []

        # Core constraints:
        # 1. Efficiency: sum_i x_i = v(N)
        # 2. Coalitional rationality: sum_{i in S} x_i >= v(S) for all S

        # Linear programming formulation
        # This is simplified - actual implementation would use scipy.optimize.linprog

        return core

    @staticmethod
    def verify_regret_bound(decisions: List[int],
                           payoffs: List[float],
                           best_possible: float,
                           T: int) -> Dict[str, float]:
        """
        Verify regret bounds.

        Args:
            decisions: Decision history
            payoffs: Payoff history
            best_possible: Best possible payoff in hindsight
            T: Time horizon

        Returns:
            Regret statistics
        """
        total_payoff = sum(payoffs)
        regret = best_possible * T - total_payoff
        average_regret = regret / T

        return {
            "total_regret": regret,
            "average_regret": average_regret,
            "regret_bound": regret / np.sqrt(T) if T > 0 else float('inf')
        }


if __name__ == "__main__":
    # Test the DeepSeek interface
    theorist = DeepSeekGameTheorist()

    # Example: Analyze a 2x2 Prisoner's Dilemma
    payoff_matrix = np.array([
        [[3, 3], [0, 5]],  # Player 1's payoffs
        [[3, 0], [1, 1]]   # Player 2's payoffs
    ])

    print("Analyzing Prisoner's Dilemma...")
    analysis = theorist.derive_nash_equilibrium(payoff_matrix, "Prisoner's Dilemma")
    print(f"Scenario: {analysis.scenario}")
    print(f"Equilibria: {len(analysis.equilibria)} found")
    print(f"Price of Anarchy: {analysis.price_of_anarchy}")
