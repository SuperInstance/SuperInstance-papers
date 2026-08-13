"""
Test Statistical Mechanics Analysis

Run comprehensive tests of stat mech modules.
"""

import unittest
import numpy as np
from unittest.mock import Mock, patch
import tempfile
import json
from pathlib import Path
import sys

# Add package directory to path for local imports
sys.path.insert(0, str(Path(__file__).parent))


class TestDeepSeekStatMech(unittest.TestCase):
    """Test DeepSeek integration"""

    def setUp(self):
        """Set up test fixtures"""
        # Use mock API key for testing
        self.api_key = "test_key"

    @patch('deepseek_statmech.openai.OpenAI')
    def test_init(self, mock_openai):
        """Test initialization"""
        from deepseek_statmech import DeepSeekStatMech

        ds = DeepSeekStatMech(api_key=self.api_key)

        self.assertIsNotNone(ds.client)
        mock_openai.assert_called_once()

    def test_system_prompt(self):
        """Test system prompt is set correctly"""
        from deepseek_statmech import DeepSeekStatMech

        ds = DeepSeekStatMech(api_key=self.api_key)

        self.assertIn("statistical mechanics", ds.system_prompt)
        self.assertIn("partition function", ds.system_prompt)


class TestEnsembles(unittest.TestCase):
    """Test thermodynamic ensembles"""

    def setUp(self):
        """Set up test fixtures"""
        from ensembles import CanonicalEnsemble

        self.ensemble = CanonicalEnsemble(n_agents=10, temperature=2.0)

    def test_compute_energy(self):
        """Test energy computation"""
        states = np.array([1, -1, 1, -1, 1, -1, 1, -1, 1, -1])
        couplings = np.zeros((10, 10))

        energy = self.ensemble.compute_energy(states, couplings)

        self.assertEqual(energy, 0.0)

    def test_compute_magnetization(self):
        """Test magnetization computation"""
        states = np.array([1, 1, 1, -1, -1, 1, -1, -1, 1, -1])
        m = self.ensemble.compute_magnetization(states)

        expected = 0.0
        self.assertAlmostEqual(m, expected)

    def test_boltzmann_weight(self):
        """Test Boltzmann weight"""
        weight = self.ensemble.boltzmann_weight(energy=1.0)

        self.assertLess(weight, 1.0)
        self.assertGreater(weight, 0.0)

    def test_free_energy(self):
        """Test free energy computation"""
        F = self.ensemble.free_energy(partition_function=10.0)

        self.assertLess(F, 0.0)  # F = -kT ln Z < 0 for Z > 1


class TestPhaseTransitions(unittest.TestCase):
    """Test phase transition analysis"""

    def setUp(self):
        """Set up test fixtures"""
        from phase_transitions import PhaseTransitionAnalyzer

        self.analyzer = PhaseTransitionAnalyzer(n_agents=10)

    def test_compute_order_parameter(self):
        """Test order parameter computation"""
        states = np.array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
        m = self.analyzer.compute_order_parameter(states)

        self.assertAlmostEqual(m, 1.0)

    def test_susceptibility(self):
        """Test susceptibility computation"""
        temperatures = np.linspace(0.5, 3.0, 20)
        magnetizations = np.tanh(1.0 / temperatures)

        chi = self.analyzer.susceptibility(magnetizations, temperatures)

        self.assertEqual(len(chi), len(temperatures))

    def test_locate_critical_temperature(self):
        """Test critical temperature location"""
        temperatures = np.linspace(0.5, 3.0, 20)
        susceptibilities = np.exp(-((temperatures - 2.0)**2) / 0.1)

        T_c = self.analyzer.locate_critical_temperature(temperatures, susceptibilities)

        self.assertAlmostEqual(T_c, 2.0, places=1)


class TestCriticalPhenomena(unittest.TestCase):
    """Test critical phenomena analysis"""

    def setUp(self):
        """Set up test fixtures"""
        from critical_phenomena import CriticalPhenomenaAnalyzer

        self.analyzer = CriticalPhenomenaAnalyzer()

    def test_reduced_temperature(self):
        """Test reduced temperature computation"""
        temperatures = np.array([1.0, 2.0, 3.0])
        T_c = 2.0

        t = self.analyzer.reduced_temperature(temperatures, T_c)

        expected = np.array([-0.5, 0.0, 0.5])
        np.testing.assert_array_almost_equal(t, expected)

    def test_extract_beta(self):
        """Test beta exponent extraction"""
        T_c = 2.0
        temperatures = np.linspace(1.0, T_c, 50)
        magnetizations = 0.8 * ((T_c - temperatures) / T_c)**0.125

        beta, beta_err = self.analyzer.extract_beta(temperatures, magnetizations, T_c)

        self.assertAlmostEqual(beta, 0.125, delta=0.05)

    def test_classify_universality(self):
        """Test universality classification"""
        from critical_phenomena import CriticalExponents

        # 2D Ising
        exponents = CriticalExponents(0, 0.125, 1.75, 15.0, 1.0, 0.25)
        class_name = self.analyzer.classify_universality(exponents)

        self.assertIn("Ising", class_name)


class TestRenormalization(unittest.TestCase):
    """Test renormalization group analysis"""

    def setUp(self):
        """Set up test fixtures"""
        from renormalization import MomentumShellRG

        self.rg = MomentumShellRG(dimension=2.0)

    def test_beta_function(self):
        """Test beta function"""
        coupling = 0.1
        beta = self.rg.beta_function(coupling)

        # For d=2: β(g) = 2g - 3g²/(16π²)
        expected = 2 * 0.1 - 3 * 0.01 / (16 * np.pi**2)

        self.assertAlmostEqual(beta, expected, places=5)

    def test_find_fixed_points(self):
        """Test fixed point finding"""
        fixed_points = self.rg.find_fixed_points()

        self.assertGreater(len(fixed_points), 0)

        # Check Gaussian fixed point
        gaussian = [fp for fp in fixed_points if fp.universality_class == "Gaussian"]
        self.assertEqual(len(gaussian), 1)
        self.assertAlmostEqual(gaussian[0].coupling, 0.0)

    def test_critical_exponents_from_rg(self):
        """Test critical exponent calculation"""
        exponents = self.rg.critical_exponents_from_rg()

        self.assertIn("nu", exponents)
        self.assertIn("eta", exponents)
        self.assertIn("beta", exponents)

        # For d=2 (ε=2): ν = 0.5 + 2/12 + 4/162 ≈ 0.69
        self.assertGreater(exponents["nu"], 0.5)
        self.assertLess(exponents["nu"], 1.0)


class TestMeanField(unittest.TestCase):
    """Test mean field theory"""

    def setUp(self):
        """Set up test fixtures"""
        from mean_field import CurieWeissModel

        self.model = CurieWeissModel(n_spins=10)

    def test_critical_temperature(self):
        """Test critical temperature"""
        coupling = 0.1
        T_c = self.model.critical_temperature(coupling)

        # kT_c = Jz for all-to-all coupling
        expected = 0.1 * 9  # z = N - 1

        self.assertAlmostEqual(T_c, expected)

    def test_critical_exponents(self):
        """Test mean field critical exponents"""
        exponents = self.model.critical_exponents()

        self.assertAlmostEqual(exponents["alpha"], 0.0)
        self.assertAlmostEqual(exponents["beta"], 0.5)
        self.assertAlmostEqual(exponents["gamma"], 1.0)
        self.assertAlmostEqual(exponents["delta"], 3.0)

    def test_self_consistent_equation(self):
        """Test self-consistent equation"""
        m = 0.5
        coupling = 0.1
        temperature = 1.0

        residual = self.model.self_consistent_equation(m, coupling, temperature)

        # Should return m - tanh(β(Jzm + h))
        self.assertIsInstance(residual, float)


class TestNonequilibrium(unittest.TestCase):
    """Test nonequilibrium stat mech"""

    def setUp(self):
        """Set up test fixtures"""
        from nonequilibrium import MasterEquation

        self.master = MasterEquation(n_states=4)

    def test_transition_matrix_metropolis(self):
        """Test Metropolis transition matrix"""
        energy = np.array([0.0, 1.0, 1.0, 2.0])
        temperature = 2.0

        W = self.master.transition_matrix_metropolis(energy, temperature)

        # Check shape
        self.assertEqual(W.shape, (4, 4))

        # Check rows sum to 0 (probability conservation)
        for i in range(4):
            self.assertAlmostEqual(np.sum(W[i, :]), 0.0)

    def test_steady_state(self):
        """Test steady state computation"""
        energy = np.array([0.0, 1.0, 2.0, 3.0])
        W = self.master.transition_matrix_metropolis(energy, temperature=1.0)

        steady = self.master.steady_state(W)

        # Check probability normalization
        self.assertAlmostEqual(np.sum(steady.probability), 1.0)

        # Check all probabilities are non-negative
        self.assertTrue(np.all(steady.probability >= 0))

    def test_relaxation_time(self):
        """Test relaxation time computation"""
        energy = np.array([0.0, 1.0, 2.0, 3.0])
        W = self.master.transition_matrix_metropolis(energy, temperature=1.0)

        tau = self.master.relaxation_time(W)

        self.assertGreater(tau, 0)


class TestStatMechSimulator(unittest.TestCase):
    """Test statistical mechanics simulator"""

    def setUp(self):
        """Set up test fixtures"""
        from statmech_simulator import SimulationConfig, MetropolisMonteCarlo

        self.config = SimulationConfig(
            n_agents=10,
            temperature=2.0,
            coupling=0.5,
            n_steps=100,
            n_equilibration=10
        )

        self.mc = MetropolisMonteCarlo(self.config)

    def test_compute_energy(self):
        """Test energy computation"""
        energy = self.mc.compute_energy(self.mc.states)

        self.assertIsInstance(energy, float)

    def test_compute_energy_change(self):
        """Test energy change computation"""
        i = 0
        dE = self.mc.compute_energy_change(self.mc.states, i)

        self.assertIsInstance(dE, float)

    def test_metropolis_step(self):
        """Test Metropolis step"""
        beta = 1.0 / self.config.temperature
        initial_state = self.mc.states.copy()

        accepted = self.mc.metropolis_step(beta)

        # Check that one spin may have flipped
        self.assertIsInstance(accepted, bool)

    def test_run(self):
        """Test full simulation"""
        results = self.mc.run()

        # Check results structure
        self.assertIsNotNone(results.magnetizations)
        self.assertIsNotNone(results.energies)
        self.assertGreater(results.heat_capacity, 0)
        self.assertGreater(results.susceptibility, 0)
        self.assertGreater(results.acceptance_rate, 0)
        self.assertLessEqual(results.acceptance_rate, 1)


class TestIntegration(unittest.TestCase):
    """Integration tests"""

    def test_full_analysis_pipeline(self):
        """Test complete analysis pipeline"""
        # This would run the full analysis
        # For unit tests, we just check the structure exists

        from run_all import StatMechOrchestrator

        with tempfile.TemporaryDirectory() as tmpdir:
            orchestrator = StatMechOrchestrator(output_dir=tmpdir)

            # Check that orchestrator is initialized
            self.assertIsNotNone(orchestrator.deepseek)
            self.assertIsNotNone(orchestrator.results)

    def test_findings_compilation(self):
        """Test findings compilation"""
        from compile_findings import StatMechFindingsCompiler

        with tempfile.TemporaryDirectory() as tmpdir:
            compiler = StatMechFindingsCompiler(results_dir=tmpdir)

            # Create dummy results
            dummy_results = {
                "metadata": {
                    "timestamp": 1234567890,
                    "n_agents": 10,
                    "coupling": 0.5,
                    "temperature_range": [0.5, 3.0]
                },
                "analyses": {
                    "phase_transitions": {
                        "transition_type": "second_order",
                        "critical_temperature": 2.0
                    }
                }
            }

            # Compile
            findings = compiler.compile_summary(dummy_results)

            self.assertIn("Statistical Mechanics Analysis", findings)
            self.assertIn("N = 10", findings)


def run_tests():
    """Run all tests"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestDeepSeekStatMech))
    suite.addTests(loader.loadTestsFromTestCase(TestEnsembles))
    suite.addTests(loader.loadTestsFromTestCase(TestPhaseTransitions))
    suite.addTests(loader.loadTestsFromTestCase(TestCriticalPhenomena))
    suite.addTests(loader.loadTestsFromTestCase(TestRenormalization))
    suite.addTests(loader.loadTestsFromTestCase(TestMeanField))
    suite.addTests(loader.loadTestsFromTestCase(TestNonequilibrium))
    suite.addTests(loader.loadTestsFromTestCase(TestStatMechSimulator))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return result


if __name__ == "__main__":
    result = run_tests()

    # Exit with appropriate code
    exit(0 if result.wasSuccessful() else 1)
