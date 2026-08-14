"""
Simple Test of DeepInfra API - Direct import
"""

import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path.cwd()))

# Now import by adding module path
import importlib.util

# Load the multi_agent_debate module directly
_module_path = Path(__file__).resolve().parent / "research" / "deepinfra-ideation" / "multi_agent_debate.py"
if not _module_path.exists():
    # Fallback: try relative to cwd
    _module_path = Path.cwd() / "research" / "deepinfra-ideation" / "multi_agent_debate.py"

spec = importlib.util.spec_from_file_location(
    "multi_agent_debate",
    str(_module_path),
)
multi_agent_debate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(multi_agent_debate)

DeepInfraAgent = multi_agent_debate.DeepInfraAgent


def test_api():
    """Test DeepInfra API connection."""
    print("\n" + "="*80)
    print("DEEPINFRA API TEST")
    print("="*80 + "\n")

    print("Testing NVIDIA Nemotron-3-Super-120B-A12B...")
    print("API Key: MmyxnYgsBqxhJSKauEV6bOyvOPzOo38m\n")

    agent = DeepInfraAgent(
        agent_type="nemotron",
        api_key="MmyxnYgsBqxhJSKauEV6bOyvOPzOo38m"
    )

    prompt = "Analyze this claim in 2 sentences: 'Self-play mechanisms can improve distributed systems by 30%'."

    try:
        print("Sending API request...\n")
        response = agent.think(prompt)

        print("✅ API SUCCESS!")
        print(f"\nAgent: {response.agent_name}")
        print(f"Model: {response.model_id}")
        print(f"Time: {response.thinking_time:.2f}s")
        print(f"Tokens: {response.token_count}")
        print(f"\nResponse:\n{response.content}\n")

        print("="*80)
        print("API integration verified successfully!")
        print("="*80 + "\n")

        return True

    except Exception as e:
        print(f"❌ API FAILED: {e}\n")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    test_api()
