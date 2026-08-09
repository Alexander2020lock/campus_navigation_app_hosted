from datetime import datetime
import sqlite3
import uuid
from Utils.loader import env_variables
from Utils.db_maker import create_user_db


def get_db_connection():
    conn = sqlite3.connect(env_variables["event_db"])
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            location TEXT NOT NULL,
            capacity INTEGER NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS registrations (
            id TEXT PRIMARY KEY,
            event_id TEXT NOT NULL,
            attendee_name TEXT NOT NULL,
            attendee_email TEXT NOT NULL,
            registration_date TEXT NOT NULL,
            FOREIGN KEY (event_id) REFERENCES events (id)
        )
        """
    )
    create_user_db(env_variables["event_db"])

    cursor.execute("SELECT COUNT(*) FROM events")
    if cursor.fetchone()[0] == 0:

        cursor.execute("SELECT id FROM users LIMIT 1")
        user = cursor.fetchone()

        if user:
            user_id = user[0]

            sample_events = [
                {
                    "id": str(uuid.uuid4()),
                    "title": "Annual Conference",
                    "date": "2025-04-15",
                    "time": "09:00",
                    "location": "Convention Center",
                    "capacity": 500,
                    "description": "Our flagship annual conference featuring keynote speakers and networking opportunities.",
                    "created_at": datetime.now().isoformat(),
                    "user_id": user_id,
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Product Launch",
                    "date": "2025-05-20",
                    "time": "14:00",
                    "location": "Downtown Venue",
                    "capacity": 200,
                    "description": "Exclusive launch event for our newest product line with demos and special offers.",
                    "created_at": datetime.now().isoformat(),
                    "user_id": user_id,
                },
            ]

            for event in sample_events:
                cursor.execute(
                    """
                    INSERT INTO events (id, title, date, time, location, capacity, description, created_at, user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event["id"],
                        event["title"],
                        event["date"],
                        event["time"],
                        event["location"],
                        event["capacity"],
                        event["description"],
                        event["created_at"],
                        event["user_id"],
                    ),
                )

    conn.commit()
    conn.close()


# init_db()
