"""
Cell Manager - Origin-Centric Design State Management

Implements Origin-Centric Design principles:
- Source-based logic instead of reference-based
- Origin Logic checks to prevent recursive loops
- Spatially Damped awareness for context
- Coordinate Keys for identity
- Lazy evaluation for resource management

Each cell maintains a persistent state modeled after Mimiclaw's markdown-based memory.
"""

import asyncio
from typing import Dict, List, Optional
from pathlib import Path
from datetime import datetime
import json
import logging
import aiofiles

logger = logging.getLogger(__name__)


class CellManager:
    """Manages cell state and sessions with Origin-Centric Design"""

    def __init__(self):
        self.active_cells: Dict[str, dict] = {}
        self.sessions_dir = Path("sessions")
        self.lock = asyncio.Lock()

    async def initialize(self):
        """Initialize cell manager"""
        self.sessions_dir.mkdir(exist_ok=True)
        logger.info("CellManager initialized")

    async def create_cell(
        self,
        cell_id: str,
        cell_type: str,
        config: dict,
        trace_id: str
    ) -> dict:
        """Create a new agent cell with Origin-Centric Design"""

        cell_data = {
            "cell_id": cell_id,
            "origin_id": cell_id,  # Origin ID (e.g., "A1", "B2")
            "coordinate_key": f"{cell_id}",  # Coordinate Key for OCD
            "cell_type": cell_type,
            "state": "thinking",
            "trace_id": trace_id,  # Trace ID for recursive loop prevention
            "config": config,
            "reasoning": [],
            "memory": [],  # Conversation history
            "procedures": [],  # Learned procedures
            "created_at": datetime.now().isoformat(),
            "last_update": datetime.now().isoformat()
        }

        async with self.lock:
            self.active_cells[cell_id] = cell_data

        # Create markdown session file (Mimiclaw style)
        await self._create_session_file(cell_id, cell_data)

        logger.info(f"Created cell {cell_id} with trace {trace_id}")
        return cell_data

    async def _create_session_file(self, cell_id: str, cell_data: dict):
        """Create markdown session file for cell (Mimiclaw style)"""

        session_path = self.sessions_dir / f"{cell_id}_context.md"

        content = f"""# {cell_id} Session

## Origin ID
{cell_data['origin_id']}

## Coordinate Key
{cell_data['coordinate_key']}

## Trace ID
{cell_data['trace_id']}

## Cell Type
{cell_data['cell_type']}

## Directives
{json.dumps(cell_data['config'], indent=2)}

## Historical Context
<!-- Summary of past executions -->

## Procedures
<!-- Learned procedures for this cell -->

## Memory Log
<!-- Conversation history -->

---
*Created: {cell_data['created_at']}*
*Last Updated: {cell_data['last_update']}*
"""

        async with aiofiles.open(session_path, 'w') as f:
            await f.write(content)

        logger.debug(f"Created session file {session_path}")

    async def get_cell(self, cell_id: str) -> Optional[dict]:
        """Get cell data"""
        async with self.lock:
            return self.active_cells.get(cell_id)

    async def update_state(self, cell_id: str, state: str) -> dict:
        """Update cell state"""

        cell_data = await self.get_cell(cell_id)
        if not cell_data:
            raise ValueError(f"Cell {cell_id} not found")

        cell_data["state"] = state
        cell_data["last_update"] = datetime.now().isoformat()

        async with self.lock:
            self.active_cells[cell_id] = cell_data

        # Update session file
        await self._update_session_file(cell_id, cell_data)

        return cell_data

    async def add_reasoning_step(self, cell_id: str, step: str):
        """Add reasoning step to cell"""

        cell_data = await self.get_cell(cell_id)
        if not cell_data:
            return

        cell_data["reasoning"].append(step)
        cell_data["last_update"] = datetime.now().isoformat()

        async with self.lock:
            self.active_cells[cell_id] = cell_data

    async def clear_reasoning(self, cell_id: str):
        """Clear reasoning from cell"""

        cell_data = await self.get_cell(cell_id)
        if not cell_data:
            return

        cell_data["reasoning"] = []
        cell_data["last_update"] = datetime.now().isoformat()

        async with self.lock:
            self.active_cells[cell_id] = cell_data

    async def _update_session_file(self, cell_id: str, cell_data: dict):
        """Update markdown session file"""

        session_path = self.sessions_dir / f"{cell_id}_context.md"

        # Read existing content
        async with aiofiles.open(session_path, 'r') as f:
            content = await f.read()

        # Update state in content
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('*Last Updated:'):
                lines[i] = f"*Last Updated: {cell_data['last_update']}*"
                break

        # Add reasoning steps if any
        if cell_data.get('reasoning'):
            lines.append("\n## Latest Reasoning\n")
            for step in cell_data['reasoning']:
                lines.append(f"- {step}")

        async with aiofiles.open(session_path, 'w') as f:
            await f.write('\n'.join(lines))

    async def check_trace_collision(self, trace_id: str, cell_id: str) -> bool:
        """
        Origin-Centric Design: Check for recursive loops
        Returns True if trace collision detected (recursive loop)
        """

        async with self.lock:
            for other_cell_id, cell_data in self.active_cells.items():
                if other_cell_id != cell_id:
                    # Check if this trace ID is already in another cell's history
                    if cell_data.get('trace_id') == trace_id:
                        logger.warning(f"Trace collision detected: {trace_id}")
                        return True

        return False

    async def get_neighbor_context(self, cell_id: str, radius: int = 1) -> Dict[str, dict]:
        """
        Spatially Damped Awareness: Get context from neighboring cells
        Implements Origin-Centric Design's spatial referencing
        """

        neighbors = {}

        # Parse cell coordinate (e.g., "A1" -> col=0, row=0)
        try:
            col_char = cell_id[0].upper()
            row_num = int(cell_id[1:])

            col_idx = ord(col_char) - ord('A')
            row_idx = row_num - 1

            # Get neighboring cells
            for r_offset in range(-radius, radius + 1):
                for c_offset in range(-radius, radius + 1):
                    if r_offset == 0 and c_offset == 0:
                        continue  # Skip self

                    new_row = row_idx + r_offset
                    new_col = col_idx + c_offset

                    if 0 <= new_row < 100 and 0 <= new_col < 20:  # Grid bounds
                        neighbor_id = f"{chr(new_col + ord('A'))}{new_row + 1}"
                        neighbor_data = await self.get_cell(neighbor_id)

                        if neighbor_data and neighbor_data.get('state') == 'posted':
                            neighbors[neighbor_id] = neighbor_data

        except Exception as e:
            logger.error(f"Error getting neighbor context: {e}")

        return neighbors

    async def add_memory(self, cell_id: str, memory: str):
        """Add memory to cell (Mimiclaw style)"""

        cell_data = await self.get_cell(cell_id)
        if not cell_data:
            return

        cell_data["memory"].append({
            "content": memory,
            "timestamp": datetime.now().isoformat()
        })

        async with self.lock:
            self.active_cells[cell_id] = cell_data

    async def shutdown(self):
        """Cleanup on shutdown"""

        async with self.lock:
            self.active_cells.clear()

        logger.info("CellManager shutdown complete")

    @property
    def active_cells_count(self) -> int:
        """Get count of active cells"""
        return len(self.active_cells)
