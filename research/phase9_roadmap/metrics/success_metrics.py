"""
Success Metrics Dashboard for SuperInstance
Tracks key performance indicators across community, business, research, and impact
"""

from typing import Dict, List, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime


class MetricCategory(Enum):
    COMMUNITY = "Community"
    BUSINESS = "Business"
    RESEARCH = "Research"
    IMPACT = "Impact"
    ENGINEERING = "Engineering"


class MetricType(Enum):
    COUNTER = "Counter"  # Cumulative value
    GAUGE = "Gauge"  # Current value
    RATE = "Rate"  # Per time period
    PERCENTAGE = "Percentage"  # 0-100%


@dataclass
class Metric:
    """Represents a single success metric"""
    name: str
    category: MetricCategory
    metric_type: MetricType
    current_value: float
    target_2026: float
    target_2027: float
    target_2028: float
    target_2029: float
    target_2030: float
    unit: str
    description: str

    def progress_toward_target(self, year: int) -> float:
        """Calculate progress toward target year (0-100%)"""
        targets = {
            2026: self.target_2026,
            2027: self.target_2027,
            2028: self.target_2028,
            2029: self.target_2029,
            2030: self.target_2030
        }
        target = targets.get(year, self.target_2030)
        if target == 0:
            return 0.0
        return min(100.0, (self.current_value / target) * 100.0)

    def status(self, year: int) -> str:
        """Get status indicator for target year"""
        progress = self.progress_toward_target(year)
        if progress >= 100:
            return "✅ ACHIEVED"
        elif progress >= 75:
            return "🟢 ON TRACK"
        elif progress >= 50:
            return "🟡 AT RISK"
        else:
            return "🔴 BEHIND"


class SuccessMetricsDashboard:
    """Tracks and displays all success metrics"""

    def __init__(self):
        self.metrics: List[Metric] = []
        self.initialize_metrics()

    def initialize_metrics(self):
        """Initialize all success metrics with targets"""
        self.metrics = [
            # Community Metrics
            Metric(
                name="GitHub Stars",
                category=MetricCategory.COMMUNITY,
                metric_type=MetricType.COUNTER,
                current_value=0,  # Pre-launch
                target_2026=100,
                target_2027=1000,
                target_2028=10000,
                target_2029=50000,
                target_2030=100000,
                unit="stars",
                description="GitHub repository stars"
            ),
            Metric(
                name="Contributors",
                category=MetricCategory.COMMUNITY,
                metric_type=MetricType.GAUGE,
                current_value=0,
                target_2026=20,
                target_2027=100,
                target_2028=500,
                target_2029=1000,
                target_2030=5000,
                unit="contributors",
                description="Active GitHub contributors"
            ),
            Metric(
                name="Community Members",
                category=MetricCategory.COMMUNITY,
                metric_type=MetricType.GAUGE,
                current_value=0,
                target_2026=500,
                target_2027=5000,
                target_2028=25000,
                target_2029=50000,
                target_2030=100000,
                unit="members",
                description="Discord/Slack community members"
            ),

            # Business Metrics
            Metric(
                name="Production Deployments",
                category=MetricCategory.BUSINESS,
                metric_type=MetricType.COUNTER,
                current_value=0,
                target_2026=10,
                target_2027=100,
                target_2028=1000,
                target_2029=10000,
                target_2030=100000,
                unit="deployments",
                description="Production deployments"
            ),
            Metric(
                name="Enterprise Partners",
                category=MetricCategory.BUSINESS,
                metric_type=MetricType.GAUGE,
                current_value=0,
                target_2026=3,
                target_2027=10,
                target_2028=25,
                target_2029=35,
                target_2030=50,
                unit="partners",
                description="Enterprise partnership agreements"
            ),
            Metric(
                name="Revenue",
                category=MetricCategory.BUSINESS,
                metric_type=MetricType.COUNTER,
                current_value=0,
                target_2026=0.01,  # $10K
                target_2027=1.0,  # $1M
                target_2028=10.0,  # $10M
                target_2029=25.0,  # $25M
                target_2030=50.0,  # $50M
                unit="M$",
                description="Annual revenue"
            ),
            Metric(
                name="Valuation",
                category=MetricCategory.BUSINESS,
                metric_type=MetricType.GAUGE,
                current_value=0,
                target_2026=10.0,  # $10M
                target_2027=50.0,  # $50M
                target_2028=250.0,  # $250M
                target_2029=500.0,  # $500M
                target_2030=1000.0,  # $1B
                unit="M$",
                description="Company valuation"
            ),

            # Research Metrics
            Metric(
                name="Papers Published",
                category=MetricCategory.RESEARCH,
                metric_type=MetricType.COUNTER,
                current_value=30,  # P1-P30 complete
                target_2026=45,
                target_2027=50,
                target_2028=60,
                target_2029=70,
                target_2030=80,
                unit="papers",
                description="SuperInstance papers published"
            ),
            Metric(
                name="Citations",
                category=MetricCategory.RESEARCH,
                metric_type=MetricType.COUNTER,
                current_value=0,
                target_2026=100,
                target_2027=500,
                target_2028=2000,
                target_2029=5000,
                target_2030=10000,
                unit="citations",
                description="Academic citations"
            ),
            Metric(
                name="h-index",
                category=MetricCategory.RESEARCH,
                metric_type=MetricType.GAUGE,
                current_value=0,
                target_2026=5,
                target_2027=10,
                target_2028=20,
                target_2029=30,
                target_2030=40,
                unit="h-index",
                description="h-index (impact metric)"
            ),
            Metric(
                name="Ph.D. Theses",
                category=MetricCategory.RESEARCH,
                metric_type=MetricType.COUNTER,
                current_value=0,
                target_2026=5,
                target_2027=15,
                target_2028=30,
                target_2029=50,
                target_2030=100,
                unit="theses",
                description="Ph.D. theses based on SuperInstance"
            ),

            # Impact Metrics
            Metric(
                name="Students Trained",
                category=MetricCategory.IMPACT,
                metric_type=MetricType.COUNTER,
                current_value=0,
                target_2026=1000,
                target_2027=5000,
                target_2028=15000,
                target_2029=30000,
                target_2030=50000,
                unit="students",
                description="Students trained through programs"
            ),
            Metric(
                name="Universities",
                category=MetricCategory.IMPACT,
                metric_type=MetricType.GAUGE,
                current_value=0,
                target_2026=10,
                target_2027=50,
                target_2028=200,
                target_2029=500,
                target_2030=1000,
                unit="universities",
                description="Universities with SuperInstance curriculum"
            ),
            Metric(
                name="CO2 Saved",
                category=MetricCategory.IMPACT,
                metric_type=MetricType.COUNTER,
                current_value=0,
                target_2026=50,
                target_2027=500,
                target_2028=5000,
                target_2029=50000,
                target_2030=500000,
                unit="tons",
                description="CO2 emissions saved through efficiency"
            ),
            Metric(
                name="Jobs Created",
                category=MetricCategory.IMPACT,
                metric_type=MetricType.GAUGE,
                current_value=5,  # Core team
                target_2026=100,
                target_2027=500,
                target_2028=2000,
                target_2029=5000,
                target_2030=10000,
                unit="jobs",
                description="Jobs created (direct + indirect)"
            ),

            # Engineering Metrics
            Metric(
                name="Test Coverage",
                category=MetricCategory.ENGINEERING,
                metric_type=MetricType.PERCENTAGE,
                current_value=0,
                target_2026=80,
                target_2027=85,
                target_2028=90,
                target_2029=95,
                target_2030=95,
                unit="%",
                description="Code test coverage"
            ),
            Metric(
                name="Performance Score",
                category=MetricCategory.ENGINEERING,
                metric_type=MetricType.PERCENTAGE,
                current_value=0,
                target_2026=80,
                target_2027=90,
                target_2028=95,
                target_2029=98,
                target_2030=99,
                unit="%",
                description="Performance benchmark score"
            ),
            Metric(
                name="Security Score",
                category=MetricCategory.ENGINEERING,
                metric_type=MetricType.PERCENTAGE,
                current_value=0,
                target_2026=80,
                target_2027=90,
                target_2028=95,
                target_2029=98,
                target_2030=100,
                unit="%",
                description="Security audit score"
            )
        ]

    def get_metrics_by_category(self, category: MetricCategory) -> List[Metric]:
        """Get all metrics for a specific category"""
        return [m for m in self.metrics if m.category == category]

    def get_critical_metrics(self) -> List[Metric]:
        """Get most critical metrics for monitoring"""
        return [
            m for m in self.metrics
            if m.name in ["Production Deployments", "GitHub Stars",
                         "Contributors", "Papers Published", "Revenue"]
        ]

    def calculate_overall_progress(self, year: int) -> Dict[str, float]:
        """Calculate overall progress by category"""
        progress = {}
        for category in MetricCategory:
            category_metrics = self.get_metrics_by_category(category)
            if category_metrics:
                avg_progress = sum(
                    m.progress_toward_target(year)
                    for m in category_metrics
                ) / len(category_metrics)
                progress[category.value] = avg_progress
        return progress

    def generate_report(self, year: int = 2026) -> str:
        """Generate a comprehensive metrics report"""
        report = []
        report.append("=" * 80)
        report.append(f"SUCCESS METRICS REPORT - {year} TARGETS")
        report.append("=" * 80)

        # Overall progress
        report.append("\n--- OVERALL PROGRESS BY CATEGORY ---\n")
        progress = self.calculate_overall_progress(year)
        for category, prog in progress.items():
            status = "✅" if prog >= 75 else "🟡" if prog >= 50 else "🔴"
            report.append(f"{status} {category}: {prog:.1f}%")

        # Critical metrics
        report.append("\n--- CRITICAL METRICS ---\n")
        critical = self.get_critical_metrics()
        for metric in critical:
            prog = metric.progress_toward_target(year)
            status = metric.status(year)
            report.append(
                f"{status} {metric.name}: {metric.current_value:.0f}/{metric.target_2026:.0f} {metric.unit} "
                f"({prog:.1f}%)"
            )

        # All metrics by category
        for category in MetricCategory:
            metrics = self.get_metrics_by_category(category)
            if metrics:
                report.append(f"\n--- {category.value.upper()} METRICS ---\n")
                for metric in metrics:
                    prog = metric.progress_toward_target(year)
                    status = metric.status(year)
                    report.append(
                        f"{status} {metric.name}: {metric.current_value:.0f}/{metric.target_2026:.0f} {metric.unit} "
                        f"({prog:.1f}%)"
                    )

        report.append("\n" + "=" * 80)
        return "\n".join(report)


def main():
    """Generate and display success metrics dashboard"""
    dashboard = SuccessMetricsDashboard()

    # Generate report for 2026 targets
    print(dashboard.generate_report(2026))

    # Calculate overall health
    print("\n--- METRIC HEALTH SUMMARY ---\n")
    progress_2026 = dashboard.calculate_overall_progress(2026)
    overall = sum(progress_2026.values()) / len(progress_2026)
    print(f"Overall Progress: {overall:.1f}%")

    if overall >= 75:
        print("Status: 🟢 ON TRACK for 2026 targets")
    elif overall >= 50:
        print("Status: 🟡 NEEDS ATTENTION for 2026 targets")
    else:
        print("Status: 🔴 BEHIND for 2026 targets")

    print("\n--- RECOMMENDATIONS ---\n")
    if overall < 75:
        print("Immediate actions needed:")
        print("  - Prioritize community building (GitHub stars, contributors)")
        print("  - Accelerate production pilot programs")
        print("  - Complete remaining Phase 1 papers")
        print("  - Launch open-source repository")
    else:
        print("Continue current trajectory:")
        print("  - Maintain execution pace")
        print("  - Focus on quality over speed")
        print("  - Prepare for 2027 scaling")

    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()
