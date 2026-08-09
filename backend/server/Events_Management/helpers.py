import re
import uuid
from datetime import datetime
from .initialize_event_db import get_db_connection


def is_valid_uuid(value):

    try:
        uuid.UUID(str(value))
        return True
    except ValueError:
        return False


def is_valid_email(email):

    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, email))


def is_valid_date(date_str):

    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def is_valid_time(time_str):

    pattern = r"^(?:[01]\d|2[0-3]):[0-5]\d$"
    return bool(re.match(pattern, time_str))


def get_event_by_id(event_id):

    if not is_valid_uuid(event_id):
        return None

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT events.*, COUNT(registrations.id) as registered
            FROM events
            LEFT JOIN registrations ON events.id = registrations.event_id
            WHERE events.id = ?
            GROUP BY events.id
            """,
            (event_id,),
        )
        return cursor.fetchone()


def create_event(data):

    required_fields = ["title", "date", "time", "location", "capacity"]

    for field in required_fields:
        if field not in data:
            return {"error": f"Missing required field: {field }"}, 400

    if not is_valid_date(data["date"]) or not is_valid_time(data["time"]):
        return {"error": "Invalid date or time format"}, 400

    if "user_id" not in data:
        return {"error": "Missing required field: user_id"}, 400

    event_id = str(uuid.uuid4())

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO events (id, title, date, time, location, capacity, description, created_at, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_id,
                    data["title"],
                    data["date"],
                    data["time"],
                    data["location"],
                    data["capacity"],
                    data.get("description", ""),
                    datetime.now().isoformat(),
                    data["user_id"],
                ),
            )
            conn.commit()

            cursor.execute("SELECT * FROM events WHERE id = ?", (event_id,))
            return dict(cursor.fetchone()), 201
    except Exception as e:
        return {"error": str(e)}, 500


def update_event(event_id, data):

    if not is_valid_uuid(event_id):
        return {"error": "Invalid event ID"}, 400

    event = get_event_by_id(event_id)
    if not event:
        return {"error": "Event not found"}, 404

    update_fields = []
    params = []

    for field in ["title", "date", "time", "location", "capacity", "description"]:
        if field in data:
            if field == "date" and not is_valid_date(data[field]):
                return {"error": "Invalid date format"}, 400
            if field == "time" and not is_valid_time(data[field]):
                return {"error": "Invalid time format"}, 400
            update_fields.append(f"{field } = ?")
            params.append(data[field])

    if not update_fields:
        return {"error": "No fields to update"}, 400

    params.append(event_id)

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"UPDATE events SET {', '.join (update_fields )} WHERE id = ?", params
            )
            conn.commit()
            return get_event_by_id(event_id)
    except Exception as e:
        return {"error": str(e)}, 500


def delete_event(event_id):

    if not is_valid_uuid(event_id):
        return {"error": "Invalid event ID"}, 400

    event = get_event_by_id(event_id)
    if not event:
        return {"error": "Event not found"}, 404

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM registrations WHERE event_id = ?", (event_id,))
            cursor.execute("DELETE FROM events WHERE id = ?", (event_id,))
            conn.commit()
            return {"message": "Event deleted successfully"}, 200
    except Exception as e:
        return {"error": str(e)}, 500


def register_for_event(event_id, data):

    if not is_valid_uuid(event_id):
        return {"error": "Invalid event ID"}, 400

    attendee_name = data.get("attendee_name") or data.get("name")
    attendee_email = data.get("attendee_email") or data.get("email")

    if not attendee_name or not attendee_email:
        return {
            "error": "Missing required fields: attendee_name and attendee_email"
        }, 400

    if not is_valid_email(attendee_email):
        return {"error": "Invalid email format"}, 400

    event = get_event_by_id(event_id)
    if not event:
        return {"error": "Event not found"}, 404

    if event["registered"] >= event["capacity"]:
        return {"error": "Event is at full capacity"}, 400

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                "SELECT * FROM registrations WHERE event_id = ? AND attendee_email = ?",
                (event_id, attendee_email),
            )
            if cursor.fetchone():
                return {"error": "Email already registered"}, 400

            registration_id = str(uuid.uuid4())

            registration_date = data.get(
                "registration_date", datetime.now().isoformat()
            )
            cursor.execute(
                """
                INSERT INTO registrations (id, event_id, attendee_name, attendee_email, registration_date)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    registration_id,
                    event_id,
                    attendee_name,
                    attendee_email,
                    registration_date,
                ),
            )
            conn.commit()
            return {
                "message": "Registration successful",
                "event": get_event_by_id(event_id),
            }, 201
    except Exception as e:
        return {"error": str(e)}, 500


def cancel_registration(event_id, attendee_email):

    if not is_valid_uuid(event_id):
        return {"error": "Invalid event ID"}, 400

    if not is_valid_email(attendee_email):
        return {"error": "Invalid email format"}, 400

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM registrations WHERE event_id = ? AND attendee_email = ?",
                (event_id, attendee_email),
            )
            if cursor.rowcount == 0:
                return {"error": "Registration not found"}, 404
            conn.commit()
            return {"message": "Registration cancelled successfully"}, 200
    except Exception as e:
        return {"error": str(e)}, 500


def remove_attendee(event_id, registration_id):

    if not is_valid_uuid(event_id):
        return {"error": "Invalid event ID"}, 400

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM registrations WHERE event_id = ? AND id = ?",
                (event_id, registration_id),
            )
            if cursor.rowcount == 0:
                return {"error": "Attendee registration not found"}, 404
            conn.commit()
            return {"message": "Attendee removed successfully"}, 200
    except Exception as e:
        return {"error": str(e)}, 500

