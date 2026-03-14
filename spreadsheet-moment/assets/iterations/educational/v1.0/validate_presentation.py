#!/usr/bin/env python3
"""
Multi-model validation for Phase 3 slide presentation for 5th graders
Uses multiple AI APIs to validate age-appropriateness, engagement, and clarity
"""

import sys
import os

# Change to the polln directory and add apikey to path
polln_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..'))
os.chdir(polln_dir)
sys.path.insert(0, os.path.join(polln_dir, 'apikey'))

from simulation_config import API_KEYS, MODEL_CONFIGS
import json
from datetime import datetime

def create_validation_prompt():
    """Create the validation prompt for AI models"""

    return """You are an expert elementary school educator and child psychologist specializing in educational content for 5th graders (ages 10-11).

Please review this slide presentation and provide detailed feedback on:

1. **Age-Appropriateness (1-10 scale):**
   - Is the vocabulary suitable for 5th graders?
   - Are the concepts too complex or too simple?
   - Is the reading level appropriate?
   - Specific suggestions for improvements

2. **Engagement Factor (1-10 scale):**
   - Will 5th graders find this interesting?
   - Are the interactive elements effective?
   - Is the tone too serious or too childish?
   - Specific suggestions for making it more engaging

3. **Clarity & Understanding (1-10 scale):**
   - Are the analogies clear and relatable?
   - Are the technical concepts explained simply?
   - Is there enough context without being overwhelming?
   - Specific areas that need clarification

4. **Cultural Sensitivity & Inclusivity:**
   - Do the examples work across different backgrounds?
   - Is there anything that might be confusing or exclusionary?
   - Suggestions for more inclusive examples

5. **Pacing & Flow:**
   - Do the slides progress logically?
   - Is there enough variety to maintain attention?
   - Are the transitions smooth?
   - Suggestions for better flow

6. **Activity Quality:**
   - Is the team activity age-appropriate?
   - Will it effectively demonstrate the concepts?
   - Suggestions for improvement

7. **Overall Assessment:**
   - Overall score (1-10)
   - Biggest strength
   - Biggest weakness
   - Top 3 specific improvements

Please provide:
- Specific slide-by-slide feedback where needed
- Concrete suggestions for improvement
- Examples of better language/phrasing where appropriate
- Any concerns or red flags

Format your response as a structured assessment with clear sections and specific, actionable feedback."""

def read_presentation():
    """Read the presentation file"""
    presentation_path = '../../../../docs/educational/INTRO_SLIDES.md'

    with open(presentation_path, 'r', encoding='utf-8') as f:
        content = f.read()

    return content

def validate_with_model(provider, model_name, model_info, presentation_content):
    """Validate presentation with a specific model"""

    import requests

    prompt = create_validation_prompt()
    full_prompt = f"{prompt}\n\n=== PRESENTATION TO REVIEW ===\n\n{presentation_content}\n\n=== END OF PRESENTATION ===\n\nPlease provide your detailed assessment:"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEYS[provider]}"
    }

    base_url = model_info['base_url']
    model_id = model_info['name']

    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": "You are an expert educational content reviewer for elementary school materials."},
            {"role": "user", "content": full_prompt}
        ],
        "max_tokens": 4000,
        "temperature": 0.7
    }

    try:
        print(f"  Calling {provider} - {model_name}...")
        response = requests.post(
            f"{base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=120
        )

        if response.status_code == 200:
            result = response.json()
            return {
                "provider": provider,
                "model": model_name,
                "status": "success",
                "feedback": result['choices'][0]['message']['content'],
                "tokens_used": result.get('usage', {}).get('total_tokens', 0)
            }
        else:
            return {
                "provider": provider,
                "model": model_name,
                "status": "error",
                "error": f"HTTP {response.status_code}: {response.text}"
            }

    except Exception as e:
        return {
            "provider": provider,
            "model": model_name,
            "status": "error",
            "error": str(e)
        }

def main():
    """Main validation function"""

    print("=" * 80)
    print("PHASE 3 MULTI-MODEL VALIDATION")
    print("Validating slide presentation for 5th graders")
    print("=" * 80)

    # Read presentation
    print("\n[1/3] Reading presentation...")
    presentation_content = read_presentation()
    print(f"  ✓ Read {len(presentation_content)} characters")

    # Define models to use
    models_to_validate = [
        ("groq", "llama3_70b_8192"),
        ("deepseek", "deepseek_chat"),
        ("deepinfra", "qwen2_72b"),
        ("moonshot", "moonshot_v1_32k"),
    ]

    print("\n[2/3] Validating with multiple models...")
    print(f"  Target: {len(models_to_validate)} models")
    print()

    results = []

    for provider, model_name in models_to_validate:
        if provider not in API_KEYS or not API_KEYS[provider]:
            print(f"  ⚠ Skipping {provider} - no API key")
            continue

        if provider not in MODEL_CONFIGS:
            print(f"  ⚠ Skipping {provider} - no config")
            continue

        if model_name not in MODEL_CONFIGS[provider]['models']:
            print(f"  ⚠ Skipping {provider}/{model_name} - model not found")
            continue

        model_info = MODEL_CONFIGS[provider]['models'][model_name]

        result = validate_with_model(provider, model_name, model_info, presentation_content)
        results.append(result)

        if result['status'] == 'success':
            print(f"  ✓ {provider} - {model_name}: SUCCESS ({result['tokens_used']} tokens)")
        else:
            print(f"  ✗ {provider} - {model_name}: FAILED - {result.get('error', 'Unknown error')}")

    # Save results
    print("\n[3/3] Saving results...")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_dir = '../../../../assets/iterations/educational/v1.0'

    # Save individual results
    for i, result in enumerate(results, 1):
        if result['status'] == 'success':
            filename = f"validation_{result['provider']}_{result['model']}_{timestamp}.md"
            filepath = os.path.join(results_dir, filename)

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(f"# Validation Report: {result['provider'].upper()} - {result['model']}\n\n")
                f.write(f"**Provider:** {result['provider']}\n")
                f.write(f"**Model:** {result['model']}\n")
                f.write(f"**Timestamp:** {timestamp}\n")
                f.write(f"**Tokens Used:** {result['tokens_used']}\n\n")
                f.write("---\n\n")
                f.write(result['feedback'])

            print(f"  ✓ Saved {filename}")

    # Create summary
    summary_path = os.path.join(results_dir, f"VALIDATION_SUMMARY_{timestamp}.md")

    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write("# Phase 3 Validation Summary\n\n")
        f.write(f"**Presentation:** INTRO_SLIDES.md\n")
        f.write(f"**Target Audience:** 5th Graders (ages 10-11)\n")
        f.write(f"**Validation Date:** {timestamp}\n\n")
        f.write("---\n\n")

        f.write("## Validation Results\n\n")

        successful = [r for r in results if r['status'] == 'success']
        failed = [r for r in results if r['status'] != 'success']

        f.write(f"**Total Validations:** {len(results)}\n")
        f.write(f"**Successful:** {len(successful)}\n")
        f.write(f"**Failed:** {len(failed)}\n\n")

        if successful:
            f.write("## Successful Validations\n\n")
            for result in successful:
                f.write(f"### {result['provider'].upper()} - {result['model']}\n\n")
                f.write(f"- **Status:** Success\n")
                f.write(f"- **Tokens:** {result['tokens_used']}\n")
                f.write(f"- **File:** `validation_{result['provider']}_{result['model']}_{timestamp}.md`\n\n")

        if failed:
            f.write("## Failed Validations\n\n")
            for result in failed:
                f.write(f"### {result['provider'].upper()} - {result['model']}\n\n")
                f.write(f"- **Status:** Failed\n")
                f.write(f"- **Error:** {result.get('error', 'Unknown')}\n\n")

        f.write("---\n\n")
        f.write("## Next Steps\n\n")
        f.write("1. Review all validation reports\n")
        f.write("2. Identify common themes and recommendations\n")
        f.write("3. Create v1.1 incorporating feedback\n")
        f.write("4. Consider testing with real 5th graders\n")

    print(f"  ✓ Saved VALIDATION_SUMMARY_{timestamp}.md")

    print("\n" + "=" * 80)
    print("VALIDATION COMPLETE!")
    print(f"Successful: {len(successful)}/{len(results)}")
    print("=" * 80)

if __name__ == "__main__":
    main()
