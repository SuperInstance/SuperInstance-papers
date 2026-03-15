"""
SpreadsheetMoment Backend - Tri-Tier Agentic Architecture

Tier 1: Global Controller (OpenManus-like)
- Understands entire spreadsheet schema
- Explains cell logic across sheets
- Generates plans for cell updates

Tier 2: Cellular Worker (Mimiclaw)
- Each active cell runs a lightweight Mimiclaw instance
- Executes specific logic for that cell
- Low resource usage for 50-100 concurrent cells

Tier 3: Tool Layer (MCP)
- Model Context Protocol interface
- Spreadsheet native tools (get_neighbor_value, set_cell_value)
- External integration tools (GitHub, Discord, X, etc.)
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import json
import asyncio
from datetime import datetime
import uuid
from pathlib import Path
import logging

# Import components
from routers import cells, webhooks, mcp_tools
from services.cell_manager import CellManager
from services.reasoning_service import ReasoningService
from services.trace_protocol import TraceProtocol

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="SpreadsheetMoment API",
    description="Agentic Spreadsheet with Origin-Centric Design",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global services
cell_manager = CellManager()
reasoning_service = ReasoningService()
trace_protocol = TraceProtocol()

# Include routers
app.include_router(cells.router, prefix="/api/cells", tags=["cells"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])
app.include_router(mcp_tools.router, prefix="/api/mcp", tags=["mcp"])


# WebSocket connection manager for real-time updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, cell_id: str):
        await websocket.accept()
        if cell_id not in self.active_connections:
            self.active_connections[cell_id] = []
        self.active_connections[cell_id].append(websocket)
        logger.info(f"WebSocket connected for cell {cell_id}")

    def disconnect(self, websocket: WebSocket, cell_id: str):
        if cell_id in self.active_connections:
            self.active_connections[cell_id].remove(websocket)
            if not self.active_connections[cell_id]:
                del self.active_connections[cell_id]
        logger.info(f"WebSocket disconnected for cell {cell_id}")

    async def send_update(self, cell_id: str, message: dict):
        if cell_id in self.active_connections:
            for connection in self.active_connections[cell_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending update: {e}")

    async def broadcast_reasoning(self, cell_id: str, reasoning_step: str):
        """Send visual thinking reasoning step to frontend"""
        await self.send_update(cell_id, {
            "type": "reasoning",
            "cell_id": cell_id,
            "step": reasoning_step,
            "timestamp": datetime.now().isoformat()
        })


manager = ConnectionManager()


@app.get("/")
async def root():
    return {
        "name": "SpreadsheetMoment API",
        "version": "1.0.0",
        "architecture": "Tri-Tier Agentic System",
        "tiers": {
            "tier_1": "Global Controller (OpenManus-like)",
            "tier_2": "Cellular Worker (Mimiclaw)",
            "tier_3": "Tool Layer (MCP)"
        },
        "status": "operational"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_cells": len(cell_manager.active_cells),
        "pending_reasoning": reasoning_service.queue_size
    }


@app.websocket("/ws/cell/{cell_id}")
async def websocket_cell(websocket: WebSocket, cell_id: str):
    """WebSocket endpoint for real-time cell updates and visual thinking"""
    await manager.connect(websocket, cell_id)

    try:
        while True:
            data = await websocket.receive_json()

            # Handle different message types
            if data.get("type") == "create_cell":
                # Create new agent cell
                await handle_create_cell(cell_id, data, manager)
            elif data.get("type") == "approve_action":
                # Approve HITL action
                await handle_approve_action(cell_id, manager)
            elif data.get("type") == "reject_action":
                # Reject HITL action
                await handle_reject_action(cell_id, manager)
            elif data.get("type") == "ping":
                # Keep connection alive
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, cell_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, cell_id)


async def handle_create_cell(cell_id: str, data: dict, manager: ConnectionManager):
    """Handle creation of new agent cell"""
    try:
        cell_type = data.get("cell_type")
        config = data.get("config", {})

        # Generate Trace ID (Origin-Centric Design)
        trace_id = trace_protocol.generate_trace_id(cell_id)

        # Create cell session
        cell_data = await cell_manager.create_cell(
            cell_id=cell_id,
            cell_type=cell_type,
            config=config,
            trace_id=trace_id
        )

        # Start reasoning process
        asyncio.create_task(
            reasoning_process(cell_id, cell_type, config, trace_id, manager)
        )

        logger.info(f"Created {cell_type} cell {cell_id} with trace {trace_id}")

    except Exception as e:
        logger.error(f"Error creating cell: {e}")
        await manager.send_update(cell_id, {
            "type": "error",
            "message": str(e)
        })


async def reasoning_process(cell_id: str, cell_type: str, config: dict, trace_id: str, manager: ConnectionManager):
    """Execute reasoning process with visual thinking"""
    try:
        # Update cell state to THINKING
        await cell_manager.update_state(cell_id, "thinking")

        # Stream reasoning steps (DeepSeek-R1 integration)
        reasoning_steps = await reasoning_service.generate_reasoning(
            cell_type=cell_type,
            cell_id=cell_id,
            config=config,
            trace_id=trace_id
        )

        for step in reasoning_steps:
            # Broadcast reasoning step to frontend
            await manager.broadcast_reasoning(cell_id, step)

            # Small delay for visual effect
            await asyncio.sleep(0.5)

        # Transition to NEEDS_REVIEW for HITL
        await cell_manager.update_state(cell_id, "needs_review")

        # Send completion message
        await manager.send_update(cell_id, {
            "type": "reasoning_complete",
            "cell_id": cell_id,
            "state": "needs_review",
            "trace_id": trace_id,
            "timestamp": datetime.now().isoformat()
        })

        logger.info(f"Reasoning complete for cell {cell_id}, awaiting approval")

    except Exception as e:
        logger.error(f"Error in reasoning process: {e}")
        await cell_manager.update_state(cell_id, "error")
        await manager.send_update(cell_id, {
            "type": "error",
            "message": str(e)
        })


async def handle_approve_action(cell_id: str, manager: ConnectionManager):
    """Handle HITL approval"""
    try:
        # Execute approved action via MCP tools
        result = await execute_cell_action(cell_id)

        # Update cell state to POSTED
        await cell_manager.update_state(cell_id, "posted")

        # Send confirmation
        await manager.send_update(cell_id, {
            "type": "action_executed",
            "cell_id": cell_id,
            "result": result,
            "timestamp": datetime.now().isoformat()
        })

        logger.info(f"Action approved and executed for cell {cell_id}")

    except Exception as e:
        logger.error(f"Error executing action: {e}")
        await manager.send_update(cell_id, {
            "type": "error",
            "message": str(e)
        })


async def handle_reject_action(cell_id: str, manager: ConnectionManager):
    """Handle HITL rejection"""
    try:
        # Return cell to DORMANT state
        await cell_manager.update_state(cell_id, "dormant")
        await cell_manager.clear_reasoning(cell_id)

        # Send confirmation
        await manager.send_update(cell_id, {
            "type": "action_rejected",
            "cell_id": cell_id,
            "state": "dormant",
            "timestamp": datetime.now().isoformat()
        })

        logger.info(f"Action rejected for cell {cell_id}")

    except Exception as e:
        logger.error(f"Error rejecting action: {e}")


async def execute_cell_action(cell_id: str) -> dict:
    """Execute the cell's action via MCP tools"""
    cell_data = await cell_manager.get_cell(cell_id)

    if not cell_data:
        raise HTTPException(status_code=404, detail="Cell not found")

    # Execute based on cell type
    cell_type = cell_data["cell_type"]

    if cell_type == "sensor":
        # Execute sensor action (fetch data)
        return await mcp_tools.execute_sensor_action(cell_id, cell_data)
    elif cell_type == "analyzer":
        # Execute analyzer action (run ML model)
        return await mcp_tools.execute_analyzer_action(cell_id, cell_data)
    elif cell_type == "controller":
        # Execute controller action (send command)
        return await mcp_tools.execute_controller_action(cell_id, cell_data)
    elif cell_type == "orchestrator":
        # Execute orchestrator action (coordinate cells)
        return await mcp_tools.execute_orchestrator_action(cell_id, cell_data)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown cell type: {cell_type}")


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting SpreadsheetMoment API...")

    # Create sessions directory
    sessions_dir = Path("sessions")
    sessions_dir.mkdir(exist_ok=True)

    # Initialize cell manager
    await cell_manager.initialize()

    logger.info("SpreadsheetMoment API ready!")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down SpreadsheetMoment API...")
    await cell_manager.shutdown()
    logger.info("Shutdown complete")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
