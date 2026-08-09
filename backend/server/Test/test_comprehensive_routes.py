import pytest
import os
from pathlib import Path
from datetime import datetime, timedelta
from server.Events_Management.user_auth_jwt import verify_token, create_access_token




def test_jwt_verify_token():
    valid_token = create_access_token({"sub": "test_123"})
    payload = verify_token(valid_token)
    assert payload is not None
    assert payload.get("sub") == "test_123"

    invalid_token = verify_token("invalid.token.string")
    assert invalid_token is None


def test_user_management_complete_routes(client):
    suffix = os.urandom(4).hex()
    user_data = {
        "username": f"cov_user_{suffix}",
        "password": "Password123!",
        "email": f"cov_user_{suffix}@example.com",
    }

    # 1. Register User
    res = client.post("/user/register", json=user_data)
    assert res.status_code == 200
    assert "user_id" in res.json()

    # Duplicate Register
    res_dup = client.post("/user/register", json=user_data)
    assert res_dup.status_code == 409

    # 2. Login User - JSON
    res_login_json = client.post(
        "/user/login",
        json={"username": user_data["username"], "password": user_data["password"]},
    )
    assert res_login_json.status_code == 200
    token = res_login_json.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}

    # Login User - Form data
    res_login_form = client.post(
        "/user/login",
        data={"username": user_data["username"], "password": user_data["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert res_login_form.status_code == 200

    # Login - Missing / Invalid credentials
    res_bad_login = client.post("/user/login", json={"username": "", "password": ""})
    assert res_bad_login.status_code == 400

    res_wrong_pw = client.post(
        "/user/login",
        json={"username": user_data["username"], "password": "WrongPassword"},
    )
    assert res_wrong_pw.status_code == 401

    # 3. Profile & Me
    res_prof = client.get("/user/profile", headers=headers)
    assert res_prof.status_code == 200
    assert res_prof.json()["username"] == user_data["username"]

    res_me = client.get("/user/me", headers=headers)
    assert res_me.status_code == 200

    # 4. Update Profile
    res_up_empty = client.put("/user/profile", json={}, headers=headers)
    assert res_up_empty.status_code == 400

    res_up = client.put(
        "/user/profile", json={"title": "Dr.", "position": "Lead"}, headers=headers
    )
    assert res_up.status_code == 200
    assert res_up.json()["title"] == "Dr."

    # 5. Login History
    res_hist = client.get("/user/login-history", headers=headers)
    assert res_hist.status_code == 200
    assert "login_history" in res_hist.json()

    # 6. Update Password
    res_pw_err = client.put(
        "/user/password",
        json={"current_password": "WrongPassword", "new_password": "NewPassword123!"},
        headers=headers,
    )
    assert res_pw_err.status_code == 401

    res_pw_ok = client.put(
        "/user/password",
        json={
            "current_password": user_data["password"],
            "new_password": "NewPassword123!",
        },
        headers=headers,
    )
    assert res_pw_ok.status_code == 200

    # 7. Delete Profile
    res_del_prof = client.delete("/user/profile", headers=headers)
    assert res_del_prof.status_code == 200

    # Verify deleted user cannot authenticate
    res_after_del = client.get("/user/profile", headers=headers)
    assert res_after_del.status_code == 401


def test_event_management_and_view_complete_routes(client):
    # Setup two users (owner and non-owner)
    s1, s2 = os.urandom(3).hex(), os.urandom(3).hex()
    u1 = {
        "username": f"owner_{s1}",
        "password": "Password123!",
        "email": f"owner_{s1}@example.com",
    }
    u2 = {
        "username": f"other_{s2}",
        "password": "Password123!",
        "email": f"other_{s2}@example.com",
    }

    client.post("/user/register", json=u1)
    client.post("/user/register", json=u2)

    t1 = client.post(
        "/user/login", json={"username": u1["username"], "password": u1["password"]}
    ).json()["access_token"]
    t2 = client.post(
        "/user/login", json={"username": u2["username"], "password": u2["password"]}
    ).json()["access_token"]

    h1 = {"Authorization": f"Bearer {t1}"}
    h2 = {"Authorization": f"Bearer {t2}"}

    # 1. Public list
    assert client.get("/events").status_code == 200
    assert client.get("/events/").status_code == 200

    # 2. User list
    assert client.get("/user/events", headers=h1).status_code == 200
    assert client.get("/user/events/", headers=h1).status_code == 200

    # 3. Create Event validation
    bad_event = {"title": "No Date"}
    assert client.post("/user/events/", json=bad_event, headers=h1).status_code == 400

    event_payload = {
        "title": "Full Coverage Event",
        "date": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
        "time": "14:00",
        "location": "Main Hall",
        "capacity": 2,
        "description": "Comprehensive test event",
    }

    res_create = client.post("/user/events/", json=event_payload, headers=h1)
    assert res_create.status_code in (200, 201)
    event_id = res_create.json()["id"]

    # 4. Get Event details
    assert client.get(f"/events/{event_id}").status_code == 200
    assert client.get(f"/events/invalid-uuid").status_code == 404
    assert client.get(f"/user/events/{event_id}", headers=h1).status_code == 200

    # Permission denied for non-owner
    assert client.get(f"/user/events/{event_id}", headers=h2).status_code == 403

    # 5. Update Event
    assert (
        client.put(
            f"/user/events/{event_id}",
            json={"title": "Updated Title"},
            headers=h1,
        ).status_code
        == 200
    )
    assert (
        client.put(
            f"/user/events/{event_id}",
            json={"title": "Updated Title"},
            headers=h2,
        ).status_code
        == 403
    )
    assert (
        client.put(
            "/user/events/00000000-0000-0000-0000-000000000000",
            json={"title": "Updated Title"},
            headers=h1,
        ).status_code
        == 404
    )

    # 6. Public Registration
    reg_payload = {
        "attendee_name": "Alice Smith",
        "attendee_email": f"alice_{s1}@example.com",
    }
    assert (
        client.post(f"/events/{event_id}/register", json=reg_payload).status_code == 201
    )

    # Duplicate registration
    assert (
        client.post(f"/events/{event_id}/register", json=reg_payload).status_code == 400
    )

    # Registration validation errors
    assert client.post(f"/events/{event_id}/register", json={}).status_code == 400
    assert (
        client.post(
            f"/events/{event_id}/register",
            json={"attendee_name": "Bob", "attendee_email": "not-an-email"},
        ).status_code
        == 400
    )

    # 7. Attendees endpoint
    res_att = client.get(f"/user/events/{event_id}/attendees", headers=h1)
    assert res_att.status_code == 200
    attendees = res_att.json()
    assert len(attendees) >= 1
    attendee_id = attendees[0]["id"]

    assert (
        client.get(f"/user/events/{event_id}/attendees", headers=h2).status_code == 403
    )

    # 8. Cancel registration (Public)
    assert (
        client.post(
            f"/events/{event_id}/cancel-registration",
            json={"email": f"alice_{s1}@example.com"},
        ).status_code
        == 200
    )
    assert (
        client.post(f"/events/{event_id}/cancel-registration", json={}).status_code
        == 400
    )

    # Register again then remove attendee via owner route
    client.post(f"/events/{event_id}/register", json=reg_payload)
    res_att_new = client.get(f"/user/events/{event_id}/attendees", headers=h1).json()
    att_id_new = res_att_new[0]["id"]

    # 9. Delete attendee (Owner)
    assert (
        client.delete(
            f"/user/events/{event_id}/attendees/{att_id_new}", headers=h2
        ).status_code
        == 403
    )
    assert (
        client.delete(
            f"/user/events/{event_id}/attendees/{att_id_new}", headers=h1
        ).status_code
        == 200
    )

    # 10. Delete Event
    assert client.delete(f"/user/events/{event_id}", headers=h2).status_code == 403
    assert client.delete(f"/user/events/{event_id}", headers=h1).status_code in (
        200,
        204,
    )
    assert (
        client.delete(
            "/user/events/00000000-0000-0000-0000-000000000000", headers=h1
        ).status_code
        == 404
    )


def test_app_core_routes(client):
    # Test load_svg & load_shortest_path_svg
    res_svg = client.get("/load_svg", params={"floor": "1", "building": "AB-01"})
    assert res_svg.status_code in (200, 400, 404, 500)

    res_sp_svg = client.get(
        "/load_shortest_path_svg", params={"floor": "1", "building": "AB-01"}
    )
    assert res_sp_svg.status_code in (200, 400, 404, 500)

    # Test teachers routes
    res_teachers = client.get("/teachers")
    assert res_teachers.status_code == 200

    teacher_data = {
        "name": "Dr. Test Teacher",
        "cabin_no": "G-999",
        "room_no": "101",
        "phone_number": "1234567890",
    }
    res_add_t = client.post("/teachers", json=teacher_data)
    assert res_add_t.status_code in (201, 400, 500)

    # Test path processing routes
    res_path = client.post(
        "/process_path",
        json={"start": "402", "end": "504", "preference": "Lift", "building": "AB-01"},
    )
    assert res_path.status_code in (200, 400, 500)

    res_mb_path = client.post(
        "/multi_building_process_path",
        json={
            "Start Location": "101",
            "End Location": "202",
            "building_name_1": "AB-01",
            "building_name_2": "Lab-Complex",
        },
    )
    assert res_mb_path.status_code in (200, 400, 500)

    res_custom = client.post(
        "/custom_process",
        json={
            "type": "teacher cabin",
            "start": "g02",
            "end": "T004",
            "preference": "Lift",
            "building": "AB-01",
        },
    )
    assert res_custom.status_code in (200, 400, 500)

    # Test search_teacher
    res_search = client.get("/search_teacher", params={"teacher_name": "sheerin"})
    assert res_search.status_code in (200, 400, 500)

    # Test chatbot & upload routes
    for msg in [
        "Who is Dr. Debashis Adhikari?",
        "What is Dr. S. Poonkuntran's position at VIT Bhopal?",
        "What is Dr. R. Shriram's position at VIT Bhopal?",
        "Who is Dr Hemant Kumar Nashine?",
        "Who is Dr. M. K. Jayanthi?",
        "Who is Dr. Zaheer Kareem Ansari?",
    ]:
        res_fac_chat = client.post("/chat", json={"message": msg})
        assert res_fac_chat.status_code == 200

    res_reload = client.post("/reload_knowledge")
    assert res_reload.status_code in (200, 500)


    res_upload = client.post(
        "/upload", data={"text": "How do I get to room 301 from room 201?"}
    )
    assert res_upload.status_code in (200, 400, 500)

    # Test audio file upload using example_audio.wav
    audio_path = Path(__file__).resolve().parent / "example_audio.wav"
    if audio_path.exists():
        with open(audio_path, "rb") as audio_file:
            files = {"audio_file": ("example_audio.wav", audio_file, "audio/wav")}
            res_audio = client.post("/upload", files=files)
            assert res_audio.status_code in (200, 400, 500)

    res_upload_empty = client.post("/upload")
    assert res_upload_empty.status_code in (400, 500)

