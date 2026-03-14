"""
Market Opportunity Analysis for SuperInstance
Analyzes market size, segments, and growth opportunities
"""

import dataclasses
from typing import List, Dict, Optional
from enum import Enum


class MarketSegment(Enum):
    AI_RESEARCH_LABS = "AI Research Labs"
    FORTUNE_500_IT = "Fortune 500 IT"
    CLOUD_PROVIDERS = "Cloud Providers"
    EDGE_IOT = "Edge & IoT"
    ACADEMIC_INSTITUTIONS = "Academic Institutions"
    STARTUPS = "Startups"
    GOVERNMENT = "Government & Public Sector"


class DeploymentModel(Enum):
    SELF_HOSTED = "Self-Hosted"
    MANAGED_CLOUD = "Managed Cloud"
    HYBRID = "Hybrid"
    EDGE = "Edge-Deployed"


class PricingModel(Enum):
    OPEN_SOURCE = "Open Source (Free)"
    ENTERPRISE_LICENSE = "Enterprise License"
    USAGE_BASED = "Usage-Based"
    SUPPORT_CONTRACT = "Support Contract"


@dataclasses.dataclass
class MarketOpportunity:
    """Represents a specific market opportunity"""
    segment: MarketSegment
    tam: float  # Total Addressable Market (B)
    sam: float  # Serviceable Addressable Market (B)
    som_2026: float  # Serviceable Obtainable Market 2026 (M)
    som_2030: float  # Serviceable Obtainable Market 2030 (M)
    cagr: float  # Compound Annual Growth Rate
    urgency: str  # High/Medium/Low
    competition: str  # High/Medium/Low
    fit_score: float  # Product-market fit (0-100)

    def growth_potential(self) -> float:
        """Calculate growth potential score (0-100)"""
        return (self.cagr * 10) + (self.fit_score * 0.5)

    def priority_score(self) -> float:
        """Calculate priority score for targeting (0-100)"""
        urgency_map = {"High": 100, "Medium": 60, "Low": 30}
        competition_map = {"High": 30, "Medium": 60, "Low": 90}

        urgency_score = urgency_map.get(self.urgency, 50)
        competition_score = competition_map.get(self.competition, 50)

        return (self.fit_score * 0.4 +
                urgency_score * 0.3 +
                competition_score * 0.3)


class MarketOpportunityAnalyzer:
    """Analyzes market opportunities for SuperInstance"""

    def __init__(self):
        self.opportunities: List[MarketOpportunity] = []

    def analyze_all_segments(self) -> List[MarketOpportunity]:
        """Analyze all market segments"""
        return [
            # AI Research Labs (Beachhead Market)
            MarketOpportunity(
                segment=MarketSegment.AI_RESEARCH_LABS,
                tam=5.0,
                sam=1.0,
                som_2026=1.0,
                som_2030=50.0,
                cagr=120.0,  # Explosive growth in AI research
                urgency="High",
                competition="Low",  # No CRDT-first AI platform
                fit_score=95  # Perfect fit for AI-native coordination
            ),

            # Fortune 500 IT (Secondary Market)
            MarketOpportunity(
                segment=MarketSegment.FORTUNE_500_IT,
                tam=30.0,
                sam=5.0,
                som_2026=2.0,
                som_2030=100.0,
                cagr=115.0,  # Rapid digital transformation
                urgency="High",
                competition="Medium",
                fit_score=80  # Good fit for distributed applications
            ),

            # Cloud Providers (Partnership Market)
            MarketOpportunity(
                segment=MarketSegment.CLOUD_PROVIDERS,
                tam=50.0,
                sam=2.0,
                som_2026=0.5,
                som_2030=20.0,
                cagr=110.0,
                urgency="Medium",
                competition="High",  # Each cloud has proprietary solutions
                fit_score=70  # Good for differentiation, but competitive
            ),

            # Edge & IoT (Emerging Market)
            MarketOpportunity(
                segment=MarketSegment.EDGE_IOT,
                tam=20.0,
                sam=3.0,
                som_2026=0.5,
                som_2030=30.0,
                cagr=85.0,  # Edge computing growth
                urgency="Medium",
                competition="Low",  # No dominant edge coordination platform
                fit_score=90  # Excellent fit for edge-first architecture
            ),

            # Academic Institutions (Research Market)
            MarketOpportunity(
                segment=MarketSegment.ACADEMIC_INSTITUTIONS,
                tam=2.0,
                sam=0.5,
                som_2026=0.1,
                som_2030=5.0,
                cagr=120.0,  # Rapid research adoption
                urgency="Medium",
                competition="Low",  # Novel research area
                fit_score=85  # Strong fit for research collaborations
            ),

            # Startups (Early Adopter Market)
            MarketOpportunity(
                segment=MarketSegment.STARTUPS,
                sam=1.0,
                som_2026=0.5,
                som_2030=25.0,
                cagr=120.0,
                urgency="High",
                competition="Low",  # Startups adopt new tech
                fit_score=75  # Good fit for innovative startups
            ),

            # Government & Public Sector (Long-term Market)
            MarketOpportunity(
                segment=MarketSegment.GOVERNMENT,
                tam=15.0,
                sam=2.0,
                som_2026=0.1,
                som_2030=10.0,
                cagr=150.0,  # Digital government transformation
                urgency="Low",  # Slow procurement cycles
                competition="Medium",
                fit_score=65  # Requires compliance work
            )
        ]

    def prioritize_opportunities(self) -> List[tuple[MarketOpportunity, float]]:
        """Prioritize market opportunities by priority score"""
        opportunities = self.analyze_all_segments()
        scored = [(opp, opp.priority_score()) for opp in opportunities]
        return sorted(scored, key=lambda x: x[1], reverse=True)

    def revenue_projections(self) -> Dict[str, List[float]]:
        """Generate revenue projections by segment"""
        opportunities = self.analyze_all_segments()

        projections = {}
        for opp in opportunities:
            # Calculate year-over-year projections
            yearly = [opp.som_2026]  # Start with 2026
            for year in range(2027, 2031):
                prev = yearly[-1]
                growth = opp.cagr / 100.0
                yearly.append(prev * (1 + growth))

            projections[opp.segment.value] = yearly

        return projections

    def market_penetration_strategy(self) -> Dict[str, List[str]]:
        """Define market penetration strategies by segment"""
        return {
            "AI_RESEARCH_LABS": [
                "Publish papers in top venues (NeurIPS, ICML)",
                "Collaborate with leading AI labs",
                "Open-source reference implementations",
                "Provide research grants and funding",
                "Create educational content and tutorials"
            ],
            "FORTUNE_500_IT": [
                "Enterprise-grade support and SLAs",
                "Security certifications (SOC2, ISO)",
                "Case studies and ROI analysis",
                "Partner with system integrators",
                "Enterprise sales team"
            ],
            "CLOUD_PROVIDERS": [
                "Technology partnerships (not competition)",
                "Managed service agreements",
                "Revenue-sharing models",
                "Co-marketing initiatives",
                "Integration with cloud-native services"
            ],
            "EDGE_IOT": [
                "Edge-optimized binaries",
                "Low-resource profiles",
                "Offline-first capabilities",
                "Partnerships with hardware vendors",
                "Industry-specific solutions"
            ],
            "ACADEMIC_INSTITUTIONS": [
                "Free academic licenses",
                "Curriculum development",
                "Ph.D. supervision and funding",
                "Research collaborations",
                "Academic publications and citations"
            ],
            "STARTUPS": [
                "Free tier for early-stage startups",
                "Startup-friendly pricing",
                "Founder-friendly support",
                "Venture studio partnerships",
                "Success case promotion"
            ],
            "GOVERNMENT": [
                "FedRAMP and compliance certifications",
                "Government-focused features",
                "Public sector partnerships",
                "Grant-funded implementations",
                "Long-term procurement support"
            ]
        }

    def timing_strategy(self) -> Dict[str, str]:
        """Define timing strategy by market segment"""
        return {
            "YEAR_1_2026": "Focus on AI research labs and academic institutions",
            "YEAR_2_2027": "Expand to startups and early adopter enterprises",
            "YEAR_3_2028": "Enter Fortune 500 with enterprise-ready features",
            "YEAR_4_2029": "Cloud provider partnerships and edge expansion",
            "YEAR_5_2030": "Government and public sector penetration"
        }


def format_currency(value: float, scale: str = "M") -> str:
    """Format currency values"""
    if scale == "B":
        return f"${value:.1f}B"
    elif scale == "M":
        return f"${value:.1f}M"
    return f"${value:.2f}"


def main():
    """Run market opportunity analysis"""
    analyzer = MarketOpportunityAnalyzer()

    print("=" * 80)
    print("MARKET OPPORTUNITY ANALYSIS FOR SUPERINSTANCE")
    print("=" * 80)

    # Prioritized opportunities
    print("\n--- PRIORITIZED MARKET OPPORTUNITIES ---\n")
    prioritized = analyzer.prioritize_opportunities()

    for i, (opp, score) in enumerate(prioritized, 1):
        print(f"{i}. {opp.segment.value}")
        print(f"   TAM: {format_currency(opp.tam, 'B')} | SAM: {format_currency(opp.sam, 'B')}")
        print(f"   SOM: {format_currency(opp.som_2026, 'M')} (2026) -> {format_currency(opp.som_2030, 'M')} (2030)")
        print(f"   CAGR: {opp.cagr:.0f}% | Urgency: {opp.urgency} | Competition: {opp.competition}")
        print(f"   Product-Market Fit: {opp.fit_score:.0f}/100")
        print(f"   Priority Score: {score:.1f}/100")
        print()

    # Revenue projections
    print("\n--- REVENUE PROJECTIONS (Millions) ---\n")
    projections = analyzer.revenue_projections()

    print("Segment          2026    2027    2028    2029    2030")
    print("-" * 60)
    for segment, yearly in projections.items():
        print(f"{segment:<16} {yearly[0]:>6.1f}  {yearly[1]:>6.1f}  {yearly[2]:>6.1f}  {yearly[3]:>6.1f}  {yearly[4]:>6.1f}")

    # Calculate totals
    totals = [sum(year[i] for year in projections.values()) for i in range(5)]
    print("-" * 60)
    print(f"{'TOTAL':<16} {totals[0]:>6.1f}  {totals[1]:>6.1f}  {totals[2]:>6.1f}  {totals[3]:>6.1f}  {totals[4]:>6.1f}")

    # Timing strategy
    print("\n--- TIMING STRATEGY ---\n")
    timing = analyzer.timing_strategy()
    for year, focus in timing.items():
        print(f"{year}: {focus}")

    # Market penetration strategy
    print("\n--- MARKET PENETRATION STRATEGY ---\n")
    strategy = analyzer.market_penetration_strategy()
    for segment, tactics in strategy.items():
        print(f"{segment.replace('_', ' ')}:")
        for tactic in tactics:
            print(f"  - {tactic}")
        print()

    print("=" * 80)


if __name__ == "__main__":
    main()
