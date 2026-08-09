import os
import httpx
import asyncio
import logging
import json

# Remove existing log file if present and create a new one
log_file = "api_test_log_events.txt"
try:
    os.remove(log_file)
except FileNotFoundError:
    print(f"File {log_file} doesn't exist yet.")
    os.open(log_file, os.O_CREAT)

# Configure block-style logging
logging.basicConfig(filename=log_file, level=logging.INFO, format="%(message)s")

BASE_URL = "http://127.0.0.1:8000"

# Sample data for tests
sample_user = {
    "username": "testuser_async",
    "password": "Test@1234",
    "email": "testuser_async@example.com",
}

# Sample event data; adjust keys as required by your model
sample_event = {
    "title": "Async Test Event",
    "description": "An event created using async tests",
    "date": "2025-05-01",  # Assuming your model requires a date field
    "time": "10:00",  # Assuming a time field is required
    "capacity": 100,
    "location": "Async City",
    "start_time": "2025-05-01T10:00:00",
    "end_time": "2025-05-01T12:00:00",
}


def format_log_block(endpoint, method, status, success, response):
    block = (
        f"\n{'=' * 60}\n"
        f"Method     : {method}\n"
        f"Route      : {endpoint}\n"
        f"Status     : {status}\n"
        f"Success    : {success}\n"
        f"Response   : {json.dumps(response, indent=2)}\n"
        f"{'=' * 60}\n"
    )
    logging.info(block)


# ================================
# User routes
# ================================
async def helper_register_user(client):
    endpoint = f"{BASE_URL}/user/register"
    res = await client.post(endpoint, json=sample_user)
    format_log_block(endpoint, "POST", res.status_code, res.is_success, res.json())


async def helper_delete_user_profile(client, token: str):
    endpoint = f"{BASE_URL}/user/profile"
    headers = {"Authorization": f"Bearer {token}"}
    res = await client.delete(endpoint, headers=headers)
    format_log_block(endpoint, "DELETE", res.status_code, res.is_success, res.json())
    return res


async def helper_login_user(client):
    endpoint = f"{BASE_URL}/user/login"
    res = await client.post(
        endpoint,
        json={"username": sample_user["username"], "password": sample_user["password"]},
    )
    if not res.is_success:
        # Fallback in case password was previously updated
        res = await client.post(
            endpoint,
            json={"username": sample_user["username"], "password": "NewTest@1234"},
        )
        if res.is_success:
            # Reset password back to sample_user password
            token = res.json().get("access_token")
            await client.put(
                f"{BASE_URL}/user/password",
                json={"current_password": "NewTest@1234", "new_password": sample_user["password"]},
                headers={"Authorization": f"Bearer {token}"},
            )
    format_log_block(endpoint, "POST", res.status_code, res.is_success, res.json())
    return res.json().get("access_token") if res.is_success else None


async def helper_get_profile(client, token: str):
    endpoint = f"{BASE_URL}/user/profile"
    res = await client.get(endpoint, headers={"Authorization": f"Bearer {token}"})
    format_log_block(endpoint, "GET", res.status_code, res.is_success, res.json())


async def helper_update_profile(client, token: str):
    endpoint = f"{BASE_URL}/user/profile"
    data = {"title": "Dr.", "position": "Async Developer"}
    res = await client.put(
        endpoint, json=data, headers={"Authorization": f"Bearer {token}"}
    )
    format_log_block(endpoint, "PUT", res.status_code, res.is_success, res.json())


async def helper_update_user_password(client, token: str):
    endpoint = f"{BASE_URL}/user/password"
    data = {"current_password": sample_user["password"], "new_password": "NewTest@1234"}
    res = await client.put(
        endpoint, json=data, headers={"Authorization": f"Bearer {token}"}
    )
    format_log_block(endpoint, "PUT", res.status_code, res.is_success, res.json())


async def helper_login_history(client, token: str):
    endpoint = f"{BASE_URL}/user/login-history"
    res = await client.get(endpoint, headers={"Authorization": f"Bearer {token}"})
    format_log_block(endpoint, "GET", res.status_code, res.is_success, res.json())


# ================================
# User events routes (authenticated)
# ================================
async def helper_create_event(client, token: str):
    endpoint = f"{BASE_URL}/user/events/"
    res = await client.post(
        endpoint, json=sample_event, headers={"Authorization": f"Bearer {token}"}
    )
    format_log_block(endpoint, "POST", res.status_code, res.is_success, res.json())
    return res.json().get("id")


async def helper_list_user_events(client, token: str):
    endpoint = f"{BASE_URL}/user/events/"
    res = await client.get(endpoint, headers={"Authorization": f"Bearer {token}"})
    format_log_block(endpoint, "GET", res.status_code, res.is_success, res.json())


async def helper_get_user_event(client, token: str, event_id: str):
    endpoint = f"{BASE_URL}/user/events/{event_id}"
    res = await client.get(endpoint, headers={"Authorization": f"Bearer {token}"})
    format_log_block(endpoint, "GET", res.status_code, res.is_success, res.json())


async def helper_update_user_event(client, token: str, event_id: str):
    endpoint = f"{BASE_URL}/user/events/{event_id}"
    update_data = {"description": "Updated async event description"}
    res = await client.put(
        endpoint, json=update_data, headers={"Authorization": f"Bearer {token}"}
    )
    format_log_block(endpoint, "PUT", res.status_code, res.is_success, res.json())


async def helper_delete_user_event(client, token: str, event_id: str):
    endpoint = f"{BASE_URL}/user/events/{event_id}"
    res = await client.delete(endpoint, headers={"Authorization": f"Bearer {token}"})
    format_log_block(endpoint, "DELETE", res.status_code, res.is_success, res.json())


async def helper_get_event_attendees(client, token: str, event_id: str):
    endpoint = f"{BASE_URL}/user/events/{event_id}/attendees"
    res = await client.get(endpoint, headers={"Authorization": f"Bearer {token}"})
    format_log_block(endpoint, "GET", res.status_code, res.is_success, res.json())


# ================================
# Public events routes
# ================================
async def helper_public_event_list(client):
    endpoint = f"{BASE_URL}/events/"
    res = await client.get(endpoint)
    format_log_block(endpoint, "GET", res.status_code, res.is_success, res.json())


async def helper_get_public_event_detail(client, event_id: str):
    endpoint = f"{BASE_URL}/events/{event_id}"
    res = await client.get(endpoint)
    format_log_block(endpoint, "GET", res.status_code, res.is_success, res.json())


async def helper_register_for_event(client, event_id: str):
    endpoint = f"{BASE_URL}/events/{event_id}/register"
    registration_data = {
        "attendee_name": "John Doe",
        "attendee_email": f"john.doe_{os.urandom(4).hex()}@example.com",
    }
    res = await client.post(endpoint, json=registration_data)
    format_log_block(endpoint, "POST", res.status_code, res.is_success, res.json())


# ================================
# Utility: Safe call to catch any exceptions
# ================================
async def safe_call(label, coro):
    try:
        await coro
    except Exception as e:
        logging.error(f"\n{'!' * 60}\n[ERROR] {label} failed: {e}\n{'!' * 60}\n")


# ================================
# Run all tests sequentially and in parallel where appropriate
# ================================
async def run_all_tests():
    async with httpx.AsyncClient(timeout=10.0) as client:
        await safe_call("Register User", helper_register_user(client))
        token = await helper_login_user(client)

        if token:
            await asyncio.gather(
                safe_call("Get Profile", helper_get_profile(client, token)),
                safe_call("Update Profile", helper_update_profile(client, token)),
                safe_call("Login History", helper_login_history(client, token)),
            )

            await safe_call("Update Password", helper_update_user_password(client, token))

            event_id = await helper_create_event(client, token)
            if event_id:
                await asyncio.gather(
                    safe_call(
                        "Get Public Event Detail",
                        helper_get_public_event_detail(client, event_id),
                    ),
                    safe_call(
                        "Register for Event (Public)",
                        helper_register_for_event(client, event_id),
                    ),
                )
                await asyncio.gather(
                    safe_call("List User Events", helper_list_user_events(client, token)),
                    safe_call(
                        "Get Specific User Event",
                        helper_get_user_event(client, token, event_id),
                    ),
                    safe_call(
                        "Update User Event",
                        helper_update_user_event(client, token, event_id),
                    ),
                    safe_call(
                        "Get Event Attendees",
                        helper_get_event_attendees(client, token, event_id),
                    ),
                )
                await safe_call(
                    "Delete User Event", helper_delete_user_event(client, token, event_id)
                )

        await safe_call("Public Events List", helper_public_event_list(client))
        await safe_call("Delete User Profile", helper_delete_user_profile(client, token))


def test_new_event_pytest_entry(client):
    res = client.post("/user/register", json=sample_user)
    res_login = client.post(
        "/user/login",
        json={"username": sample_user["username"], "password": sample_user["password"]},
    )
    if not res_login.is_success:
        res_login = client.post(
            "/user/login",
            json={"username": sample_user["username"], "password": "NewTest@1234"},
        )
    assert res_login.is_success
    token = res_login.json().get("access_token")
    assert token is not None

    res_event = client.post(
        "/user/events/",
        json=sample_event,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_event.is_success
    event_id = res_event.json().get("id")
    assert event_id is not None

    res_reg = client.post(
        f"/events/{event_id}/register",
        json={
            "attendee_name": "Async John",
            "attendee_email": f"john_async_{os.urandom(3).hex()}@example.com",
        },
    )
    assert res_reg.status_code == 201

    res_del = client.delete(
        f"/user/events/{event_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert res_del.status_code in (200, 204)


if __name__ == "__main__":
    asyncio.run(run_all_tests())

