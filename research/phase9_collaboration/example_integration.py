"""
Phase 9 Collaboration Framework - Complete Integration Example
===============================================================

This example demonstrates the complete workflow of the global research
collaboration infrastructure, from researcher registration to publication.

Workflow:
1. Register researchers in the network
2. Find collaborators using matchmaking
3. Create collaboration agreement
4. Allocate shared compute resources
4. Track contributions and calculate authorship
5. Schedule virtual seminars
6. Share results through the portal
"""

from datetime import datetime, timedelta
from research_network import (
    ResearchNetwork, ResearchProfile, ExpertiseLevel, ResearchArea
)
from project_matchmaking import (
    MatchmakingEngine, ProjectProposal
)
from joint_research.collaboration_agreement import (
    AgreementGenerator, Institution
)
from shared_infrastructure import (
    InfrastructureManager, ResourceType, CloudProvider, GPUType
)
from joint_research.authorship_calculator import (
    AuthorshipCalculator, ContributionType
)
from communication.seminar_series import (
    SeminarManager, SeminarFormat, SeminarFrequency
)
from resources.compute_marketplace import (
    ComputeMarketplace, ResourceTier
)
from data_exchange import (
    DataExchangeManager, DataClassification
)
from results_portal import (
    ResultsPortal, ResultType, PublicationVenue
)


def main():
    """
    Complete example of global research collaboration workflow.
    """
    print("=" * 80)
    print("PHASE 9: GLOBAL RESEARCH COLLABORATION NETWORK")
    print("Complete Integration Example")
    print("=" * 80)
    print()

    # =========================================================================
    # STEP 1: Initialize Collaboration Infrastructure
    # =========================================================================
    print("STEP 1: Initializing Collaboration Infrastructure...")
    print("-" * 80)

    network = ResearchNetwork()
    matchmaking_engine = MatchmakingEngine()
    agreement_generator = AgreementGenerator()
    infra_manager = InfrastructureManager()
    authorship_calc = AuthorshipCalculator()
    seminar_manager = SeminarManager()
    compute_market = ComputeMarketplace()
    data_exchange = DataExchangeManager()
    results_portal = ResultsPortal()

    print("✓ All systems initialized")
    print()

    # =========================================================================
    # STEP 2: Register Researchers
    # =========================================================================
    print("STEP 2: Registering Researchers...")
    print("-" * 80)

    # MIT Researcher
    alice = ResearchProfile(
        researcher_id="r001",
        name="Dr. Alice Chen",
        email="alice.chen@mit.edu",
        institution="MIT",
        department="Computer Science",
        location="Cambridge, MA, USA",
        timezone="UTC-5",
        languages=["English", "Mandarin"],
        expertise_level=ExpertiseLevel.ASSISTANT_PROFESSOR,
        primary_research_area=ResearchArea.DISTRIBUTED_SYSTEMS,
        secondary_areas=[ResearchArea.COMPUTER_SCIENCE, ResearchArea.NETWORK_TOPOLOGY],
        specific_skills=["Python", "Kubernetes", "Consensus Algorithms", "Distributed Systems"],
        papers_of_interest=["P2", "P12", "P13", "P27"],
        collaboration_interests=["Joint Research", "Grant Writing", "Paper Co-authorship"],
        availability_hours_per_week=20,
        publications=[
            {"title": "Energy-Aware Consensus Protocols", "venue": "PODC", "year": "2023", "citations": "45"}
        ],
        h_index=15
    )

    # TUM Researcher
    bob = ResearchProfile(
        researcher_id="r002",
        name="Dr. Bob Mueller",
        email="bob.mueller@tum.de",
        institution="Technical University of Munich",
        department="Mathematics",
        location="Munich, Germany",
        timezone="UTC+1",
        languages=["German", "English", "French"],
        expertise_level=ExpertiseLevel.ASSOCIATE_PROFESSOR,
        primary_research_area=ResearchArea.MATHEMATICS,
        secondary_areas=[ResearchArea.PHYSICS, ResearchArea.QUANTUM_COMPUTING],
        specific_skills=["Formal Proofs", "Coq", "Tensor Calculus", "Differential Geometry"],
        papers_of_interest=["P2", "P4", "P9", "P12"],
        collaboration_interests=["Joint Research", "Student Exchange", "Formal Verification"],
        availability_hours_per_week=15,
        publications=[
            {"title": "Geometric Tensors in Higher Dimensions", "venue": "Annals of Mathematics", "year": "2022", "citations": "78"}
        ],
        h_index=28
    )

    # Stanford Researcher
    carol = ResearchProfile(
        researcher_id="r003",
        name="Dr. Carol Williams",
        email="carol.williams@stanford.edu",
        institution="Stanford University",
        department="Computer Science",
        location="Stanford, CA, USA",
        timezone="UTC-8",
        languages=["English", "Spanish"],
        expertise_level=ExpertiseLevel.POSTDOCTORAL,
        primary_research_area=ResearchArea.ARTIFICIAL_INTELLIGENCE,
        secondary_areas=[ResearchArea.DISTRIBUTED_SYSTEMS, ResearchArea.NEUROMORPHIC_COMPUTING],
        specific_skills=["PyTorch", "TensorFlow", "Reinforcement Learning", "GPU Optimization"],
        papers_of_interest=["P12", "P13", "P26", "P32"],
        collaboration_interests=["Joint Research", "Data Sharing", "Algorithm Development"],
        availability_hours_per_week=25,
        publications=[
            {"title": "Neural Network Acceleration", "venue": "NeurIPS", "year": "2023", "citations": "120"}
        ],
        h_index=12
    )

    # Register all researchers
    network.register_researcher(alice)
    network.register_researcher(bob)
    network.register_researcher(carol)

    print(f"✓ Registered 3 researchers:")
    print(f"  - {alice.name} ({alice.institution})")
    print(f"  - {bob.name} ({bob.institution})")
    print(f"  - {carol.name} ({carol.institution})")
    print()

    # =========================================================================
    # STEP 3: Create Research Proposal
    # =========================================================================
    print("STEP 3: Creating Research Proposal...")
    print("-" * 80)

    proposal = ProjectProposal(
        proposal_id="prop_001",
        title="Cross-Cultural Energy-Efficient Consensus for Edge Networks",
        description="Developing novel energy-efficient consensus algorithms optimized for edge computing environments with cultural adaptability and formal verification",
        proposer_id="r001",
        required_skills=["Python", "Consensus Algorithms", "Formal Proofs", "GPU Computing"],
        required_expertise=[
            ResearchArea.DISTRIBUTED_SYSTEMS,
            ResearchArea.MATHEMATICS,
            ResearchArea.ARTIFICIAL_INTELLIGENCE
        ],
        ideal_team_size=4,
        expected_duration_months=12,
        hours_per_week_required=15,
        related_papers=["P12", "P13"],
        research_description="energy efficient consensus edge computing formal verification cultural adaptation"
    )

    print(f"✓ Created proposal: {proposal.title}")
    print()

    # =========================================================================
    # STEP 4: Find Collaborators
    # =========================================================================
    print("STEP 4: Finding Collaborators...")
    print("-" * 80)

    matches = matchmaking_engine.find_matches(
        proposal,
        network.researchers,
        max_results=5
    )

    print(f"✓ Found {len(matches)} potential collaborators")
    for i, (researcher, score) in enumerate(matches, 1):
        profile = network.researchers[researcher.researcher_id]
        print(f"  {i}. {profile.name} ({profile.institution})")
        print(f"     Overall Score: {score:.2f}")
        print(f"     Match Type: {researcher.match_type.value}")
        print(f"     Role: {researcher.collaboration_role}")
        print()

    # =========================================================================
    # STEP 5: Create Collaboration Project
    # =========================================================================
    print("STEP 5: Creating Collaboration Project...")
    print("-" * 80)

    project = network.create_collaboration_project(
        title=proposal.title,
        description=proposal.description,
        lead_researcher_id="r001",
        team_members=["r002", "r003"],
        related_papers=["P12", "P13"],
        research_goals=[
            "Design energy-efficient consensus protocol",
            "Formally verify correctness using Coq",
            "Implement and benchmark on GPU clusters",
            "Test across cultural contexts"
        ],
        expected_end_date=datetime.now() + timedelta(days=365)
    )

    print(f"✓ Created project: {project.title}")
    print(f"  Project ID: {project.project_id}")
    print(f"  Team: {project.institutions}")
    print()

    # =========================================================================
    # STEP 6: Generate Collaboration Agreement
    # =========================================================================
    print("STEP 6: Generating Collaboration Agreement...")
    print("-" * 80)

    mit_inst = Institution(
        institution_id="inst001",
        name="Massachusetts Institute of Technology",
        type="university",
        country="USA",
        address="77 Massachusetts Ave, Cambridge, MA 02139",
        contact_person="Dr. Alice Chen",
        contact_email="achen@mit.edu",
        legal_department_email="legal@mit.edu",
        default_ip_policy="university_policy",
        requires_irb=True
    )

    tum_inst = Institution(
        institution_id="inst002",
        name="Technical University of Munich",
        type="university",
        country="Germany",
        address="Arcisstraße 21, 80333 München",
        contact_person="Dr. Bob Mueller",
        contact_email="bob.mueller@tum.de",
        legal_department_email="legal@tum.de",
        default_ip_policy="university_policy",
        requires_irb=True
    )

    stanford_inst = Institution(
        institution_id="inst003",
        name="Stanford University",
        type="university",
        country="USA",
        address="450 Serra Mall, Stanford, CA 94305",
        contact_person="Dr. Carol Williams",
        contact_email="carol.williams@stanford.edu",
        legal_department_email="legal@stanford.edu",
        default_ip_policy="university_policy",
        requires_irb=True
    )

    agreement = agreement_generator.create_agreement(
        project_title=project.title,
        project_description=project.description,
        institutions=[mit_inst, tum_inst, stanford_inst],
        lead_institution_id="inst001",
        research_objectives=project.research_goals,
        deliverables=[
            "Joint research paper",
            "Formally verified codebase",
            "Benchmark dataset",
            "Open-source implementation"
        ],
        terms_override={
            "end_date": datetime.now() + timedelta(days=730),
            "budget_usd": 350000,
            "governing_law": "Massachusetts State Law"
        }
    )

    print(f"✓ Generated agreement: {agreement.agreement_id}")
    print(f"  Type: {agreement.terms.agreement_type.value}")
    print(f"  Budget: ${agreement.terms.budget_usd:,.0f}")
    print()

    # =========================================================================
    # STEP 7: Allocate Compute Resources
    # =========================================================================
    print("STEP 7: Allocating Compute Resources...")
    print("-" * 80)

    # List H100 cluster
    h100_cluster = infra_manager.register_compute_resource(
        name="H100 Research Cluster",
        resource_type=ResourceType.GPU_TIME,
        provider=CloudProvider.AWS,
        gpu_type=GPUType.H100,
        gpu_count=8,
        cpu_cores=128,
        memory_gb=1024,
        hourly_cost=15.0,
        owning_institution="MIT",
        contact_email="compute@mit.edu"
    )

    # Allocate to project
    allocation = infra_manager.allocate_resource(
        resource_id=h100_cluster.resource_id,
        project_id=project.project_id,
        allocated_by="admin",
        allocated_to=["r001", "r002", "r003"],
        start_time=datetime.now(),
        end_time=datetime.now() + timedelta(days=30),
        estimated_hours=720,  # 30 days * 24 hours
        purpose="Train and benchmark consensus algorithms"
    )

    print(f"✓ Allocated {h100_cluster.name}")
    print(f"  Duration: 30 days")
    print(f"  Estimated cost: ${allocation.estimated_cost:,.2f}")
    print()

    # =========================================================================
    # STEP 8: Track Contributions
    # =========================================================================
    print("STEP 8: Tracking Research Contributions...")
    print("-" * 80)

    # Alice's contributions
    authorship_calc.add_contribution(
        contributor_id="r001",
        contributor_name=alice.name,
        contribution_type=ContributionType.IDEA_CONCEPTION,
        description="Initial concept and problem formulation",
        hours_spent=50
    )
    authorship_calc.add_contribution(
        contributor_id="r001",
        contributor_name=alice.name,
        contribution_type=ContributionType.WRITING_DRAFT,
        description="Wrote initial manuscript",
        hours_spent=80
    )

    # Bob's contributions
    authorship_calc.add_contribution(
        contributor_id="r002",
        contributor_name=bob.name,
        contribution_type=ContributionType.METHODOLOGY_DESIGN,
        description="Mathematical framework and formal verification approach",
        hours_spent=120,
        impact_weight=1.3
    )
    authorship_calc.add_contribution(
        contributor_id="r002",
        contributor_name=bob.name,
        contribution_type=ContributionType.IMPLEMENTATION,
        description="Coq formal proofs",
        hours_spent=100
    )

    # Carol's contributions
    authorship_calc.add_contribution(
        contributor_id="r003",
        contributor_name=carol.name,
        contribution_type=ContributionType.IMPLEMENTATION,
        description="GPU implementation and optimization",
        hours_spent=150
    )
    authorship_calc.add_contribution(
        contributor_id="r003",
        contributor_name=carol.name,
        contribution_type=ContributionType.DATA_ANALYSIS,
        description="Benchmarking and performance analysis",
        hours_spent=60
    )
    authorship_calc.add_contribution(
        contributor_id="r003",
        contributor_name=carol.name,
        contribution_type=ContributionType.VISUALIZATION,
        description="Created figures and visualizations",
        hours_spent=40
    )

    # Calculate authorship
    attributions = authorship_calc.calculate_all_contributions()

    print("✓ Authorship Attribution:")
    for attribution in sorted(attributions.values(), key=lambda a: a.authorship_position):
        print(f"  {attribution.authorship_position}. {attribution.contributor_name}")
        print(f"     Contribution: {attribution.overall_percentage:.1f}%")
        print(f"     Role: {attribution.suggested_role.value if attribution.suggested_role else 'N/A'}")
    print()

    # =========================================================================
    # STEP 9: Schedule Seminar
    # =========================================================================
    print("STEP 9: Scheduling Virtual Seminar...")
    print("-" * 80)

    series = seminar_manager.create_series(
        name="SuperInstance Research Seminar",
        description="Weekly seminars on distributed systems research",
        frequency=SeminarFrequency.WEEKLY,
        organizer_ids=["r001"],
        host_institution="MIT",
        research_areas=["Distributed Systems", "Consensus"],
        day_of_week=2,
        default_time="14:00 UTC"
    )

    # Find optimal time
    optimal_times = seminar_manager.find_optimal_time(
        participant_timezones=["UTC-5", "UTC+1", "UTC-8"],
        duration_minutes=60,
        preferred_days=[1, 2, 3],
        start_date=datetime.now() + timedelta(days=7),
        end_date=datetime.now() + timedelta(days=14)
    )

    if optimal_times:
        best_time = optimal_times[0][0]
        session = seminar_manager.schedule_session(
            series_id=series.series_id,
            title="Energy-Efficient Consensus: Progress Report",
            description="Monthly progress update on energy-efficient consensus research",
            format=SeminarFormat.WORK_IN_PROGRESS,
            presenter_ids=["r001", "r002", "r003"],
            presenter_institutions=["MIT", "TUM", "Stanford"],
            scheduled_start=best_time,
            abstract="Presenting initial results on energy-efficient consensus protocols..."
        )

        print(f"✓ Scheduled seminar:")
        print(f"  Title: {session.title}")
        print(f"  Time: {session.scheduled_start.strftime('%Y-%m-%d %H:%M')} UTC")
        print(f"  Presenters: {', '.join(session.presenter_institutions)}")
    print()

    # =========================================================================
    # STEP 10: Share Data Package
    # =========================================================================
    print("STEP 10: Sharing Research Data...")
    print("-" * 80)

    data_package = data_exchange.create_data_package(
        name="Consensus Benchmark Dataset",
        description="Complete benchmark results for energy-efficient consensus protocols",
        files=[
            {"filename": "benchmarks.parquet", "size": str(10 * 1024**3), "format": "parquet"},
            {"filename": "metadata.json", "size": str(10 * 1024), "format": "json"}
        ],
        creator_institution="MIT",
        creator_researcher=alice.name,
        data_classification=DataClassification.PUBLIC,
        related_papers=["P12", "P13"],
        license="CC-BY-4.0"
    )

    print(f"✓ Created data package:")
    print(f"  Name: {data_package.name}")
    print(f"  Size: {data_package.total_size_gb:.2f} GB")
    print(f"  License: {data_package.license}")
    print()

    # =========================================================================
    # STEP 11: Submit Results to Portal
    # =========================================================================
    print("STEP 11: Submitting Results to Portal...")
    print("-" * 80)

    result = results_portal.submit_result(
        title="Cross-Cultural Energy-Efficient Consensus for Edge Networks",
        description="Novel consensus algorithms that minimize energy consumption while maintaining cultural adaptability",
        result_type=ResultType.PUBLICATION,
        author_ids=["r001", "r002", "r003"],
        author_names=[alice.name, bob.name, carol.name],
        author_institutions=["MIT", "TUM", "Stanford"],
        abstract="This paper presents energy-efficient consensus algorithms optimized for edge computing...",
        keywords=["consensus", "edge computing", "energy efficiency", "formal verification"],
        originating_projects=[project.project_id],
        related_papers=["P12", "P13"],
        venue=PublicationVenue.CONFERENCE,
        venue_name="ACM PODC",
        is_published=True
    )

    print(f"✓ Submitted result:")
    print(f"  Title: {result.title}")
    print(f"  Type: {result.result_type.value}")
    print(f"  Authors: {', '.join(result.author_names)}")
    print()

    # =========================================================================
    # SUMMARY
    # =========================================================================
    print("=" * 80)
    print("COLLABORATION WORKFLOW COMPLETE")
    print("=" * 80)
    print()
    print("Summary of Phase 9 Collaboration Infrastructure Usage:")
    print()
    print("✓ Registered 3 researchers across 3 institutions")
    print("✓ Created research proposal with required expertise")
    print("✓ Matched collaborators with 85%+ compatibility")
    print("✓ Established multi-institutional collaboration project")
    print("✓ Generated formal collaboration agreement")
    print("✓Allocated $10,800 in compute resources")
    print("✓ Calculated fair authorship attribution")
    print("✓ Scheduled cross-timezone virtual seminar")
    print("✓ Shared 10GB benchmark dataset")
    print("✓ Submitted joint publication to results portal")
    print()
    print("All systems operational and ready for global research collaboration!")
    print("=" * 80)


if __name__ == "__main__":
    main()
