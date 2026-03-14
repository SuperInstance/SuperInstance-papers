"""
Discovery Validation Framework for Large-Scale Simulations

This module provides comprehensive validation tools for discoveries made
through large-scale simulations, ensuring statistical rigor, reproducibility,
and theoretical grounding.

Author: SuperInstance Research Team
Date: 2026-03-13
"""

from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Any, Callable
from enum import Enum
import numpy as np
from scipy import stats
from scipy.signal import find_peaks
from sklearn.cluster import DBSCAN
from sklearn.metrics import silhouette_score
import networkx as nx
from datetime import datetime
import json
from pathlib import Path


class ValidationCriterion(Enum):
    """Types of validation criteria."""
    REPRODUCIBILITY = "reproducibility"
    ROBUSTNESS = "robustness"
    STATISTICAL_SIGNIFICANCE = "statistical_significance"
    THEORETICAL_CONSISTENCY = "theoretical_consistency"
    NOVELTY = "novelty"


class ValidationStatus(Enum):
    """Validation status levels."""
    VALIDATED = "validated"
    PROVISIONAL = "provisional"
    NEEDS_REVIEW = "needs_review"
    REJECTED = "rejected"


@dataclass
class ValidationResult:
    """Result of validation testing."""
    criterion: ValidationCriterion
    status: ValidationStatus
    score: float
    confidence_interval: Optional[Tuple[float, float]] = None
    p_value: Optional[float] = None
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class ValidationReport:
    """Comprehensive validation report for a discovery."""
    discovery_id: str
    validation_results: List[ValidationResult]
    overall_status: ValidationStatus
    overall_score: float
    recommendations: List[str]
    publication_ready: bool
    timestamp: datetime = field(default_factory=datetime.now)


class StatisticalValidator:
    """Statistical validation methods."""

    @staticmethod
    def test_reproducibility(
        measurements: List[float],
        null_mean: float = 0.0,
        alpha: float = 0.05
    ) -> ValidationResult:
        """
        Test if measurements are reproducible.

        Uses t-test to determine if measurements are significantly
        different from null hypothesis.
        """
        # Perform one-sample t-test
        t_stat, p_value = stats.ttest_1samp(measurements, null_mean)

        # Compute effect size (Cohen's d)
        effect_size = (np.mean(measurements) - null_mean) / np.std(measurements)

        # Compute confidence interval
        ci = stats.t.interval(
            1 - alpha,
            len(measurements) - 1,
            loc=np.mean(measurements),
            scale=stats.sem(measurements)
        )

        # Determine status
        if p_value < alpha and abs(effect_size) > 0.5:
            status = ValidationStatus.VALIDATED
        elif p_value < alpha:
            status = ValidationStatus.PROVISIONAL
        else:
            status = ValidationStatus.NEEDS_REVIEW

        return ValidationResult(
            criterion=ValidationCriterion.REPRODUCIBILITY,
            status=status,
            score=float(1 - p_value),
            confidence_interval=ci,
            p_value=p_value,
            details={
                't_statistic': float(t_stat),
                'effect_size': float(effect_size),
                'sample_size': len(measurements),
                'mean': float(np.mean(measurements)),
                'std': float(np.std(measurements))
            }
        )

    @staticmethod
    def test_robustness(
        baseline: float,
        perturbed_measurements: List[float],
        perturbation_magnitude: float = 0.1,
        tolerance: float = 0.2
    ) -> ValidationResult:
        """
        Test robustness to parameter variations.

        Measures how much results change under small perturbations.
        """
        # Compute relative changes
        relative_changes = [
            abs(m - baseline) / (abs(baseline) + 1e-10)
            for m in perturbed_measurements
        ]

        # Robustness score: fraction within tolerance
        robust_fraction = np.mean([rc < tolerance for rc in relative_changes])

        # Status determination
        if robust_fraction > 0.9:
            status = ValidationStatus.VALIDATED
        elif robust_fraction > 0.7:
            status = ValidationStatus.PROVISIONAL
        else:
            status = ValidationStatus.NEEDS_REVIEW

        return ValidationResult(
            criterion=ValidationCriterion.ROBUSTNESS,
            status=status,
            score=float(robust_fraction),
            details={
                'mean_relative_change': float(np.mean(relative_changes)),
                'max_relative_change': float(np.max(relative_changes)),
                'perturbation_magnitude': perturbation_magnitude,
                'tolerance': tolerance,
                'n_perturbations': len(perturbed_measurements)
            }
        )

    @staticmethod
    def test_statistical_significance(
        sample1: List[float],
        sample2: List[float],
        alpha: float = 0.05,
        test_type: str = 'two-sided'
    ) -> ValidationResult:
        """
        Test statistical significance between two samples.

        Uses Mann-Whitney U test (non-parametric) for robustness.
        """
        # Perform Mann-Whitney U test
        u_stat, p_value = stats.mannwhitneyu(
            sample1, sample2,
            alternative=test_type
        )

        # Compute effect size (rank-biserial correlation)
        n1, n2 = len(sample1), len(sample2)
        effect_size = 1 - (2 * u_stat) / (n1 * n2)

        # Power analysis (simplified)
        power = StatisticalValidator._compute_power(
            n1, n2, effect_size, alpha
        )

        # Status determination
        if p_value < alpha and power > 0.8:
            status = ValidationStatus.VALIDATED
        elif p_value < alpha:
            status = ValidationStatus.PROVISIONAL
        else:
            status = ValidationStatus.NEEDS_REVIEW

        return ValidationResult(
            criterion=ValidationCriterion.STATISTICAL_SIGNIFICANCE,
            status=status,
            score=float(1 - p_value),
            p_value=p_value,
            details={
                'u_statistic': float(u_stat),
                'effect_size': float(effect_size),
                'power': float(power),
                'sample_sizes': (n1, n2),
                'mean1': float(np.mean(sample1)),
                'mean2': float(np.mean(sample2))
            }
        )

    @staticmethod
    def _compute_power(
        n1: int,
        n2: int,
        effect_size: float,
        alpha: float
    ) -> float:
        """Compute statistical power (simplified)."""
        # Simplified power calculation
        # In practice, would use more sophisticated methods
        n_eff = 2 * n1 * n2 / (n1 + n2)
        z_alpha = stats.norm.ppf(1 - alpha/2)
        z_beta = effect_size * np.sqrt(n_eff/2) - z_alpha
        power = stats.norm.cdf(z_beta)

        return float(np.clip(power, 0, 1))

    @staticmethod
    def test_theoretical_consistency(
        measurements: List[float],
        theoretical_predictions: List[float],
        tolerance: float = 0.1
    ) -> ValidationResult:
        """
        Test consistency with theoretical predictions.

        Compares measurements to theoretical predictions.
        """
        # Compute relative errors
        relative_errors = [
            abs(m - t) / (abs(t) + 1e-10)
            for m, t in zip(measurements, theoretical_predictions)
        ]

        # Consistency score: fraction within tolerance
        consistency_fraction = np.mean([re < tolerance for re in relative_errors])

        # Compute correlation
        correlation = np.corrcoef(measurements, theoretical_predictions)[0, 1]

        # Status determination
        if consistency_fraction > 0.9 and correlation > 0.9:
            status = ValidationStatus.VALIDATED
        elif consistency_fraction > 0.7 and correlation > 0.7:
            status = ValidationStatus.PROVISIONAL
        else:
            status = ValidationStatus.NEEDS_REVIEW

        return ValidationResult(
            criterion=ValidationCriterion.THEORETICAL_CONSISTENCY,
            status=status,
            score=float(consistency_fraction),
            details={
                'mean_relative_error': float(np.mean(relative_errors)),
                'correlation': float(correlation),
                'rmse': float(np.sqrt(np.mean([(m-t)**2 for m, t in zip(measurements, theoretical_predictions)]))),
                'tolerance': tolerance
            }
        )


class ReproducibilityTester:
    """Test reproducibility of discoveries."""

    def __init__(self, n_repetitions: int = 10):
        self.n_repetitions = n_repetitions

    def test_discovery_reproducibility(
        self,
        discovery_function: Callable,
        parameters: Dict,
        metric_extractor: Callable
    ) -> ValidationResult:
        """
        Test if discovery is reproducible across multiple runs.

        Args:
            discovery_function: Function that produces the discovery
            parameters: Parameters to pass to discovery function
            metric_extractor: Function to extract metric from result

        Returns:
            ValidationResult with reproducibility assessment
        """
        # Run discovery multiple times
        measurements = []
        for i in range(self.n_repetitions):
            # Add small random perturbation to test robustness
            perturbed_params = self._perturb_parameters(parameters)

            # Run discovery
            result = discovery_function(**perturbed_params)

            # Extract metric
            metric = metric_extractor(result)
            measurements.append(metric)

        # Test statistical significance
        validation = StatisticalValidator.test_reproducibility(measurements)

        return validation

    def _perturb_parameters(
        self,
        params: Dict,
        magnitude: float = 0.01
    ) -> Dict:
        """Perturb parameters slightly."""
        perturbed = {}
        for key, value in params.items():
            if isinstance(value, (int, float)):
                # Add small random perturbation
                noise = np.random.normal(0, magnitude * abs(value))
                perturbed[key] = value + noise
            else:
                perturbed[key] = value

        return perturbed


class TheoreticalValidator:
    """Validate discoveries against theoretical predictions."""

    def __init__(self):
        self.theoretical_models = {}

    def register_theoretical_model(
        self,
        name: str,
        prediction_function: Callable
    ):
        """Register a theoretical model for validation."""
        self.theoretical_models[name] = prediction_function

    def validate_against_theory(
        self,
        discovery_data: Dict,
        model_name: str,
        tolerance: float = 0.1
    ) -> ValidationResult:
        """
        Validate discovery against theoretical model.

        Args:
            discovery_data: Data from discovery simulation
            model_name: Name of theoretical model to compare against
            tolerance: Tolerance for consistency

        Returns:
            ValidationResult with theoretical consistency assessment
        """
        if model_name not in self.theoretical_models:
            raise ValueError(f"Theoretical model {model_name} not registered")

        # Get theoretical predictions
        model = self.theoretical_models[model_name]
        theoretical_predictions = model(discovery_data)

        # Extract measurements
        measurements = discovery_data.get('measurements', [])
        if not measurements:
            # Try alternative fields
            measurements = discovery_data.get('results', [])
            measurements = measurements.get('order_parameter', [])

        # Validate consistency
        validation = StatisticalValidator.test_theoretical_consistency(
            measurements[:len(theoretical_predictions)],
            theoretical_predictions,
            tolerance
        )

        return validation

    def check_scaling_law(
        self,
        data: List[Tuple[float, float]],
        expected_exponent: float,
        tolerance: float = 0.2
    ) -> ValidationResult:
        """
        Check if data follows expected scaling law.

        Args:
            data: List of (x, y) points
            expected_exponent: Expected scaling exponent
            tolerance: Tolerance for exponent match

        Returns:
            ValidationResult for scaling law
        """
        # Fit power law: log(y) = a*log(x) + b
        x = np.array([d[0] for d in data])
        y = np.array([d[1] for d in data])

        # Remove zeros
        mask = (x > 0) & (y > 0)
        x = x[mask]
        y = y[mask]

        if len(x) < 2:
            return ValidationResult(
                criterion=ValidationCriterion.THEORETICAL_CONSISTENCY,
                status=ValidationStatus.NEEDS_REVIEW,
                score=0.0,
                details={'error': 'Insufficient data points'}
            )

        # Linear regression in log space
        log_x = np.log(x)
        log_y = np.log(y)

        coeffs = np.polyfit(log_x, log_y, 1)
        fitted_exponent = coeffs[0]

        # Compute R^2
        y_pred = np.exp(coeffs[1]) * x ** coeffs[0]
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = 1 - ss_res / ss_tot

        # Check if exponent matches expected
        exponent_match = abs(fitted_exponent - expected_exponent) < tolerance

        # Status determination
        if exponent_match and r_squared > 0.9:
            status = ValidationStatus.VALIDATED
        elif exponent_match and r_squared > 0.7:
            status = ValidationStatus.PROVISIONAL
        else:
            status = ValidationStatus.NEEDS_REVIEW

        return ValidationResult(
            criterion=ValidationCriterion.THEORETICAL_CONSISTENCY,
            status=status,
            score=float(r_squared),
            details={
                'fitted_exponent': float(fitted_exponent),
                'expected_exponent': expected_exponent,
                'r_squared': float(r_squared),
                'exponent_match': exponent_match
            }
        )


class NoveltyAssessor:
    """Assess novelty of discoveries."""

    def __init__(self, literature_database: Optional[List[Dict]] = None):
        self.literature_database = literature_database or []

    def assess_novelty(
        self,
        discovery: Dict,
        similarity_threshold: float = 0.8
    ) -> ValidationResult:
        """
        Assess novelty by comparing to literature.

        Args:
            discovery: Discovery data
            similarity_threshold: Threshold for considering similar

        Returns:
            ValidationResult with novelty assessment
        """
        # Extract key features
        features = self._extract_features(discovery)

        # Compare to literature
        max_similarity = 0.0
        most_similar = None

        for paper in self.literature_database:
            similarity = self._compute_similarity(features, paper)
            if similarity > max_similarity:
                max_similarity = similarity
                most_similar = paper

        # Novelty score: 1 - max_similarity
        novelty_score = 1 - max_similarity

        # Status determination
        if novelty_score > 0.7:
            status = ValidationStatus.VALIDATED
        elif novelty_score > 0.4:
            status = ValidationStatus.PROVISIONAL
        else:
            status = ValidationStatus.NEEDS_REVIEW

        return ValidationResult(
            criterion=ValidationCriterion.NOVELTY,
            status=status,
            score=float(novelty_score),
            details={
                'max_similarity': float(max_similarity),
                'most_similar': most_similar,
                'novelty_level': self._classify_novelty(novelty_score)
            }
        )

    def _extract_features(self, discovery: Dict) -> Dict:
        """Extract features for comparison."""
        features = {
            'parameters': discovery.get('parameters', {}),
            'system_type': discovery.get('system_type', 'unknown'),
            'scale': discovery.get('scale', 0),
            'phenomena': discovery.get('phenomena', [])
        }

        return features

    def _compute_similarity(
        self,
        features: Dict,
        paper: Dict
    ) -> float:
        """Compute similarity between features and paper."""
        # Simplified similarity computation
        # In practice, would use more sophisticated semantic similarity

        similarity = 0.0

        # Parameter similarity
        params1 = features.get('parameters', {})
        params2 = paper.get('parameters', {})

        if params1 and params2:
            # Check overlap in parameter ranges
            overlap = 0
            for key in params1:
                if key in params2:
                    # Check if ranges overlap
                    val1 = params1[key]
                    val2 = params2[key]
                    if isinstance(val1, (list, tuple)) and isinstance(val2, (list, tuple)):
                        if val1[0] < val2[1] and val1[1] > val2[0]:
                            overlap += 1

            similarity += 0.3 * (overlap / max(len(params1), 1))

        # System type similarity
        if features.get('system_type') == paper.get('system_type'):
            similarity += 0.3

        # Phenomena similarity
        phenomena1 = set(features.get('phenomena', []))
        phenomena2 = set(paper.get('phenomena', []))

        if phenomena1 and phenomena2:
            intersection = len(phenomena1 & phenomena2)
            union = len(phenomena1 | phenomena2)
            similarity += 0.4 * (intersection / union if union > 0 else 0)

        return similarity

    def _classify_novelty(self, score: float) -> str:
        """Classify novelty level."""
        if score > 0.8:
            return "highly_novel"
        elif score > 0.6:
            return "novel"
        elif score > 0.4:
            return "moderately_novel"
        else:
            return "known"


class DiscoveryValidator:
    """Comprehensive discovery validation orchestrator."""

    def __init__(self):
        self.statistical_validator = StatisticalValidator()
        self.reproducibility_tester = ReproducibilityTester()
        self.theoretical_validator = TheoreticalValidator()
        self.novelty_assessor = NoveltyAssessor()
        self.validation_history = []

    def validate_discovery(
        self,
        discovery: Dict,
        validation_criteria: List[ValidationCriterion] = None
    ) -> ValidationReport:
        """
        Perform comprehensive validation of a discovery.

        Args:
            discovery: Discovery data including parameters, results, etc.
            validation_criteria: List of criteria to validate

        Returns:
            Comprehensive ValidationReport
        """
        if validation_criteria is None:
            validation_criteria = [
                ValidationCriterion.REPRODUCIBILITY,
                ValidationCriterion.ROBUSTNESS,
                ValidationCriterion.STATISTICAL_SIGNIFICANCE,
                ValidationCriterion.THEORETICAL_CONSISTENCY,
                ValidationCriterion.NOVELTY
            ]

        validation_results = []

        # Reproducibility testing
        if ValidationCriterion.REPRODUCIBILITY in validation_criteria:
            if 'measurements' in discovery:
                result = self.statistical_validator.test_reproducibility(
                    discovery['measurements']
                )
                validation_results.append(result)

        # Robustness testing
        if ValidationCriterion.ROBUSTNESS in validation_criteria:
            if 'baseline' in discovery and 'perturbed' in discovery:
                result = self.statistical_validator.test_robustness(
                    discovery['baseline'],
                    discovery['perturbed']
                )
                validation_results.append(result)

        # Statistical significance
        if ValidationCriterion.STATISTICAL_SIGNIFICANCE in validation_criteria:
            if 'sample1' in discovery and 'sample2' in discovery:
                result = self.statistical_validator.test_statistical_significance(
                    discovery['sample1'],
                    discovery['sample2']
                )
                validation_results.append(result)

        # Theoretical consistency
        if ValidationCriterion.THEORETICAL_CONSISTENCY in validation_criteria:
            if 'scaling_data' in discovery:
                result = self.theoretical_validator.check_scaling_law(
                    discovery['scaling_data'],
                    discovery.get('expected_exponent', 1.0)
                )
                validation_results.append(result)

        # Novelty assessment
        if ValidationCriterion.NOVELTY in validation_criteria:
            result = self.novelty_assessor.assess_novelty(discovery)
            validation_results.append(result)

        # Compute overall status and score
        overall_status, overall_score = self._compute_overall_assessment(
            validation_results
        )

        # Generate recommendations
        recommendations = self._generate_recommendations(validation_results)

        # Determine publication readiness
        publication_ready = (
            overall_status == ValidationStatus.VALIDATED and
            overall_score > 0.8 and
            len([r for r in validation_results if r.status != ValidationStatus.VALIDATED]) == 0
        )

        report = ValidationReport(
            discovery_id=discovery.get('id', 'unknown'),
            validation_results=validation_results,
            overall_status=overall_status,
            overall_score=overall_score,
            recommendations=recommendations,
            publication_ready=publication_ready
        )

        self.validation_history.append(report)

        return report

    def _compute_overall_assessment(
        self,
        results: List[ValidationResult]
    ) -> Tuple[ValidationStatus, float]:
        """Compute overall assessment from validation results."""
        if not results:
            return ValidationStatus.NEEDS_REVIEW, 0.0

        # Weight scores by criterion importance
        weights = {
            ValidationCriterion.REPRODUCIBILITY: 0.25,
            ValidationCriterion.ROBUSTNESS: 0.15,
            ValidationCriterion.STATISTICAL_SIGNIFICANCE: 0.25,
            ValidationCriterion.THEORETICAL_CONSISTENCY: 0.20,
            ValidationCriterion.NOVELTY: 0.15
        }

        # Compute weighted score
        weighted_scores = []
        for result in results:
            weight = weights.get(result.criterion, 0.2)
            weighted_scores.append(weight * result.score)

        overall_score = sum(weighted_scores)

        # Determine overall status
        status_counts = {}
        for result in results:
            status_counts[result.status] = status_counts.get(result.status, 0) + 1

        # Require all critical criteria to be validated
        critical_validated = all([
            any(r.criterion == c and r.status == ValidationStatus.VALIDATED for r in results)
            for c in [ValidationCriterion.REPRODUCIBILITY, ValidationCriterion.STATISTICAL_SIGNIFICANCE]
        ])

        if critical_validated and overall_score > 0.8:
            overall_status = ValidationStatus.VALIDATED
        elif overall_score > 0.6:
            overall_status = ValidationStatus.PROVISIONAL
        else:
            overall_status = ValidationStatus.NEEDS_REVIEW

        return overall_status, overall_score

    def _generate_recommendations(
        self,
        results: List[ValidationResult]
    ) -> List[str]:
        """Generate recommendations based on validation results."""
        recommendations = []

        for result in results:
            if result.status == ValidationStatus.NEEDS_REVIEW:
                if result.criterion == ValidationCriterion.REPRODUCIBILITY:
                    recommendations.append(
                        "Increase number of repetitions to improve reproducibility"
                    )
                elif result.criterion == ValidationCriterion.ROBUSTNESS:
                    recommendations.append(
                        "Test wider range of parameter perturbations"
                    )
                elif result.criterion == ValidationCriterion.STATISTICAL_SIGNIFICANCE:
                    recommendations.append(
                        "Increase sample size or effect size"
                    )
                elif result.criterion == ValidationCriterion.THEORETICAL_CONSISTENCY:
                    recommendations.append(
                        "Review theoretical assumptions and model validity"
                    )
                elif result.criterion == ValidationCriterion.NOVELTY:
                    recommendations.append(
                        "Conduct more thorough literature review"
                    )

        # General recommendations
        if len(recommendations) == 0:
            recommendations.append("Discovery is well-validated and ready for publication")
        else:
            recommendations.append(
                "Address validation concerns before publication"
            )

        return recommendations

    def save_report(
        self,
        report: ValidationReport,
        filepath: str
    ):
        """Save validation report to file."""
        # Convert to dict
        report_dict = {
            'discovery_id': report.discovery_id,
            'overall_status': report.overall_status.value,
            'overall_score': report.overall_score,
            'publication_ready': report.publication_ready,
            'recommendations': report.recommendations,
            'validation_results': [
                {
                    'criterion': r.criterion.value,
                    'status': r.status.value,
                    'score': r.score,
                    'details': r.details
                }
                for r in report.validation_results
            ],
            'timestamp': report.timestamp.isoformat()
        }

        # Save as JSON
        with open(filepath, 'w') as f:
            json.dump(report_dict, f, indent=2)

    def load_report(self, filepath: str) -> ValidationReport:
        """Load validation report from file."""
        with open(filepath, 'r') as f:
            report_dict = json.load(f)

        # Reconstruct ValidationReport
        validation_results = []
        for r_dict in report_dict['validation_results']:
            result = ValidationResult(
                criterion=ValidationCriterion(r_dict['criterion']),
                status=ValidationStatus(r_dict['status']),
                score=r_dict['score'],
                details=r_dict.get('details', {}),
                timestamp=datetime.fromisoformat(report_dict['timestamp'])
            )
            validation_results.append(result)

        report = ValidationReport(
            discovery_id=report_dict['discovery_id'],
            validation_results=validation_results,
            overall_status=ValidationStatus(report_dict['overall_status']),
            overall_score=report_dict['overall_score'],
            recommendations=report_dict['recommendations'],
            publication_ready=report_dict['publication_ready'],
            timestamp=datetime.fromisoformat(report_dict['timestamp'])
        )

        return report


# Example usage

if __name__ == "__main__":
    # Create validator
    validator = DiscoveryValidator()

    # Register theoretical model
    def ising_critical_temperature(params):
        """Predict critical temperature for Ising model."""
        # Mean field prediction: Tc = 2*J
        J = params.get('coupling', 1.0)
        return 2.0 * J

    validator.theoretical_validator.register_theoretical_model(
        'ising_mean_field',
        ising_critical_temperature
    )

    # Example discovery
    discovery_data = {
        'id': 'phase_transition_001',
        'measurements': [1.5, 1.6, 1.55, 1.58, 1.52, 1.57, 1.54, 1.59, 1.53, 1.56],
        'baseline': 1.55,
        'perturbed': [1.52, 1.58, 1.53, 1.57, 1.54, 1.56, 1.51, 1.59, 1.52, 1.58],
        'sample1': [1.5, 1.6, 1.55, 1.58, 1.52],
        'sample2': [2.1, 2.2, 2.15, 2.18, 2.12],
        'scaling_data': [
            (10, 3.2),
            (100, 6.4),
            (1000, 12.8),
            (10000, 25.6)
        ],
        'expected_exponent': 0.5,
        'parameters': {'temperature': 2.0, 'coupling': 1.0},
        'system_type': 'ising',
        'phenomena': ['phase_transition'],
        'scale': 1000
    }

    # Validate discovery
    report = validator.validate_discovery(discovery_data)

    print("=" * 70)
    print("VALIDATION REPORT")
    print("=" * 70)
    print(f"\nDiscovery ID: {report.discovery_id}")
    print(f"Overall Status: {report.overall_status.value.upper()}")
    print(f"Overall Score: {report.overall_score:.3f}")
    print(f"Publication Ready: {'YES' if report.publication_ready else 'NO'}")

    print("\nValidation Results:")
    print("-" * 70)
    for result in report.validation_results:
        print(f"\n{result.criterion.value.replace('_', ' ').title()}:")
        print(f"  Status: {result.status.value}")
        print(f"  Score: {result.score:.3f}")
        if result.p_value is not None:
            print(f"  P-value: {result.p_value:.4f}")
        if result.confidence_interval is not None:
            print(f"  95% CI: [{result.confidence_interval[0]:.3f}, {result.confidence_interval[1]:.3f}]")

    print("\nRecommendations:")
    print("-" * 70)
    for i, rec in enumerate(report.recommendations, 1):
        print(f"{i}. {rec}")

    print("\n" + "=" * 70)
