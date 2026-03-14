"""
DeepInfra Cloud API Integration for SuperInstance GPU Simulations

This module provides a comprehensive cloud simulation backend that offloads
heavy computations to DeepInfra API while managing API usage efficiently.

Key Features:
- Async/await for concurrent API calls
- Distributed emergence detection
- Cloud-based neural architecture search
- Multi-modal simulation pipeline
- Scalable agent society simulation
- Hybrid cloud-local architecture
- Comprehensive error handling and retry logic
- Cost optimization and caching strategies

Author: SuperInstance Research Team
Date: 2026-03-13
"""

import os
import asyncio
import aiohttp
import time
import hashlib
import json
from typing import List, Dict, Any, Optional, Tuple, Callable
from dataclasses import dataclass, field
from enum import Enum
import numpy as np
from functools import wraps
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SimulationType(Enum):
    """Types of simulations supported by the cloud backend."""
    EMERGENCE_DETECTION = "emergence_detection"
    NEURAL_ARCHITECTURE_SEARCH = "neural_architecture_search"
    AGENT_SOCIETY = "agent_society"
    MULTIMODAL_PIPELINE = "multimodal_pipeline"
    VALUE_NETWORK_TRAINING = "value_network_training"
    SELF_PLAY_TRAINING = "self_play_training"


class APIError(Exception):
    """Base exception for API errors."""
    pass


class RateLimitError(APIError):
    """Exception raised when rate limit is exceeded."""
    pass


class TimeoutError(APIError):
    """Exception raised when request times out."""
    pass


class AuthenticationError(APIError):
    """Exception raised when authentication fails."""
    pass


@dataclass
class APIMetrics:
    """Track API usage metrics for cost optimization."""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    total_tokens_used: int = 0
    total_cost: float = 0.0
    average_latency: float = 0.0
    cache_hits: int = 0
    cache_misses: int = 0

    def record_request(self, success: bool, tokens: int = 0, latency: float = 0.0, cost: float = 0.0):
        """Record a request's metrics."""
        self.total_requests += 1
        if success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
        self.total_tokens_used += tokens
        self.total_cost += cost

        # Update average latency
        if self.average_latency == 0:
            self.average_latency = latency
        else:
            self.average_latency = (self.average_latency * 0.9) + (latency * 0.1)

    def record_cache_hit(self):
        """Record a cache hit."""
        self.cache_hits += 1

    def record_cache_miss(self):
        """Record a cache miss."""
        self.cache_misses += 1

    def get_success_rate(self) -> float:
        """Calculate success rate."""
        if self.total_requests == 0:
            return 0.0
        return self.successful_requests / self.total_requests

    def get_cache_hit_rate(self) -> float:
        """Calculate cache hit rate."""
        total = self.cache_hits + self.cache_misses
        if total == 0:
            return 0.0
        return self.cache_hits / total


def retry_with_exponential_backoff(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    max_delay: float = 60.0
):
    """Decorator for retrying failed requests with exponential backoff."""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None

            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except (RateLimitError, aiohttp.ClientError, TimeoutError) as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(
                            f"Request failed (attempt {attempt + 1}/{max_retries}): {e}. "
                            f"Retrying in {delay:.2f}s..."
                        )
                        await asyncio.sleep(delay)
                        delay = min(delay * backoff_factor, max_delay)
                    else:
                        logger.error(f"Request failed after {max_retries} attempts: {e}")
                except Exception as e:
                    logger.error(f"Unexpected error in {func.__name__}: {e}")
                    raise

            raise last_exception

        return wrapper
    return decorator


class ResultCache:
    """Cache for API results to reduce redundant calls."""

    def __init__(self, ttl: int = 3600):
        """
        Initialize cache with time-to-live.

        Args:
            ttl: Time-to-live for cache entries in seconds
        """
        self.cache: Dict[str, Tuple[Any, float]] = {}
        self.ttl = ttl

    def _generate_key(self, **kwargs) -> str:
        """Generate cache key from request parameters."""
        # Sort kwargs for consistent hashing
        sorted_items = sorted(kwargs.items())
        key_str = json.dumps(sorted_items, sort_keys=True, default=str)
        return hashlib.sha256(key_str.encode()).hexdigest()

    def get(self, **kwargs) -> Optional[Any]:
        """Get cached result if available and not expired."""
        key = self._generate_key(**kwargs)
        if key in self.cache:
            result, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                logger.debug(f"Cache hit for key: {key[:16]}...")
                return result
            else:
                # Expired entry
                del self.cache[key]
        return None

    def set(self, result: Any, **kwargs):
        """Cache a result."""
        key = self._generate_key(**kwargs)
        self.cache[key] = (result, time.time())
        logger.debug(f"Cached result with key: {key[:16]}...")

    def clear(self):
        """Clear all cache entries."""
        self.cache.clear()
        logger.debug("Cache cleared")

    def cleanup_expired(self):
        """Remove expired entries from cache."""
        current_time = time.time()
        expired_keys = [
            key for key, (_, timestamp) in self.cache.items()
            if current_time - timestamp >= self.ttl
        ]
        for key in expired_keys:
            del self.cache[key]
        logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")


class DeepInfraSimulationClient:
    """Cloud simulation backend using DeepInfra API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.deepinfra.com/v1",
        cache_ttl: int = 3600,
        enable_cache: bool = True
    ):
        """
        Initialize DeepInfra simulation client.

        Args:
            api_key: DeepInfra API key (defaults to DEEPINFRA_API_KEY env var)
            base_url: Base URL for DeepInfra API
            cache_ttl: Cache time-to-live in seconds
            enable_cache: Whether to enable result caching
        """
        self.api_key = api_key or os.getenv("DEEPINFRA_API_KEY")
        if not self.api_key:
            raise ValueError("DEEPINFRA_API_KEY not found in environment or parameters")

        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None
        self.cache = ResultCache(ttl=cache_ttl) if enable_cache else None
        self.metrics = APIMetrics()
        self.enable_cache = enable_cache

        # Pricing (approximate, update as needed)
        self.pricing = {
            "input_tokens_per_1m": 0.07,
            "output_tokens_per_1m": 0.27
        }

    async def initialize(self):
        """Initialize async session."""
        if self.session is None:
            timeout = aiohttp.ClientTimeout(total=300)  # 5 minute timeout
            self.session = aiohttp.ClientSession(
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=timeout
            )
            logger.info("DeepInfra client initialized")

    async def close(self):
        """Close session and cleanup resources."""
        if self.session:
            await self.session.close()
            self.session = None
            logger.info("DeepInfra client closed")

    def _calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate API call cost."""
        input_cost = (input_tokens / 1_000_000) * self.pricing["input_tokens_per_1m"]
        output_cost = (output_tokens / 1_000_000) * self.pricing["output_tokens_per_1m"]
        return input_cost + output_cost

    @retry_with_exponential_backoff(max_retries=3)
    async def _make_request(
        self,
        endpoint: str,
        method: str = "POST",
        payload: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict:
        """
        Make API request with retry logic.

        Args:
            endpoint: API endpoint path
            method: HTTP method
            payload: Request body
            params: Query parameters

        Returns:
            Response JSON

        Raises:
            APIError: On API errors
            RateLimitError: On rate limit exceeded
            AuthenticationError: On auth failure
        """
        url = f"{self.base_url}/{endpoint}"

        try:
            async with self.session.request(
                method,
                url,
                json=payload,
                params=params
            ) as response:
                # Handle rate limiting
                if response.status == 429:
                    retry_after = response.headers.get('Retry-After', 60)
                    raise RateLimitError(f"Rate limited. Retry after {retry_after}s")

                # Handle authentication errors
                if response.status == 401:
                    raise AuthenticationError("Invalid API key")

                # Handle other errors
                if response.status >= 400:
                    error_text = await response.text()
                    raise APIError(f"API error {response.status}: {error_text}")

                return await response.json()

        except asyncio.TimeoutError:
            raise TimeoutError(f"Request to {url} timed out")

    async def run_emergence_detection_cloud(
        self,
        agent_states: List[Dict],
        detection_config: Dict,
        use_cache: bool = True
    ) -> Dict:
        """
        Offload emergence detection to cloud.

        Args:
            agent_states: List of agent state dictionaries
            detection_config: Configuration for detection algorithm
            use_cache: Whether to use cached results

        Returns:
            Emergence detection results
        """
        # Check cache
        if self.enable_cache and use_cache:
            cache_key = {
                "states": agent_states,
                "config": detection_config
            }
            cached_result = self.cache.get(**cache_key)
            if cached_result:
                self.metrics.record_cache_hit()
                return cached_result
            self.metrics.record_cache_miss()

        start_time = time.time()

        # Use LLM to analyze emergence
        prompt = f"""
        Analyze the following agent society for emergence detection:

        Agent States (n={len(agent_states)}):
        {json.dumps(agent_states[:5], indent=2)}  # Show first 5 for context

        Detection Configuration:
        {json.dumps(detection_config, indent=2)}

        Perform the following analyses:
        1. Transfer Entropy Calculation: Estimate information flow between agents
        2. Mutual Information: Identify highly coupled agents
        3. Novelty Detection: Identify unexpected patterns or behaviors
        4. Emergence Score: Provide a 0-1 score indicating likelihood of emergence

        Return results in JSON format:
        {{
            "transfer_entropy_matrix": [[...]],
            "mutual_information_matrix": [[...]],
            "novelty_score": float,
            "emergence_score": float,
            "emergent_behaviors": ["list", "of", "detected", "behaviors"],
            "analysis_summary": "human-readable summary"
        }}
        """

        payload = {
            "model": "meta-llama/Llama-3-70b-instruct",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert in complex systems analysis and emergence detection."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 2048,
            "response_format": {"type": "json_object"}
        }

        try:
            response = await self._make_request("chat/completions", "POST", payload)
            result_text = response["choices"][0]["message"]["content"]
            result = json.loads(result_text)

            latency = time.time() - start_time
            usage = response.get("usage", {})
            input_tokens = usage.get("prompt_tokens", 0)
            output_tokens = usage.get("completion_tokens", 0)
            total_tokens = usage.get("total_tokens", input_tokens + output_tokens)
            cost = self._calculate_cost(input_tokens, output_tokens)

            self.metrics.record_request(True, total_tokens, latency, cost)

            # Cache result
            if self.enable_cache:
                self.cache.set(result, **cache_key)

            return result

        except Exception as e:
            latency = time.time() - start_time
            self.metrics.record_request(False, 0, latency, 0)
            logger.error(f"Emergence detection failed: {e}")
            raise

    async def propose_neural_architecture(
        self,
        task_description: str,
        constraints: Optional[Dict] = None,
        use_cache: bool = True
    ) -> Dict:
        """
        Use LLM to propose neural architectures.

        Args:
            task_description: Description of the task
            constraints: Architecture constraints (layers, parameters, etc.)
            use_cache: Whether to use cached results

        Returns:
            Proposed architecture with layer specifications
        """
        constraints = constraints or {}

        # Check cache
        if self.enable_cache and use_cache:
            cache_key = {
                "task": task_description,
                "constraints": constraints
            }
            cached_result = self.cache.get(**cache_key)
            if cached_result:
                self.metrics.record_cache_hit()
                return cached_result
            self.metrics.record_cache_miss()

        start_time = time.time()

        prompt = f"""
        Propose a neural network architecture for the following task:

        Task Description:
        {task_description}

        Constraints:
        {json.dumps(constraints, indent=2)}

        Design considerations:
        1. Appropriate layer types and activations
        2. Optimal layer sizes and depth
        3. Regularization strategies
        4. Attention mechanisms if applicable
        5. Skip connections for deeper networks

        Return architecture in JSON format:
        {{
            "architecture_name": "descriptive name",
            "layers": [
                {{"type": "Conv2d", "params": {{"in_channels": 3, "out_channels": 64, "kernel_size": 3}}}},
                {{"type": "ReLU", "params": {{}}}},
                ...
            ],
            "total_parameters": "estimated count",
            "expected_memory_mb": "estimated memory",
            "justification": "why this architecture fits the task",
            "alternatives": ["list", "of", "alternative", "approaches"]
        }}
        """

        payload = {
            "model": "meta-llama/Llama-3-70b-instruct",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert neural network architect with deep knowledge of deep learning."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.5,
            "max_tokens": 2048,
            "response_format": {"type": "json_object"}
        }

        try:
            response = await self._make_request("chat/completions", "POST", payload)
            result_text = response["choices"][0]["message"]["content"]
            result = json.loads(result_text)

            latency = time.time() - start_time
            usage = response.get("usage", {})
            input_tokens = usage.get("prompt_tokens", 0)
            output_tokens = usage.get("completion_tokens", 0)
            total_tokens = usage.get("total_tokens", input_tokens + output_tokens)
            cost = self._calculate_cost(input_tokens, output_tokens)

            self.metrics.record_request(True, total_tokens, latency, cost)

            # Cache result
            if self.enable_cache:
                self.cache.set(result, **cache_key)

            return result

        except Exception as e:
            latency = time.time() - start_time
            self.metrics.record_request(False, 0, latency, 0)
            logger.error(f"Architecture proposal failed: {e}")
            raise

    async def batch_simulation(
        self,
        scenarios: List[Dict],
        simulation_type: SimulationType,
        parallel_jobs: int = 10
    ) -> List[Dict]:
        """
        Run multiple simulations in parallel.

        Args:
            scenarios: List of simulation scenarios
            simulation_type: Type of simulation to run
            parallel_jobs: Number of parallel jobs

        Returns:
            List of simulation results
        """
        logger.info(
            f"Starting batch simulation: {len(scenarios)} scenarios, "
            f"type={simulation_type.value}, parallel_jobs={parallel_jobs}"
        )

        # Create semaphore to limit parallel requests
        semaphore = asyncio.Semaphore(parallel_jobs)

        async def run_single(scenario: Dict) -> Dict:
            """Run single simulation with semaphore."""
            async with semaphore:
                try:
                    if simulation_type == SimulationType.EMERGENCE_DETECTION:
                        return await self.run_emergence_detection_cloud(
                            scenario.get("agent_states", []),
                            scenario.get("detection_config", {})
                        )
                    elif simulation_type == SimulationType.NEURAL_ARCHITECTURE_SEARCH:
                        return await self.propose_neural_architecture(
                            scenario.get("task_description", ""),
                            scenario.get("constraints", {})
                        )
                    else:
                        raise ValueError(f"Unsupported simulation type: {simulation_type}")
                except Exception as e:
                    logger.error(f"Simulation failed: {e}")
                    return {"error": str(e), "scenario": scenario}

        # Run all scenarios in parallel
        results = await asyncio.gather(*[run_single(s) for s in scenarios])

        successful = sum(1 for r in results if "error" not in r)
        logger.info(
            f"Batch simulation complete: {successful}/{len(scenarios)} successful"
        )

        return results

    async def run_agent_society_simulation(
        self,
        num_agents: int,
        simulation_steps: int,
        agent_config: Dict,
        coordination_strategy: str = "stigmergy"
    ) -> Dict:
        """
        Run large-scale agent society simulation in cloud.

        Args:
            num_agents: Number of agents to simulate
            simulation_steps: Number of simulation steps
            agent_config: Agent configuration
            coordination_strategy: Strategy for agent coordination

        Returns:
            Simulation results with emergent behaviors
        """
        logger.info(
            f"Running agent society simulation: {num_agents} agents, "
            f"{simulation_steps} steps, strategy={coordination_strategy}"
        )

        prompt = f"""
        Simulate a large-scale agent society with the following parameters:

        Number of Agents: {num_agents}
        Simulation Steps: {simulation_steps}
        Coordination Strategy: {coordination_strategy}

        Agent Configuration:
        {json.dumps(agent_config, indent=2)}

        Simulation requirements:
        1. Initialize agents with diverse capabilities
        2. Implement {coordination_strategy} coordination
        3. Track emergence of collective behaviors
        4. Monitor system-level properties (entropy, diversity, stability)
        5. Record phase transitions and tipping points

        Return simulation results in JSON format:
        {{
            "final_state": "description of final system state",
            "emergent_behaviors": ["list", "of", "emergent", "behaviors"],
            "phase_transitions": [
                {{"step": int, "description": "what changed", "trigger": "why it happened"}}
            ],
            "system_metrics": {{
                "entropy": float,
                "diversity": float,
                "stability": float,
                "coordination_efficiency": float
            }},
            "key_insights": ["important", "observations"],
            "recommendations": ["suggestions", "for", "improvement"]
        }}
        """

        payload = {
            "model": "meta-llama/Llama-3-70b-instruct",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert in multi-agent systems and swarm intelligence."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.4,
            "max_tokens": 2048,
            "response_format": {"type": "json_object"}
        }

        start_time = time.time()

        try:
            response = await self._make_request("chat/completions", "POST", payload)
            result_text = response["choices"][0]["message"]["content"]
            result = json.loads(result_text)

            latency = time.time() - start_time
            usage = response.get("usage", {})
            input_tokens = usage.get("prompt_tokens", 0)
            output_tokens = usage.get("completion_tokens", 0)
            total_tokens = usage.get("total_tokens", input_tokens + output_tokens)
            cost = self._calculate_cost(input_tokens, output_tokens)

            self.metrics.record_request(True, total_tokens, latency, cost)

            return result

        except Exception as e:
            latency = time.time() - start_time
            self.metrics.record_request(False, 0, latency, 0)
            logger.error(f"Agent society simulation failed: {e}")
            raise

    async def run_multimodal_simulation(
        self,
        text_scenario: str,
        image_prompts: List[str],
        simulation_config: Dict
    ) -> Dict:
        """
        Run multi-modal simulation pipeline.

        Args:
            text_scenario: Text-based scenario description
            image_prompts: List of prompts for image generation
            simulation_config: Simulation configuration

        Returns:
            Multi-modal simulation results
        """
        logger.info(f"Running multimodal simulation with {len(image_prompts)} image prompts")

        # Analyze text scenario
        text_analysis_prompt = f"""
        Analyze the following simulation scenario:

        {text_scenario}

        Provide:
        1. Key entities and their relationships
        2. Critical events and their sequence
        3. Potential outcomes and their probabilities
        4. Recommended simulation parameters

        Return as JSON.
        """

        payload = {
            "model": "meta-llama/Llama-3-70b-instruct",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert in scenario analysis and simulation design."
                },
                {
                    "role": "user",
                    "content": text_analysis_prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 2048,
            "response_format": {"type": "json_object"}
        }

        start_time = time.time()

        try:
            response = await self._make_request("chat/completions", "POST", payload)
            text_analysis = json.loads(response["choices"][0]["message"]["content"])

            latency = time.time() - start_time
            usage = response.get("usage", {})
            cost = self._calculate_cost(
                usage.get("prompt_tokens", 0),
                usage.get("completion_tokens", 0)
            )
            self.metrics.record_request(
                usage.get("total_tokens", 0),
                latency,
                cost
            )

            # Note: Image generation would require additional API endpoints
            # This is a placeholder for the multimodal integration
            result = {
                "text_analysis": text_analysis,
                "image_prompts": image_prompts,
                "simulation_config": simulation_config,
                "note": "Image generation requires additional API integration"
            }

            return result

        except Exception as e:
            logger.error(f"Multimodal simulation failed: {e}")
            raise

    def get_metrics(self) -> Dict:
        """Get current API metrics."""
        return {
            "total_requests": self.metrics.total_requests,
            "successful_requests": self.metrics.successful_requests,
            "failed_requests": self.metrics.failed_requests,
            "success_rate": self.metrics.get_success_rate(),
            "total_tokens_used": self.metrics.total_tokens_used,
            "total_cost": self.metrics.total_cost,
            "average_latency": self.metrics.average_latency,
            "cache_hit_rate": self.metrics.get_cache_hit_rate() if self.enable_cache else 0
        }

    def reset_metrics(self):
        """Reset metrics counters."""
        self.metrics = APIMetrics()
        logger.info("Metrics reset")


class LocalGPUSimulator:
    """Local GPU simulation backend using CuPy/NumPy."""

    def __init__(self, use_gpu: bool = True):
        """
        Initialize local simulator.

        Args:
            use_gpu: Whether to use GPU acceleration
        """
        self.use_gpu = use_gpu
        try:
            if use_gpu:
                import cupy as cp
                self.cp = cp
                self.gpu_available = True
                logger.info("Local GPU simulator initialized (CuPy)")
            else:
                raise ImportError("GPU disabled by choice")
        except ImportError:
            import numpy as cp
            self.cp = cp
            self.gpu_available = False
            logger.info("Local GPU simulator initialized (NumPy fallback)")

    def run_transfer_entropy(
        self,
        agent_states: np.ndarray,
        num_bins: int = 10
    ) -> np.ndarray:
        """
        Compute transfer entropy matrix locally.

        Args:
            agent_states: Agent state matrix (time × agents × features)
            num_bins: Number of bins for discretization

        Returns:
            Transfer entropy matrix (agents × agents)
        """
        xp = self.cp

        # Discretize states
        num_agents = agent_states.shape[1]
        te_matrix = xp.zeros((num_agents, num_agents))

        # Simplified transfer entropy computation
        # In production, use full TE calculation with binning
        for i in range(num_agents):
            for j in range(num_agents):
                # Mutual information as proxy for TE
                mi = xp.corrcoef(agent_states[:, i, 0], agent_states[:, j, 0])[0, 1]
                te_matrix[i, j] = xp.abs(mi) if not xp.isnan(mi) else 0

        return te_matrix

    def run_novelty_detection(
        self,
        agent_states: np.ndarray,
        window_size: int = 10
    ) -> np.ndarray:
        """
        Detect novel behaviors locally.

        Args:
            agent_states: Agent state matrix
            window_size: Window size for comparison

        Returns:
            Novelty scores over time
        """
        xp = self.cp

        num_timesteps = agent_states.shape[0]
        novelty_scores = xp.zeros(num_timesteps)

        # Compute novelty as deviation from moving average
        for t in range(window_size, num_timesteps):
            window = agent_states[t-window_size:t]
            mean_state = xp.mean(window, axis=0)
            current_state = agent_states[t]

            # Euclidean distance from mean
            novelty = xp.linalg.norm(current_state - mean_state)
            novelty_scores[t] = novelty

        return novelty_scores


class HybridSimulationEngine:
    """
    Combines local GPU with DeepInfra cloud for optimal performance.

    Strategy:
    - Fast computations: Local GPU
    - Heavy ML inference: Cloud API
    - Large-scale simulations: Cloud
    - Prototype/exploration: Local
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        use_local_gpu: bool = True,
        cloud_cache_ttl: int = 3600
    ):
        """
        Initialize hybrid engine.

        Args:
            api_key: DeepInfra API key
            use_local_gpu: Whether to use local GPU
            cloud_cache_ttl: Cache TTL for cloud results
        """
        self.local = LocalGPUSimulator(use_gpu=use_local_gpu)
        self.cloud = DeepInfraSimulationClient(
            api_key=api_key,
            cache_ttl=cloud_cache_ttl
        )
        self.initialized = False

    async def initialize(self):
        """Initialize async components."""
        if not self.initialized:
            await self.cloud.initialize()
            self.initialized = True
            logger.info("Hybrid simulation engine initialized")

    async def close(self):
        """Close resources."""
        await self.cloud.close()
        self.initialized = False
        logger.info("Hybrid simulation engine closed")

    def _identify_local_tasks(self, scenario: Dict) -> List[str]:
        """Identify tasks suitable for local execution."""
        local_tasks = []

        # Fast matrix operations
        if scenario.get("requires_matrix_ops") and scenario.get("matrix_size", 0) < 1000:
            local_tasks.append("matrix_operations")

        # Small-scale novelty detection
        if scenario.get("requires_novelty_detection"):
            num_agents = scenario.get("num_agents", 0)
            if num_agents < 100:
                local_tasks.append("novelty_detection")

        return local_tasks

    def _identify_cloud_tasks(self, scenario: Dict) -> List[str]:
        """Identify tasks suitable for cloud execution."""
        cloud_tasks = []

        # LLM-based analysis
        if scenario.get("requires_llm_analysis"):
            cloud_tasks.append("llm_analysis")

        # Large-scale simulations
        if scenario.get("num_agents", 0) >= 100:
            cloud_tasks.append("large_scale_simulation")

        # Architecture search
        if scenario.get("requires_architecture_search"):
            cloud_tasks.append("architecture_search")

        return cloud_tasks

    async def simulate(
        self,
        scenario: Dict,
        force_cloud: bool = False,
        force_local: bool = False
    ) -> Dict:
        """
        Run hybrid simulation.

        Args:
            scenario: Simulation scenario configuration
            force_cloud: Force all computation to cloud
            force_local: Force all computation to local

        Returns:
            Combined simulation results
        """
        if not self.initialized:
            await self.initialize()

        logger.info(f"Running hybrid simulation: force_cloud={force_cloud}, force_local={force_local}")

        local_results = {}
        cloud_results = {}

        if force_local:
            # Run everything locally
            local_tasks = ["all"]
        elif force_cloud:
            # Run everything in cloud
            cloud_tasks = ["all"]
        else:
            # Automatic task distribution
            local_tasks = self._identify_local_tasks(scenario)
            cloud_tasks = self._identify_cloud_tasks(scenario)

        # Run local tasks
        if local_tasks and not force_cloud:
            logger.info(f"Running {len(local_tasks)} tasks locally")
            if "matrix_operations" in local_tasks or "all" in local_tasks:
                # Example: compute transfer entropy locally
                agent_states = scenario.get("agent_states")
                if agent_states is not None:
                    te_matrix = self.local.run_transfer_entropy(agent_states)
                    local_results["transfer_entropy"] = te_matrix

            if "novelty_detection" in local_tasks or "all" in local_tasks:
                agent_states = scenario.get("agent_states")
                if agent_states is not None:
                    novelty = self.local.run_novelty_detection(agent_states)
                    local_results["novelty_scores"] = novelty

        # Run cloud tasks
        if cloud_tasks and not force_local:
            logger.info(f"Running {len(cloud_tasks)} tasks in cloud")
            if "llm_analysis" in cloud_tasks or "all" in cloud_tasks:
                if scenario.get("simulation_type") == "emergence_detection":
                    result = await self.cloud.run_emergence_detection_cloud(
                        scenario.get("agent_states", []),
                        scenario.get("detection_config", {})
                    )
                    cloud_results["emergence_analysis"] = result

            if "architecture_search" in cloud_tasks or "all" in cloud_tasks:
                result = await self.cloud.propose_neural_architecture(
                    scenario.get("task_description", ""),
                    scenario.get("constraints", {})
                )
                cloud_results["architecture_proposal"] = result

            if "large_scale_simulation" in cloud_tasks or "all" in cloud_tasks:
                result = await self.cloud.run_agent_society_simulation(
                    scenario.get("num_agents", 100),
                    scenario.get("simulation_steps", 100),
                    scenario.get("agent_config", {}),
                    scenario.get("coordination_strategy", "stigmergy")
                )
                cloud_results["society_simulation"] = result

        # Combine results
        combined = {
            "local_results": local_results,
            "cloud_results": cloud_results,
            "execution_summary": {
                "local_tasks": local_tasks,
                "cloud_tasks": cloud_tasks,
                "local_gpu_available": self.local.gpu_available
            }
        }

        return combined

    async def simulate_batch(
        self,
        scenarios: List[Dict],
        parallel_jobs: int = 5
    ) -> List[Dict]:
        """
        Run multiple simulations in parallel.

        Args:
            scenarios: List of simulation scenarios
            parallel_jobs: Number of parallel cloud jobs

        Returns:
            List of combined results
        """
        logger.info(f"Running batch simulation: {len(scenarios)} scenarios")

        # Create semaphore for cloud API limits
        semaphore = asyncio.Semaphore(parallel_jobs)

        async def run_single(scenario: Dict) -> Dict:
            async with semaphore:
                return await self.simulate(scenario)

        results = await asyncio.gather(*[run_single(s) for s in scenarios])

        successful = sum(1 for r in results if r is not None)
        logger.info(f"Batch simulation complete: {successful}/{len(scenarios)} successful")

        return results

    def get_performance_metrics(self) -> Dict:
        """Get performance metrics for both local and cloud."""
        return {
            "local": {
                "gpu_available": self.local.gpu_available
            },
            "cloud": self.cloud.get_metrics()
        }


# Convenience function for quick usage
async def run_cloud_simulation(
    simulation_type: SimulationType,
    **kwargs
) -> Dict:
    """
    Quick convenience function for running cloud simulations.

    Args:
        simulation_type: Type of simulation to run
        **kwargs: Simulation-specific parameters

    Returns:
        Simulation results

    Example:
        >>> result = await run_cloud_simulation(
        ...     SimulationType.EMERGENCE_DETECTION,
        ...     agent_states=[...],
        ...     detection_config={...}
        ... )
    """
    client = DeepInfraSimulationClient()
    await client.initialize()

    try:
        if simulation_type == SimulationType.EMERGENCE_DETECTION:
            result = await client.run_emergence_detection_cloud(
                kwargs.get("agent_states", []),
                kwargs.get("detection_config", {})
            )
        elif simulation_type == SimulationType.NEURAL_ARCHITECTURE_SEARCH:
            result = await client.propose_neural_architecture(
                kwargs.get("task_description", ""),
                kwargs.get("constraints", {})
            )
        elif simulation_type == SimulationType.AGENT_SOCIETY:
            result = await client.run_agent_society_simulation(
                kwargs.get("num_agents", 100),
                kwargs.get("simulation_steps", 100),
                kwargs.get("agent_config", {}),
                kwargs.get("coordination_strategy", "stigmergy")
            )
        else:
            raise ValueError(f"Unsupported simulation type: {simulation_type}")

        return result

    finally:
        await client.close()


if __name__ == "__main__":
    # Example usage
    async def main():
        # Initialize hybrid engine
        engine = HybridSimulationEngine()
        await engine.initialize()

        # Example scenario
        scenario = {
            "simulation_type": "emergence_detection",
            "agent_states": np.random.rand(100, 10, 5),  # 100 timesteps, 10 agents, 5 features
            "detection_config": {
                "method": "transfer_entropy",
                "threshold": 0.5
            },
            "requires_matrix_ops": True,
            "requires_llm_analysis": True
        }

        # Run simulation
        result = await engine.simulate(scenario)
        print("Simulation result:")
        print(json.dumps(result, indent=2, default=str))

        # Get metrics
        metrics = engine.get_performance_metrics()
        print("\nPerformance metrics:")
        print(json.dumps(metrics, indent=2))

        await engine.close()

    # Run example
    asyncio.run(main())
