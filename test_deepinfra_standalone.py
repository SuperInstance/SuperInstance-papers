"""
Standalone Test of DeepInfra API
No imports needed - pure requests test
"""

import os
import requests
import json


def test_deepinfra_api():
    """Test DeepInfra API directly."""
    print("\n" + "="*80)
    print("DEEPINFRA API CONNECTION TEST")
    print("="*80 + "\n")

    api_key = os.environ.get("DEEPINFRA_API_KEY", "")
    if not api_key:
        print("[ERROR] DEEPINFRA_API_KEY environment variable not set")
        return False

    model_ids = [
        "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        "mistralai/Mistral-7B-Instruct-v0.3"
    ]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    print(f"API Key: {api_key[:8]}...")
    print("Testing multiple model IDs...\n")

    for model_id in model_ids:
        print(f"Trying model: {model_id}")

        payload = {
            "model": model_id,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert in distributed systems."
                },
                {
                    "role": "user",
                    "content": "Analyze this claim in 2-3 sentences: 'Self-play mechanisms can improve distributed system optimization by 30% or more.' Is this plausible and why?"
                }
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }

        try:
            response = requests.post(
                "https://api.deepinfra.com/v1/openai/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )

            if response.status_code == 200:
                data = response.json()

                print("[OK] API CALL SUCCESSFUL!")
                print(f"\nResponse:")
                print("-" * 80)

                content = data["choices"][0]["message"]["content"]
                print(content)

                print("-" * 80)

                if "usage" in data:
                    usage = data["usage"]
                    print(f"\nTokens Used:")
                    print(f"  - Prompt: {usage.get('prompt_tokens', 'N/A')}")
                    print(f"  - Completion: {usage.get('completion_tokens', 'N/A')}")
                    print(f"  - Total: {usage.get('total_tokens', 'N/A')}")

                print("\n" + "="*80)
                print("API INTEGRATION VERIFIED SUCCESSFULLY!")
                print("="*80 + "\n")

                return True
            else:
                print(f"[FAIL] API CALL FAILED")
                print(f"Status Code: {response.status_code}")
                print(f"Response: {response.text}\n")

        except Exception as e:
            print(f"[ERROR] {e}\n")
            import traceback
            traceback.print_exc()

    return False


if __name__ == "__main__":
    success = test_deepinfra_api()
    exit(0 if success else 1)
