"""
Cells Router - Cell Management API

REST API for managing spreadsheet cells:
- Create cells
- Get cell info
- Update cell config
- Delete cells
- List all cells
- Get cell statistics
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Import services
from services.cell_manager import CellManager
from services.trace_protocol import TraceProtocol

# Global references (set by main.py)
cell_manager: CellManager = None
trace_protocol: TraceProtocol = None


class CellCreate(BaseModel):
    """Model for creating a new cell"""
    cell_id: str
    cell_type: str  # sensor, analyzer, controller, orchestrator
    config: Dict
    watch_source: Optional[str] = None
    watch_target: Optional[str] = None


class CellUpdate(BaseModel):
    """Model for updating a cell"""
    config: Dict


class CellResponse(BaseModel):
    """Model for cell response"""
    cell_id: str
    origin_id: str
    coordinate_key: str
    cell_type: str
    state: str
    trace_id: Optional[str]
    config: Dict
    reasoning: List[str]
    created_at: str
    last_update: str


@router.get("/", response_model=List[CellResponse])
async def list_cells():
    """List all active cells"""

    if not cell_manager:
        raise HTTPException(status_code=500, detail="Cell manager not initialized")

    cells = []
    for cell_id, cell_data in cell_manager.active_cells.items():
        cells.append(CellResponse(
            cell_id=cell_id,
            origin_id=cell_data.get("origin_id"),
            coordinate_key=cell_data.get("coordinate_key"),
            cell_type=cell_data.get("cell_type"),
            state=cell_data.get("state"),
            trace_id=cell_data.get("trace_id"),
            config=cell_data.get("config", {}),
            reasoning=cell_data.get("reasoning", []),
            created_at=cell_data.get("created_at"),
            last_update=cell_data.get("last_update")
        ))

    return cells


@router.get("/{cell_id}", response_model=CellResponse)
async def get_cell(cell_id: str):
    """Get specific cell information"""

    if not cell_manager:
        raise HTTPException(status_code=500, detail="Cell manager not initialized")

    cell_data = await cell_manager.get_cell(cell_id)

    if not cell_data:
        raise HTTPException(status_code=404, detail="Cell not found")

    return CellResponse(
        cell_id=cell_id,
        origin_id=cell_data.get("origin_id"),
        coordinate_key=cell_data.get("coordinate_key"),
        cell_type=cell_data.get("cell_type"),
        state=cell_data.get("state"),
        trace_id=cell_data.get("trace_id"),
        config=cell_data.get("config", {}),
        reasoning=cell_data.get("reasoning", []),
        created_at=cell_data.get("created_at"),
        last_update=cell_data.get("last_update")
    )


@router.post("/", response_model=CellResponse)
async def create_cell(cell: CellCreate):
    """Create a new agent cell"""

    if not cell_manager:
        raise HTTPException(status_code=500, detail="Cell manager not initialized")

    if not trace_protocol:
        raise HTTPException(status_code=500, detail="Trace protocol not initialized")

    # Generate Trace ID (Origin-Centric Design)
    trace_id = trace_protocol.generate_trace_id(cell.cell_id)

    # Create cell
    cell_data = await cell_manager.create_cell(
        cell_id=cell.cell_id,
        cell_type=cell.cell_type,
        config={
            **cell.config,
            "watch_source": cell.watch_source,
            "watch_target": cell.watch_target
        },
        trace_id=trace_id
    )

    logger.info(f"Created {cell.cell_type} cell {cell.cell_id} with trace {trace_id}")

    return CellResponse(
        cell_id=cell.cell_id,
        origin_id=cell_data.get("origin_id"),
        coordinate_key=cell_data.get("coordinate_key"),
        cell_type=cell_data.get("cell_type"),
        state=cell_data.get("state"),
        trace_id=cell_data.get("trace_id"),
        config=cell_data.get("config", {}),
        reasoning=cell_data.get("reasoning", []),
        created_at=cell_data.get("created_at"),
        last_update=cell_data.get("last_update")
    )


@router.put("/{cell_id}", response_model=CellResponse)
async def update_cell(cell_id: str, update: CellUpdate):
    """Update cell configuration"""

    if not cell_manager:
        raise HTTPException(status_code=500, detail="Cell manager not initialized")

    cell_data = await cell_manager.get_cell(cell_id)

    if not cell_data:
        raise HTTPException(status_code=404, detail="Cell not found")

    # Update config
    cell_data["config"] = update.config
    cell_data["last_update"] = datetime.now().isoformat()

    # Update in manager
    await cell_manager.update_state(cell_id, cell_data["state"])

    return CellResponse(
        cell_id=cell_id,
        origin_id=cell_data.get("origin_id"),
        coordinate_key=cell_data.get("coordinate_key"),
        cell_type=cell_data.get("cell_type"),
        state=cell_data.get("state"),
        trace_id=cell_data.get("trace_id"),
        config=cell_data.get("config", {}),
        reasoning=cell_data.get("reasoning", []),
        created_at=cell_data.get("created_at"),
        last_update=cell_data.get("last_update")
    )


@router.delete("/{cell_id}")
async def delete_cell(cell_id: str):
    """Delete a cell"""

    if not cell_manager:
        raise HTTPException(status_code=500, detail="Cell manager not initialized")

    cell_data = await cell_manager.get_cell(cell_id)

    if not cell_data:
        raise HTTPException(status_code=404, detail="Cell not found")

    # Remove from active cells
    del cell_manager.active_cells[cell_id]

    logger.info(f"Deleted cell {cell_id}")

    return {"status": "deleted", "cell_id": cell_id}


@router.get("/stats/summary")
async def get_cell_statistics():
    """Get cell statistics"""

    if not cell_manager:
        raise HTTPException(status_code=500, detail="Cell manager not initialized")

    stats = {
        "total_cells": len(cell_manager.active_cells),
        "by_state": {},
        "by_type": {},
        "active_traces": len(trace_protocol.active_traces) if trace_protocol else 0
    }

    # Count by state and type
    for cell_data in cell_manager.active_cells.values():
        state = cell_data.get("state", "unknown")
        cell_type = cell_data.get("cell_type", "unknown")

        stats["by_state"][state] = stats["by_state"].get(state, 0) + 1
        stats["by_type"][cell_type] = stats["by_type"].get(cell_type, 0) + 1

    return stats
