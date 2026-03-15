"""
Trace Protocol - Origin-Centric Design Recursive Loop Prevention

Implements Origin-Centric Design (OCD) trace protocol:
- Unique Trace IDs for each operation
- Trace collision detection
- Recursive loop prevention
- Source-based logic tracking
"""

import uuid
from typing import Dict, List, Set
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class TraceProtocol:
    """Manages trace IDs and prevents recursive loops"""

    def __init__(self):
        # Active traces (operation tracking)
        self.active_traces: Dict[str, dict] = {}

        # Trace history (for collision detection)
        self.trace_history: Dict[str, List[dict]] = {}

        # Circular dependency tracking
        self.dependency_graph: Dict[str, Set[str]] = {}

        # Trace expiry (10 minutes)
        self.trace_expiry = timedelta(minutes=10)

    def generate_trace_id(self, origin_id: str) -> str:
        """
        Generate unique Trace ID for Origin-Centric Design
        Format: trace_{timestamp}_{uuid}_{origin}
        """

        trace_id = f"trace_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}_{origin_id}"

        # Register trace
        self.active_traces[trace_id] = {
            "origin_id": origin_id,
            "created_at": datetime.now(),
            "path": [origin_id],  # Track path through cells
            "state": "active"
        }

        logger.debug(f"Generated trace ID: {trace_id}")
        return trace_id

    def check_trace_collision(self, trace_id: str, current_cell: str) -> bool:
        """
        Check for trace collision (recursive loop detection)
        Returns True if collision detected
        """

        trace_data = self.active_traces.get(trace_id)

        if not trace_data:
            return False

        # Check if current cell is already in the trace path
        if current_cell in trace_data["path"]:
            logger.warning(f"Recursive loop detected: {trace_id} at cell {current_cell}")
            logger.warning(f"Path: {' -> '.join(trace_data['path'])}")
            return True

        # Check for circular dependencies
        if self._check_circular_dependency(trace_data["origin_id"], current_cell):
            logger.warning(f"Circular dependency detected: {trace_data['origin_id']} -> {current_cell}")
            return True

        # Update path
        trace_data["path"].append(current_cell)

        return False

    def _check_circular_dependency(self, from_cell: str, to_cell: str) -> bool:
        """Check if creating dependency would create a cycle"""

        # Initialize dependency sets if not exists
        if from_cell not in self.dependency_graph:
            self.dependency_graph[from_cell] = set()

        if to_cell not in self.dependency_graph:
            self.dependency_graph[to_cell] = set()

        # Add dependency
        self.dependency_graph[from_cell].add(to_cell)

        # Check for cycles using DFS
        visited = set()
        recursion_stack = set()

        def has_cycle(cell: str) -> bool:
            visited.add(cell)
            recursion_stack.add(cell)

            for neighbor in self.dependency_graph.get(cell, set()):
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        return True
                elif neighbor in recursion_stack:
                    return True

            recursion_stack.remove(cell)
            return False

        # Check from start node
        if to_cell in visited:
            return has_cycle(to_cell)
        else:
            return has_cycle(from_cell)

    def validate_trace(self, trace_id: str) -> bool:
        """
        Validate trace ID
        Returns True if trace is valid and not expired
        """

        trace_data = self.active_traces.get(trace_id)

        if not trace_data:
            return False

        # Check expiry
        if datetime.now() - trace_data["created_at"] > self.trace_expiry:
            logger.info(f"Trace expired: {trace_id}")
            self.expire_trace(trace_id)
            return False

        return True

    def expire_trace(self, trace_id: str):
        """Mark trace as expired"""

        if trace_id in self.active_traces:
            trace_data = self.active_traces[trace_id]
            trace_data["state"] = "expired"

            # Move to history
            if trace_id not in self.trace_history:
                self.trace_history[trace_id] = []

            self.trace_history[trace_id].append({
                "expired_at": datetime.now(),
                "path": trace_data["path"],
                "origin_id": trace_data["origin_id"]
            })

            # Remove from active
            del self.active_traces[trace_id]

            logger.debug(f"Expired trace: {trace_id}")

    def complete_trace(self, trace_id: str):
        """Mark trace as completed successfully"""

        if trace_id in self.active_traces:
            trace_data = self.active_traces[trace_id]
            trace_data["state"] = "completed"
            trace_data["completed_at"] = datetime.now()

            # Move to history
            if trace_id not in self.trace_history:
                self.trace_history[trace_id] = []

            self.trace_history[trace_id].append({
                "completed_at": datetime.now(),
                "path": trace_data["path"],
                "origin_id": trace_data["origin_id"]
            })

            # Remove from active
            del self.active_traces[trace_id]

            logger.debug(f"Completed trace: {trace_id}")

    def get_trace_info(self, trace_id: str) -> dict:
        """Get trace information"""

        trace_data = self.active_traces.get(trace_id)

        if trace_data:
            return {
                "trace_id": trace_id,
                "state": trace_data["state"],
                "origin_id": trace_data["origin_id"],
                "path": trace_data["path"],
                "created_at": trace_data["created_at"]
            }

        # Check history
        if trace_id in self.trace_history and self.trace_history[trace_id]:
            history_entry = self.trace_history[trace_id][-1]
            return {
                "trace_id": trace_id,
                "state": "history",
                "origin_id": history_entry["origin_id"],
                "path": history_entry["path"],
                "created_at": history_entry.get("expired_at") or history_entry.get("completed_at")
            }

        return None

    def cleanup_expired_traces(self):
        """Clean up expired traces"""

        now = datetime.now()
        expired_traces = []

        for trace_id, trace_data in self.active_traces.items():
            if now - trace_data["created_at"] > self.trace_expiry:
                expired_traces.append(trace_id)

        for trace_id in expired_traces:
            self.expire_trace(trace_id)

        logger.debug(f"Cleaned up {len(expired_traces)} expired traces")

    def get_statistics(self) -> dict:
        """Get trace protocol statistics"""

        return {
            "active_traces": len(self.active_traces),
            "historical_traces": len(self.trace_history),
            "dependencies": len(self.dependency_graph),
            "expiry_minutes": self.trace_expiry.total_seconds() / 60
        }


# Singleton instance
trace_protocol = TraceProtocol()
