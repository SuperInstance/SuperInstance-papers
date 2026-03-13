"""
Multi-Agent Debate System for SuperInstance Ideation

Uses DeepInfra models for adversarial debate and iterative refinement
"""

import requests
import json
import time
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import asyncio

from deepinfra_config import (
    DEEPINFRA_API_KEY, API_BASE_URL, MODEL_CONFIGS, SYSTEM_PROMPTS
)


@dataclass
class Message:
    """Message in debate."""
    role: str  # system, user, assistant
    content: str
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


@dataclass
class AgentResponse:
    """Response from an agent."""
    agent_name: str
    model_id: str
    content: str
    thinking_time: float
    token_count: int
    timestamp: datetime


class DeepInfraAgent:
    """Agent that uses DeepInfra API."""

    def __init__(self, agent_type: str, api_key: str):
        if agent_type not in MODEL_CONFIGS:
            raise ValueError(f"Unknown agent type: {agent_type}")

        self.config = MODEL_CONFIGS[agent_type]
        self.agent_type = agent_type
        self.api_key = api_key
        self.system_prompt = SYSTEM_PROMPTS.get(agent_type, "")
        self.conversation_history: List[Message] = []

    def call_api(self, messages: List[Dict]) -> Dict:
        """Call DeepInfra API."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.config["model_id"],
            "messages": messages,
            "temperature": self.config["temperature"],
            "max_tokens": self.config["max_tokens"]
        }

        start_time = time.time()

        response = requests.post(
            f"{API_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=120
        )

        elapsed = time.time() - start_time

        if response.status_code != 200:
            raise Exception(f"API call failed: {response.status_code} - {response.text}")

        return response.json()

    def think(self, prompt: str, context: str = "") -> AgentResponse:
        """Generate response using the model."""
        # Construct messages
        messages = []

        if self.system_prompt:
            messages.append({
                "role": "system",
                "content": self.system_prompt
            })

        if context:
            messages.append({
                "role": "user",
                "content": f"Context:\n{context}\n\nTask:\n{prompt}"
            })
        else:
            messages.append({
                "role": "user",
                "content": prompt
            })

        # Add conversation history
        for msg in self.conversation_history[-5:]:  # Last 5 messages
            messages.append({
                "role": msg.role,
                "content": msg.content
            })

        start_time = time.time()
        response_data = self.call_api(messages)
        thinking_time = time.time() - start_time

        # Extract response
        content = response_data["choices"][0]["message"]["content"]
        token_count = response_data.get("usage", {}).get("total_tokens", 0)

        # Store in history
        self.conversation_history.append(Message(
            role="user",
            content=prompt
        ))
        self.conversation_history.append(Message(
            role="assistant",
            content=content
        ))

        return AgentResponse(
            agent_name=self.agent_type,
            model_id=self.config["model_id"],
            content=content,
            thinking_time=thinking_time,
            token_count=token_count,
            timestamp=datetime.now()
        )

    def reset_conversation(self):
        """Clear conversation history."""
        self.conversation_history = []


class DebateOrchestrator:
    """Orchestrates multi-agent debates on SuperInstance topics."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.agents = {
            "nemotron": DeepInfraAgent("nemotron", api_key),
            "minimax": DeepInfraAgent("minimax", api_key),
            "qwen": DeepInfraAgent("qwen", api_key)
        }
        self.debate_history: List[Dict] = []

    def run_debate_round(
        self,
        topic: str,
        context: str,
        round_num: int,
        previous_responses: List[AgentResponse] = None
    ) -> List[AgentResponse]:
        """Run one round of debate."""
        print(f"\n{'='*80}")
        print(f"ROUND {round_num}: {topic}")
        print(f"{'='*80}\n")

        responses = []

        # Build context from previous responses
        if previous_responses:
            context += "\n\nPrevious Round Responses:\n"
            for resp in previous_responses:
                context += f"\n[{resp.agent_name}]\n{resp.content}\n"

        # Get responses from each agent
        for agent_name, agent in self.agents.items():
            print(f"Querying {agent_name}...")
            try:
                response = agent.think(topic, context)
                responses.append(response)

                print(f"✓ {agent_name}: {len(response.content)} chars, "
                      f"{response.thinking_time:.1f}s, {response.token_count} tokens\n")

            except Exception as e:
                print(f"✗ {agent_name} failed: {e}\n")

        # Store in debate history
        self.debate_history.append({
            "round": round_num,
            "topic": topic,
            "responses": responses,
            "timestamp": datetime.now()
        })

        return responses

    def run_full_debate(
        self,
        topic: str,
        context: str,
        n_rounds: int = 3
    ) -> Dict:
        """Run complete multi-round debate."""
        print(f"\n{'='*80}")
        print(f"MULTI-AGENT DEBATE: {topic}")
        print(f"{'='*80}")
        print(f"Context: {context[:200]}...")
        print(f"Rounds: {n_rounds}")

        all_responses = []
        cumulative_insights = []

        for round_num in range(1, n_rounds + 1):
            # Evolve context with insights from previous rounds
            evolving_context = context

            if cumulative_insights:
                evolving_context += "\n\nKey Insights from Previous Rounds:\n"
                for i, insight in enumerate(cumulative_insights[-3:], 1):
                    evolving_context += f"{i}. {insight}\n"

            responses = self.run_debate_round(
                topic,
                evolving_context,
                round_num,
                all_responses[-3:] if all_responses else None
            )

            all_responses.extend(responses)

            # Extract key insights
            for response in responses:
                if response.agent_name == "qwen":  # Qwen does synthesis
                    # Simple insight extraction (first sentence of each paragraph)
                    insights = [s.strip() + "."
                              for s in response.content.split('. ')
                              if len(s) > 20][:3]
                    cumulative_insights.extend(insights)

        # Generate final synthesis
        print(f"\n{'='*80}")
        print("GENERATING FINAL SYNTHESIS")
        print(f"{'='*80}\n")

        synthesis_prompt = f"""
Based on the {n_rounds}-round debate on: {topic}

Synthesize the following into actionable recommendations:

1. Key agreements reached
2. Remaining disagreements or concerns
3. Actionable next steps for SuperInstance development
4. Priority validation experiments
5. Real-world application roadmap

Provide structured output with specific, concrete recommendations.
"""

        synthesis_context = "\n".join([
            f"\n=== Round {r['round']} ==="
            + "\n".join([f"[{resp.agent_name}]\n{resp.content[:500]}..."
                        for resp in r['responses']])
            for r in self.debate_history
        ])

        synthesis = self.agents["qwen"].think(synthesis_prompt, synthesis_context)

        return {
            "topic": topic,
            "n_rounds": n_rounds,
            "all_responses": all_responses,
            "final_synthesis": synthesis,
            "debate_history": self.debate_history
        }

    def save_debate(self, debate_result: Dict, filename: str):
        """Save debate results to file."""
        # Convert to serializable format
        serializable = {
            "topic": debate_result["topic"],
            "n_rounds": debate_result["n_rounds"],
            "final_synthesis": {
                "agent_name": debate_result["final_synthesis"].agent_name,
                "content": debate_result["final_synthesis"].content,
                "thinking_time": debate_result["final_synthesis"].thinking_time,
                "token_count": debate_result["final_synthesis"].token_count
            },
            "responses": [
                {
                    "agent_name": r.agent_name,
                    "content": r.content,
                    "thinking_time": r.thinking_time,
                    "token_count": r.token_count
                }
                for r in debate_result["all_responses"]
            ],
            "timestamp": datetime.now().isoformat()
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(serializable, f, indent=2, ensure_ascii=False)

        print(f"\nDebate saved to: {filename}")


class DevilsAdvocateSession:
    """Devil's advocate style rigorous examination."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.nemotron = DeepInfraAgent("nemotron", api_key)
        self.minimax = DeepInfraAgent("minimax", api_key)

    def examine_claim(self, claim: str, paper_context: str) -> Dict:
        """Rigorously examine a claim through devil's advocate process."""

        examination = {
            "claim": claim,
            "stages": []
        }

        # Stage 1: Initial Analysis
        print(f"\n{'='*80}")
        print("STAGE 1: Initial Claim Analysis")
        print(f"{'='*80}\n")

        initial_prompt = f"""
Analyze this claim from the SuperInstance framework:

CLAIM: {claim}

CONTEXT: {paper_context}

Provide:
1. Claim decomposition (what is actually being claimed?)
2. Assumptions identification (explicit and implicit)
3. Potential falsification conditions
4. Preliminary assessment (plausible/implausible/uncertain)
"""

        analysis = self.nemotron.think(initial_prompt, paper_context)
        examination["stages"].append({
            "stage": "initial_analysis",
            "response": {
                "agent_name": analysis.agent_name,
                "content": analysis.content
            }
        })

        print(f"✓ Analysis complete\n")

        # Stage 2: Stress Testing
        print(f"\n{'='*80}")
        print("STAGE 2: Stress Testing (Devil's Advocate)")
        print(f"{'='*80}\n")

        stress_prompt = f"""
You are a relentless devil's advocate. Challenge this claim:

CLAIM: {claim}

Previous analysis identified these assumptions:
{analysis.content[:500]}

Now:
1. Attack each assumption with counterexamples
2. Propose scenarios where the claim fails
3. Demand evidence for each component
4. Identify the weakest links
5. Push to breaking point - what would falsify this?

Be merciless in your critique. If the claim survives, it's robust.
"""

        stress_test = self.nemotron.think(stress_prompt, analysis.content)
        examination["stages"].append({
            "stage": "stress_test",
            "response": {
                "agent_name": stress_test.agent_name,
                "content": stress_test.content
            }
        })

        print(f"✓ Stress test complete\n")

        # Stage 3: Creative Defense
        print(f"\n{'='*80}")
        print("STAGE 3: Creative Defense & Refinement")
        print(f"{'='*80}\n")

        defense_prompt = f"""
The claim has been challenged:

CLAIM: {claim}

CHALLENGES: {stress_test.content[:500]}

Now provide a creative defense:
1. Novel interpretations that address challenges
2. Unexpected applications that validate the approach
3. Boundary conditions that make the claim robust
4. Modified/clarified claim if needed
5. "Yes, and..." extensions that strengthen

Be creative and find ways to make this work even better.
"""

        defense = self.minimax.think(defense_prompt, stress_test.content)
        examination["stages"].append({
            "stage": "creative_defense",
            "response": {
                "agent_name": defense.agent_name,
                "content": defense.content
            }
        })

        print(f"✓ Defense complete\n")

        # Stage 4: Synthesis & Verdict
        print(f"\n{'='*80}")
        print("STAGE 4: Final Synthesis & Verdict")
        print(f"{'='*80}\n")

        synthesis_prompt = f"""
Synthesize the examination of this claim:

ORIGINAL CLAIM: {claim}

EXAMINATION SUMMARY:
- Analysis: {analysis.content[:300]}...
- Challenges: {stress_test.content[:300]}...
- Defense: {defense.content[:300]}...

Provide:
1. FINAL VERDICT: PASS/FAIL/MODIFIED
2. Modified claim (if needed)
3. Confidence level (0-100%)
4. Key validation experiments
5. Real-world applicability assessment
6. Concrete next steps

Be decisive and specific.
"""

        synthesis = self.nemotron.think(synthesis_prompt,
                                         f"{analysis.content}\n\n{stress_test.content}\n\n{defense.content}")

        examination["stages"].append({
            "stage": "final_synthesis",
            "response": {
                "agent_name": synthesis.agent_name,
                "content": synthesis.content
            }
        })

        examination["final_synthesis"] = {
            "agent_name": synthesis.agent_name,
            "content": synthesis.content
        }

        print(f"✓ Synthesis complete\n")

        return examination

    def save_examination(self, examination: Dict, filename: str):
        """Save examination results."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(examination, f, indent=2, ensure_ascii=False)
        print(f"\nExamination saved to: {filename}")
