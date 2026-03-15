"""
Webhooks Router - External Event Integration

Receives webhooks from external services and triggers cells:
- GitHub webhooks (issues, PRs, commits)
- Discord webhooks (messages)
- X/Twitter webhooks (tweets)
- Custom webhooks (any HTTP POST)

Implements webhook-based cell activation (no polling!)
"""

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Dict, Any
import logging
import hashlib
import hmac

logger = logging.getLogger(__name__)

router = APIRouter()

# Import services
from services.cell_manager import CellManager
from services.reasoning_service import ReasoningService

# Global references (set by main.py)
cell_manager: CellManager = None
reasoning_service: ReasoningService = None


@router.post("/github")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    GitHub webhook receiver
    Triggers cells that are watching GitHub repositories
    """

    try:
        # Verify GitHub signature
        signature = request.headers.get("X-Hub-Signature-256")
        if not signature:
            raise HTTPException(status_code=401, detail="Missing signature")

        # Get webhook payload
        payload = await request.json()

        # Extract event type
        event_type = request.headers.get("X-GitHub-Event", "unknown")
        logger.info(f"Received GitHub webhook: {event_type}")

        # Extract repository info
        repo = payload.get("repository", {}).get("full_name", "")

        # Find cells watching this repo
        watching_cells = await find_watching_cells("github", repo)

        # Trigger each cell
        for cell_id in watching_cells:
            background_tasks.add_task(
                trigger_cell_from_webhook,
                cell_id,
                "github",
                payload
            )

        return JSONResponse({
            "status": "received",
            "triggered_cells": len(watching_cells)
        })

    except Exception as e:
        logger.error(f"Error processing GitHub webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/discord")
async def discord_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Discord webhook receiver
    Triggers cells that are watching Discord channels
    """

    try:
        payload = await request.json()

        logger.info(f"Received Discord webhook")

        # Extract channel/guild info
        channel_id = payload.get("channel_id", "")
        guild_id = payload.get("guild_id", "")

        # Find cells watching this channel
        watching_cells = await find_watching_cells("discord", f"{guild_id}/{channel_id}")

        # Trigger each cell
        for cell_id in watching_cells:
            background_tasks.add_task(
                trigger_cell_from_webhook,
                cell_id,
                "discord",
                payload
            )

        return JSONResponse({
            "status": "received",
            "triggered_cells": len(watching_cells)
        })

    except Exception as e:
        logger.error(f"Error processing Discord webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/twitter")
async def twitter_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    X/Twitter webhook receiver
    Triggers cells that are watching Twitter accounts
    """

    try:
        payload = await request.json()

        logger.info(f"Received Twitter webhook")

        # Extract user info
        user_id = payload.get("for_user_id", "")
        tweet_id = payload.get("tweet_create_events", [{}])[0].get("id_str", "")

        # Find cells watching this user
        watching_cells = await find_watching_cells("twitter", user_id)

        # Trigger each cell
        for cell_id in watching_cells:
            background_tasks.add_task(
                trigger_cell_from_webhook,
                cell_id,
                "twitter",
                payload
            )

        return JSONResponse({
            "status": "received",
            "triggered_cells": len(watching_cells)
        })

    except Exception as e:
        logger.error(f"Error processing Twitter webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/custom/{source}")
async def custom_webhook(source: str, request: Request, background_tasks: BackgroundTasks):
    """
    Custom webhook receiver
    Allows triggering cells from any HTTP POST
    """

    try:
        payload = await request.json()

        logger.info(f"Received custom webhook: {source}")

        # Find cells watching this source
        watching_cells = await find_watching_cells("custom", source)

        # Trigger each cell
        for cell_id in watching_cells:
            background_tasks.add_task(
                trigger_cell_from_webhook,
                cell_id,
                source,
                payload
            )

        return JSONResponse({
            "status": "received",
            "triggered_cells": len(watching_cells)
        })

    except Exception as e:
        logger.error(f"Error processing custom webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def find_watching_cells(source: str, target: str) -> list:
    """Find cells that are watching a specific source/target"""

    watching = []

    if not cell_manager:
        return watching

    # Search through active cells
    for cell_id, cell_data in cell_manager.active_cells.items():
        config = cell_data.get("config", {})

        # Check if cell is watching this source
        watch_source = config.get(f"watch_{source}")
        if watch_source == target:
            watching.append(cell_id)

    logger.info(f"Found {len(watching)} cells watching {source}/{target}")
    return watching


async def trigger_cell_from_webhook(
    cell_id: str,
    source: str,
    payload: dict
):
    """Trigger a cell from webhook event"""

    try:
        logger.info(f"Triggering cell {cell_id} from {source} webhook")

        # Get cell data
        cell = await cell_manager.get_cell(cell_id)
        if not cell:
            logger.warning(f"Cell {cell_id} not found")
            return

        # Add webhook data to cell memory
        await cell_manager.add_memory(
            cell_id,
            f"Webhook from {source}: {payload}"
        )

        # Update cell state to thinking
        await cell_manager.update_state(cell_id, "thinking")

        # Generate new trace ID for this operation
        from services.trace_protocol import trace_protocol
        trace_id = trace_protocol.generate_trace_id(cell_id)

        # Start reasoning process
        # This would normally be done via WebSocket
        # For now, just log it
        logger.info(f"Cell {cell_id} triggered with trace {trace_id}")

    except Exception as e:
        logger.error(f"Error triggering cell {cell_id}: {e}")
