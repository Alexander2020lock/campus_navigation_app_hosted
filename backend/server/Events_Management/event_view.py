from fastapi import APIRouter, Request, HTTPException
from typing import Any
from fastapi.responses import JSONResponse
from .helpers import (
    get_event_by_id,
    register_for_event,
    cancel_registration,
    get_db_connection,
)

events_router = APIRouter(tags=["events"])


@events_router.get("")
@events_router.get("/")
async def list_events() -> list[dict[str, Any]]:

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT events.*, COUNT(registrations.id) as registered
            FROM events
            LEFT JOIN registrations ON events.id = registrations.event_id
            GROUP BY events.id
            """
        )
        events = [dict(row) for row in cursor.fetchall()]
    return events


@events_router.get("/{event_id}")
async def get_event_route(event_id: str) -> dict[str, Any]:

    event = get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return dict(event)


@events_router.post("/{event_id}/register")
async def register_event_route(event_id: str, request: Request):

    try:
        data = await request.json()
    except Exception:
        data = {}

    if not isinstance(data, dict):
        data = {}

    result, status_code = register_for_event(event_id, data)

    if status_code == 201 and "event" in result:
        result["event"] = dict(result["event"])

    return JSONResponse(content=result, status_code=status_code)


@events_router.post("/{event_id}/cancel-registration")
async def cancel_registration_route(event_id: str, request: Request):

    try:
        data = await request.json()
    except Exception:
        data = {}

    if not isinstance(data, dict):
        data = {}

    email = data.get("email") or data.get("attendee_email")
    if not email:
        raise HTTPException(status_code=400, detail="Attendee email is required")

    result, status_code = cancel_registration(event_id, email)
    return JSONResponse(content=result, status_code=status_code)


