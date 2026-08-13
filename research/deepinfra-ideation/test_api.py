"""
Quick Test of DeepInfra API Integration

Tests the multi-agent system with a simple SuperInstance topic.
"""

import sys
from pathlib import Path

# Add to path for local imports
sys.path.insert(0, str(Path(__file__).parent))

from multi_agent_debate import DeepInfraAgent


def test_single_agent():
    """Test a single agent call to verify API works."""
    print("\n" + "="*80)
    print("TESTING: Single Agent API Call")
    print("="*80 + "\n")

    agent = DeepInfraAgent(
        agent_type="nemotron",
        api_key="MmyxnYgsBqxhJSKauEV6bOyvOPzOo38m"
    )

    prompt = """
Analyze this SuperInstance concept in 2-3 sentences:

"Self-play mechanisms (P24) can improve distributed system optimization by 30% or more."

Focus on:
1. Is this claim plausible?
2. What would need to be true?
    """

    print("Sending request to NVIDIA Nemotron-3-Super-120B-A12B...")
    print(f"Prompt: {prompt[:100]}...\n")

    try:
        response = agent.think(prompt)

        print("✅ API CALL SUCCESSFUL")
        print(f"\nAgent: {response.agent_name}")
        print(f"Model: {response.model_id}")
        print(f"Thinking Time: {response.thinking_time:.2f}s")
        print(f"Tokens: {response.token_count}")
        print(f"\nResponse:\n{response.content}\n")

        return True

    except Exception as e:
        print(f"❌ API CALL FAILED: {e}\n")
        return False


def test_multiple_agents():
    """Test multiple agents for comparison."""
    print("\n" + "="*80)
    print("TESTING: Multiple Agents Comparison")
    print("="*80 + "\n")

    prompt = """
What are the potential applications of emergence detection (P27) in real-world systems?
Provide 2-3 specific examples.
    """

    agents = {
        "Nemotron (Reasoner)": "nemotron",
        "MiniMax (Creative)": "minimax",
        "Qwen (Analyst)": "qwen"
    }

    responses = {}

    for display_name, agent_type in agents.items():
        print(f"Querying {display_name}...")

        try:
            agent = DeepInfraAgent(
                agent_type=agent_type,
                api_key="MmyxnYgsBqxhJSKauEV6bOyvOPzOo38m"
            )

            response = agent.think(prompt)
            responses[display_name] = response

            print(f"✓ {display_name}: {len(response.content)} chars, "
                  f"{response.thinking_time:.1f}s\n")

        except Exception as e:
            print(f"✗ {display_name}: {e}\n")

    # Display responses
    print("\n" + "="*80)
    print("RESPONSES COMPARISON")
    print("="*80 + "\n")

    for display_name, response in responses.items():
        print(f"\n{display_name}:")
        print("-" * 80)
        print(response.content[:300])
        if len(response.content) > 300:
            print("...")
        print()

    return len(responses) == len(agents)


def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("DEEPINFRA API INTEGRATION TEST")
    print("="*80)
    print("\nTesting connection to DeepInfra with SuperInstance topics.")
    print("This will make live API calls using cutting-edge 2026 models.\n")

    tests = [
        ("Single Agent Call", test_single_agent),
        ("Multiple Agents", test_multiple_agents)
    ]

    results = []
    for name, test_func in tests:
        print(f"\n{'='*80}")
        print(f"TEST: {name}")
        print(f"{'='*80}")

        try:
            success = test_func()
            results.append((name, success))
        except Exception as e:
            print(f"Test failed with exception: {e}")
            results.append((name, False))

    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)

    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {name}")

    all_passed = all(success for _, success in results)

    print("\n" + "="*80)
    if all_passed:
        print("ALL TESTS PASSED - API integration working!")
        print("You can now use the full ideation system.")
    else:
        print("SOME TESTS FAILED - Check API key and configuration")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
