from fastapi import APIRouter, Request, HTTPException, Depends
from typing import Any
from fastapi.responses import JSONResponse
from .helpers import (
    create_event,
    get_event_by_id,
    update_event,
    delete_event,
    remove_attendee,
    get_db_connection,
)
from .user_auth_jwt import get_current_user

user_events_router = APIRouter(prefix="/user/events", tags=["user events"])


@user_events_router.get("")
@user_events_router.get("/")
async def list_user_events(
    current_user_id: str = Depends(get_current_user),
) -> list[dict[str, Any]]:

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT events.*, COUNT(registrations.id) as registered
            FROM events
            LEFT JOIN registrations ON events.id = registrations.event_id
            WHERE events.user_id = ?
            GROUP BY events.id
            """,
            (current_user_id,),
        )
        events = [dict(row) for row in cursor.fetchall()]
    return events


@user_events_router.post("")
@user_events_router.post("/")
async def create_user_event(
    request: Request, current_user_id: str = Depends(get_current_user)
):

    data = await request.json()

    data["user_id"] = current_user_id
    result, status_code = create_event(data)
    return JSONResponse(content=result, status_code=status_code)


@user_events_router.get("/{event_id}")
async def get_user_event(
    event_id: str, current_user_id: str = Depends(get_current_user)
) -> dict[str, Any]:

    event = get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if str(event["user_id"]) != current_user_id:
        raise HTTPException(
            status_code=403, detail="You don't have permission to access this event"
        )

    return dict(event)


@user_events_router.put("/{event_id}")
async def update_user_event(
    event_id: str, request: Request, current_user_id: str = Depends(get_current_user)
):

    event = get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if str(event["user_id"]) != current_user_id:
        raise HTTPException(
            status_code=403, detail="You don't have permission to update this event"
        )

    data = await request.json()
    result = update_event(event_id, data)

    if isinstance(result, tuple):
        return JSONResponse(content=result[0], status_code=result[1])

    return dict(result)


@user_events_router.delete("/{event_id}")
async def delete_user_event(
    event_id: str, current_user_id: str = Depends(get_current_user)
):

    event = get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if str(event["user_id"]) != current_user_id:
        raise HTTPException(
            status_code=403, detail="You don't have permission to delete this event"
        )

    result, status_code = delete_event(event_id)
    return JSONResponse(content=result, status_code=status_code)


@user_events_router.get("/{event_id}/attendees")
async def get_user_event_attendees(
    event_id: str, current_user_id: str = Depends(get_current_user)
) -> list[dict[str, Any]]:

    event = get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if str(event["user_id"]) != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to view attendees for this event",
        )

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, attendee_name, attendee_email, registration_date
            FROM registrations
            WHERE event_id = ?
            """,
            (event_id,),
        )
        attendees = [dict(row) for row in cursor.fetchall()]
    return attendees


@user_events_router.delete("/{event_id}/attendees/{attendee_id}")
async def delete_user_event_attendee(
    event_id: str, attendee_id: str, current_user_id: str = Depends(get_current_user)
):

    event = get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if str(event["user_id"]) != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to modify attendees for this event",
        )

    result, status_code = remove_attendee(event_id, attendee_id)
    return JSONResponse(content=result, status_code=status_code)

