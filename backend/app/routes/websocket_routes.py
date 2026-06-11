"""
EXAMOS - WebSocket Routes
Real-time WebSocket endpoint for trust score updates during exams.
Handles bidirectional communication between student client and backend.
"""

import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Set

from app.database.connection import async_session
from app.services.auth_service import decode_access_token
from app.services.monitoring_service import record_monitoring_event

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    """
    Manages active WebSocket connections.
    Groups connections by exam attempt for monitoring.
    """

    def __init__(self):
        # attempt_id -> set of WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Monitor connections (teachers watching students)
        self.monitor_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, attempt_id: int):
        await websocket.accept()
        if attempt_id not in self.active_connections:
            self.active_connections[attempt_id] = set()
        self.active_connections[attempt_id].add(websocket)

    async def connect_monitor(self, websocket: WebSocket):
        await websocket.accept()
        self.monitor_connections.add(websocket)

    def disconnect(self, websocket: WebSocket, attempt_id: int):
        if attempt_id in self.active_connections:
            self.active_connections[attempt_id].discard(websocket)
            if not self.active_connections[attempt_id]:
                del self.active_connections[attempt_id]

    def disconnect_monitor(self, websocket: WebSocket):
        self.monitor_connections.discard(websocket)

    async def broadcast_trust_update(self, attempt_id: int, data: dict):
        """Broadcast trust score update to all monitoring connections."""
        message = json.dumps({"type": "trust_update", "attempt_id": attempt_id, **data})
        dead_connections = set()
        for ws in self.monitor_connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead_connections.add(ws)
        self.monitor_connections -= dead_connections


manager = ConnectionManager()


@router.websocket("/ws/exam/{attempt_id}")
async def exam_websocket(websocket: WebSocket, attempt_id: int):
    """
    WebSocket endpoint for real-time exam monitoring.
    
    Client sends anti-cheat events, server responds with trust score updates.
    Events: tab_switch, fullscreen_exit, multiple_faces, no_face
    """
    # Authenticate via query param token
    token = websocket.query_params.get("token", "")
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await manager.connect(websocket, attempt_id)

    try:
        while True:
            data = await websocket.receive_text()
            event_data = json.loads(data)

            event_type = event_data.get("type", "unknown")
            details = event_data.get("details", {})

            # Record event and compute new trust score
            async with async_session() as db:
                event, new_trust_score = await record_monitoring_event(
                    db, attempt_id, event_type, details
                )
                await db.commit()

                if event:
                    # Send updated trust score back to student
                    response = {
                        "type": "trust_score_update",
                        "trust_score": new_trust_score,
                        "event_type": event_type,
                        "severity": event.severity,
                        "deduction": event.trust_score_impact,
                    }
                    await websocket.send_text(json.dumps(response))

                    # Broadcast to monitoring teachers
                    await manager.broadcast_trust_update(attempt_id, {
                        "trust_score": new_trust_score,
                        "event_type": event_type,
                        "severity": event.severity,
                        "student_id": int(payload.get("sub", 0)),
                    })

    except WebSocketDisconnect:
        manager.disconnect(websocket, attempt_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, attempt_id)


@router.websocket("/ws/monitor")
async def monitor_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for teachers to receive real-time monitoring updates.
    Receives trust score updates for all active exam attempts.
    """
    token = websocket.query_params.get("token", "")
    payload = decode_access_token(token)
    if not payload or payload.get("role") not in ("teacher", "admin"):
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await manager.connect_monitor(websocket)

    try:
        while True:
            # Keep connection alive, listen for any commands
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_monitor(websocket)
    except Exception:
        manager.disconnect_monitor(websocket)
