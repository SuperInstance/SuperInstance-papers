"""
Simple Test of DeepInfra API
"""

import requests
import json


def test_deepinfra_api():
    """Test DeepInfra API directly."""
    print("\n" + "="*80)
    print("DEEPINFRA API CONNECTION TEST")
    print("="*80 + "\n")

    api_key = "MmyxnYgsBqxhJSKauEV6bOyvOPzOo38m"

    # Try models that should be available on DeepInfra
    model_ids = [
        "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        "mistralai/Mistral-7B-Instruct-v0.3",
        "Qwen/Qwen2.5-72B-Instruct"
    ]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    print(f"API Key: {api_key[:20]}...")
    print("Testing available models on DeepInfra...\n")

    for model_id in model_ids:
        print(f"Trying: {model_id}")

        payload = {
            "model": model_id,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert in distributed systems."
                },
                {
                    "role": "user",
                    "content": "In one sentence, explain how self-play can improve optimization."
                }
            ],
            "temperature": 0.7,
            "max_tokens": 200
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
                content = data["choices"][0]["message"]["content"]

                print(f"\n[OK] SUCCESS with {model_id}!")
                print(f"\nResponse:")
                print("-" * 80)
                print(content)
                print("-" * 80)

                if "usage" in data:
                    usage = data["usage"]
                    print(f"\nTokens: {usage.get('total_tokens', 'N/A')}")

                print("\n" + "="*80)
                print("API INTEGRATION VERIFIED!")
                print("="*80)
                print("\nYou can now use the multi-agent ideation system.")
                print("Available models on DeepInfra:")
                print("  https://deepinfra.com/models\n")

                return True

            else:
                print(f"  [FAIL] Status {response.status_code}: {response.text[:100]}")

        except Exception as e:
            print(f"  [ERROR] {str(e)[:100]}")

        print()

    print("\n[FAIL] Could not connect to any model.")
    print("Please check:")
    print("  1. API key is valid")
    print("  2. DeepInfra account is active")
    print("  3. Available models at: https://deepinfra.com/models\n")

    return False


if __name__ == "__main__":
    test_deepinfra_api()
