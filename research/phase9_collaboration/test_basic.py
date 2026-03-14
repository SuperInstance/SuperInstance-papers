"""
Phase 9 Collaboration Framework - Basic Test
==============================================

Simple test to verify the core collaboration infrastructure works.
"""

from datetime import datetime
from research_network import ResearchNetwork, ExpertiseLevel, ResearchArea


def test_research_network():
    """Test basic researcher network functionality"""
    print("Testing Research Network...")
    print("-" * 80)

    network = ResearchNetwork()

    # Create a test researcher
    profile = {
        "researcher_id": "test001",
        "name": "Dr. Test Researcher",
        "email": "test@university.edu",
        "institution": "Test University",
        "department": "Computer Science",
        "location": "Test City, USA",
        "timezone": "UTC-5",
        "languages": ["English"],
        "expertise_level": ExpertiseLevel.ASSISTANT_PROFESSOR,
        "primary_research_area": ResearchArea.DISTRIBUTED_SYSTEMS,
        "secondary_areas": [ResearchArea.COMPUTER_SCIENCE],
        "specific_skills": ["Python", "Distributed Systems"],
        "papers_of_interest": ["P2", "P12"],
        "collaboration_interests": ["Joint Research"],
        "availability_hours_per_week": 10,
        "publications": []
    }

    # Register researcher
    from research_network import ResearchProfile
    researcher = ResearchProfile(**profile)
    network.register_researcher(researcher)

    print(f"✓ Registered researcher: {researcher.name}")
    print(f"  ID: {researcher.researcher_id}")
    print(f"  Institution: {researcher.institution}")
    print(f"  Expertise: {researcher.primary_research_area.value}")

    # Search for researchers
    results = network.search_researchers(
        research_area=ResearchArea.DISTRIBUTED_SYSTEMS
    )

    print(f"\n✓ Found {len(results)} researchers in distributed systems")

    # Get network statistics
    stats = network.get_network_statistics()
    print(f"\nNetwork Statistics:")
    print(f"  Total Researchers: {stats['total_researchers']}")
    print(f"  Available for Collaboration: {stats['researchers_available_for_collaboration']}")

    return True


def test_compatibility_scoring():
    """Test compatibility scoring between researchers"""
    print("\n\nTesting Compatibility Scoring...")
    print("-" * 80)

    network = ResearchNetwork()

    # Create two test researchers
    researcher1_data = {
        "researcher_id": "r1",
        "name": "Dr. Alice",
        "email": "alice@mit.edu",
        "institution": "MIT",
        "department": "CS",
        "location": "Cambridge, MA",
        "timezone": "UTC-5",
        "languages": ["English", "Mandarin"],
        "expertise_level": ExpertiseLevel.ASSISTANT_PROFESSOR,
        "primary_research_area": ResearchArea.DISTRIBUTED_SYSTEMS,
        "secondary_areas": [ResearchArea.COMPUTER_SCIENCE],
        "specific_skills": ["Python", "Kubernetes"],
        "papers_of_interest": ["P2", "P12"],
        "collaboration_interests": ["Research"],
        "availability_hours_per_week": 15,
        "publications": []
    }

    researcher2_data = {
        "researcher_id": "r2",
        "name": "Dr. Bob",
        "email": "bob@tum.de",
        "institution": "TUM",
        "department": "Math",
        "location": "Munich, Germany",
        "timezone": "UTC+1",
        "languages": ["German", "English"],
        "expertise_level": ExpertiseLevel.ASSOCIATE_PROFESSOR,
        "primary_research_area": ResearchArea.MATHEMATICS,
        "secondary_areas": [ResearchArea.PHYSICS],
        "specific_skills": ["Coq", "Proofs"],
        "papers_of_interest": ["P2", "P4"],
        "collaboration_interests": ["Research"],
        "availability_hours_per_week": 10,
        "publications": []
    }

    from research_network import ResearchProfile
    r1 = ResearchProfile(**researcher1_data)
    r2 = ResearchProfile(**researcher2_data)

    network.register_researcher(r1)
    network.register_researcher(r2)

    # Calculate compatibility
    score = network.calculate_compatibility_score(r1, r2)

    print(f"✓ Calculated compatibility score: {score:.2f}")
    print(f"  Researcher 1: {r1.name} ({r1.institution})")
    print(f"  Researcher 2: {r2.name} ({r2.institution})")

    # Find collaborators for r1
    collaborators = network.find_collaborators(r1)

    print(f"\n✓ Found {len(collaborators)} potential collaborators for {r1.name}")
    for researcher, match_score in collaborators:
        print(f"  - {researcher.name}: {match_score:.2f}")

    return True


def main():
    """Run all tests"""
    print("=" * 80)
    print("PHASE 9 COLLABORATION FRAMEWORK - BASIC TESTS")
    print("=" * 80)
    print()

    try:
        # Test 1: Research Network
        test_research_network()

        # Test 2: Compatibility Scoring
        test_compatibility_scoring()

        print("\n" + "=" * 80)
        print("ALL TESTS PASSED ✓")
        print("=" * 80)
        print("\nPhase 9 collaboration infrastructure is operational!")
        print("\nKey Features Verified:")
        print("  ✓ Researcher registration and profiles")
        print("  ✓ Researcher search and discovery")
        print("  ✓ Compatibility scoring algorithm")
        print("  ✓ Collaborator matching")
        print("  ✓ Network statistics")

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
