import sys
import requests
import json
from tabulate import tabulate
import logging
from datetime import datetime, timedelta

# ============================================================
# CONFIGURATION
# ============================================================

BASE_URL = "http://127.0.0.1:8000"

ACCESS_TOKEN = "YOUR_JWT_TOKEN_HERE"

AUTH_HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
}

LOG_FILE = "client_api_log.txt"


def ensure_authenticated():
    global ACCESS_TOKEN, AUTH_HEADERS
    endpoint_login = f"{BASE_URL}/user/login"
    endpoint_register = f"{BASE_URL}/user/register"

    test_user = {
        "username": "event_demo_user",
        "password": "TestPassword123!",
        "email": "event_demo_user@example.com",
    }

    try:
        response = requests.post(
            endpoint_login,
            json={
                "username": test_user["username"],
                "password": test_user["password"],
            },
        )
        if response.status_code != 200:
            requests.post(endpoint_register, json=test_user)
            response = requests.post(
                endpoint_login,
                json={
                    "username": test_user["username"],
                    "password": test_user["password"],
                },
            )

        if response.status_code == 200:
            token = response.json().get("access_token")
            if token:
                ACCESS_TOKEN = token
                AUTH_HEADERS["Authorization"] = f"Bearer {ACCESS_TOKEN}"
                print(
                    f"Successfully authenticated test user: {test_user['username']}"
                )
                return True
    except Exception as e:
        print(f"Authentication setup warning: {e}")
    return False



# ============================================================
# LOGGER
# ============================================================


def setup_client_logger():
    logger = logging.getLogger("client_api")

    if logger.hasHandlers():
        logger.handlers.clear()

    file_handler = logging.FileHandler(LOG_FILE, mode="w")
    file_handler.setLevel(logging.INFO)

    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    logger.setLevel(logging.INFO)

    return logger


client_logger = setup_client_logger()


# ============================================================
# LOGGING HELPERS
# ============================================================


def log_api_interaction(
    method,
    endpoint,
    request_data=None,
    response=None,
    error=None,
):
    timestamp = datetime.now().isoformat()

    log_entry = f"\n===== API INTERACTION: {timestamp} =====\n"

    log_entry += f"METHOD: {method}\n"
    log_entry += f"ENDPOINT: {endpoint}\n"

    if request_data is not None:
        log_entry += f"REQUEST DATA:\n{json.dumps(request_data, indent=2)}\n"

    if response is not None:
        log_entry += f"STATUS CODE: {response.status_code}\n"

        try:
            if response.text:
                log_entry += (
                    f"RESPONSE DATA:\n{json.dumps(response.json(), indent=2)}\n"
                )
        except json.JSONDecodeError:
            log_entry += f"RESPONSE (non-JSON):\n{response.text}\n"

    if error is not None:
        log_entry += f"ERROR: {str(error)}\n"

    log_entry += "=" * 50 + "\n"

    client_logger.info(log_entry)


def print_response(response):
    print(f"Status Code: {response.status_code}")

    try:
        if response.status_code != 204:
            print(json.dumps(response.json(), indent=2))
    except json.JSONDecodeError:
        print("Non-JSON response received.")

    print("-" * 50)


# ============================================================
# 1. PUBLIC: LIST ALL EVENTS
# GET /events/
#
# This is NOT part of user_events_router.
# It belongs to the public events router.
# ============================================================


def list_events():
    endpoint = f"{BASE_URL}/events/"

    print("\n=== LISTING ALL EVENTS ===")

    try:
        response = requests.get(endpoint)

        log_api_interaction(
            "GET",
            endpoint,
            response=response,
        )

        if response.status_code == 200:
            events = response.json()

            if not events:
                print("\n=== NO EVENTS FOUND ===")
                return []

            headers = [
                "ID",
                "Title",
                "Date",
                "Time",
                "Location",
                "Capacity",
                "Registered",
            ]

            data = []

            for event in events:
                event_id = str(event.get("id", ""))

                data.append(
                    [
                        event_id[:8] + "..." if len(event_id) > 8 else event_id,
                        event.get("title"),
                        event.get("date"),
                        event.get("time"),
                        event.get("location"),
                        event.get("capacity"),
                        event.get("registered", 0),
                    ]
                )

            print("\n=== EVENTS ===")
            print(tabulate(data, headers=headers, tablefmt="grid"))

            return events

        print_response(response)
        return None

    except Exception as e:
        log_api_interaction(
            "GET",
            endpoint,
            error=e,
        )

        print(f"Error: {str(e)}")
        return None


# ============================================================
# 2. USER: CREATE EVENT
# POST /user/events/
#
# Requires JWT authentication.
#
# The backend does:
#
#     data["user_id"] = current_user_id
#
# Therefore the test MUST NOT send user_id itself.
# ============================================================


def create_event():
    endpoint = f"{BASE_URL}/user/events/"

    # Create a unique title for every test run.
    current_time = datetime.now().strftime("%H:%M:%S")

    # Use a future date instead of the old 2025 date.
    event_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

    event_data = {
        "title": f"Python Workshop at {current_time}",
        "date": event_date,
        "time": "13:00",
        "location": "Tech Hub",
        "capacity": 50,
        "description": ("Learn Python programming fundamentals and best practices."),
    }

    print("\n=== CREATING EVENT ===")
    print(json.dumps(event_data, indent=2))

    try:
        response = requests.post(
            endpoint,
            json=event_data,
            headers=AUTH_HEADERS,
        )

        log_api_interaction(
            "POST",
            endpoint,
            request_data=event_data,
            response=response,
        )

        print_response(response)

        if response.status_code not in (200, 201):
            return None

        result = response.json()

        # create_user_event() calls:
        #
        #     result, status_code = create_event(data)
        #     return JSONResponse(content=result, ...)
        #
        # So normally result should be a single event object,
        # not a list.

        if isinstance(result, dict):
            event_id = result.get("id")

            if event_id:
                print(f"Created event ID: {event_id}")
                return event_id

        print("No event ID found in create response.")
        return None

    except Exception as e:
        log_api_interaction(
            "POST",
            endpoint,
            request_data=event_data,
            error=e,
        )

        print(f"Error: {str(e)}")
        return None


# ============================================================
# 3. USER: LIST OWN EVENTS
# GET /user/events/
#
# Requires JWT authentication.
# ============================================================


def list_user_events():
    endpoint = f"{BASE_URL}/user/events/"

    print("\n=== LISTING USER'S EVENTS ===")

    try:
        response = requests.get(
            endpoint,
            headers=AUTH_HEADERS,
        )

        log_api_interaction(
            "GET",
            endpoint,
            response=response,
        )

        print_response(response)

        if response.status_code == 200:
            return response.json()

        return None

    except Exception as e:
        log_api_interaction(
            "GET",
            endpoint,
            error=e,
        )

        print(f"Error: {str(e)}")
        return None


# ============================================================
# 4. USER: GET EVENT DETAILS
# GET /user/events/{event_id}
#
# Requires JWT authentication.
#
# The backend also verifies that the event belongs to
# the authenticated user.
# ============================================================


def get_event_details(event_id):
    endpoint = f"{BASE_URL}/user/events/{event_id}"

    print(f"\n=== USER EVENT DETAILS (ID: {event_id}) ===")

    try:
        response = requests.get(
            endpoint,
            headers=AUTH_HEADERS,
        )

        log_api_interaction(
            "GET",
            endpoint,
            response=response,
        )

        print_response(response)

        if response.status_code == 200:
            return response.json()

        return None

    except Exception as e:
        log_api_interaction(
            "GET",
            endpoint,
            error=e,
        )

        print(f"Error: {str(e)}")
        return None


# ============================================================
# 5. USER: UPDATE EVENT
# PUT /user/events/{event_id}
#
# Requires JWT authentication.
#
# The backend verifies ownership before updating.
# ============================================================


def update_event(event_id):
    endpoint = f"{BASE_URL}/user/events/{event_id}"

    update_data = {
        "title": "Advanced Python Workshop",
        "capacity": 75,
        "description": (
            "Deep dive into advanced Python concepts and real-world applications."
        ),
    }

    print(f"\n=== UPDATING EVENT (ID: {event_id}) ===")

    print(json.dumps(update_data, indent=2))

    try:
        response = requests.put(
            endpoint,
            json=update_data,
            headers=AUTH_HEADERS,
        )

        log_api_interaction(
            "PUT",
            endpoint,
            request_data=update_data,
            response=response,
        )

        print_response(response)

        return response.status_code == 200

    except Exception as e:
        log_api_interaction(
            "PUT",
            endpoint,
            request_data=update_data,
            error=e,
        )

        print(f"Error: {str(e)}")
        return False


# ============================================================
# 6. PUBLIC: REGISTER FOR EVENT
# POST /events/{event_id}/register
#
# IMPORTANT:
#
# This route is NOT:
#
#     /user/events/{event_id}/register
#
# It belongs to the public events router.
#
# No JWT is added here because the router you showed earlier
# does not use Depends(get_current_user).
# ============================================================


def register_for_event(event_id):
    endpoint = f"{BASE_URL}/events/{event_id}/register"

    registration_data = {
        "attendee_name": "Jane Smith",
        "attendee_email": f"jane.smith_{datetime.now().strftime('%H%M%S')}@example.com",
    }

    print(f"\n=== REGISTERING FOR EVENT (ID: {event_id}) ===")

    print(json.dumps(registration_data, indent=2))


    try:
        response = requests.post(
            endpoint,
            json=registration_data,
        )

        log_api_interaction(
            "POST",
            endpoint,
            request_data=registration_data,
            response=response,
        )

        print_response(response)

        first_registration_success = response.status_code == 201

        # Test duplicate registration.
        print("\n=== REGISTERING AGAIN WITH SAME EMAIL (should fail) ===")

        response2 = requests.post(
            endpoint,
            json=registration_data,
        )

        log_api_interaction(
            "POST",
            endpoint,
            request_data=registration_data,
            response=response2,
        )

        print_response(response2)

        duplicate_registration_failed = response2.status_code not in (200, 201)

        return first_registration_success and duplicate_registration_failed

    except Exception as e:
        log_api_interaction(
            "POST",
            endpoint,
            request_data=registration_data,
            error=e,
        )

        print(f"Error: {str(e)}")
        return False


# ============================================================
# 7. USER: GET EVENT ATTENDEES
# GET /user/events/{event_id}/attendees
#
# Requires JWT authentication.
#
# The old test used:
#
#     /{event_id}/attendees
#
# which was incorrect.
# ============================================================


def get_event_registrations(event_id):
    endpoint = f"{BASE_URL}/user/events/{event_id}/attendees"

    print(f"\n=== EVENT REGISTRATIONS (ID: {event_id}) ===")

    try:
        response = requests.get(
            endpoint,
            headers=AUTH_HEADERS,
        )

        log_api_interaction(
            "GET",
            endpoint,
            response=response,
        )

        print_response(response)

        if response.status_code == 200:
            return response.json()

        return None

    except Exception as e:
        log_api_interaction(
            "GET",
            endpoint,
            error=e,
        )

        print(f"Error: {str(e)}")
        return None


# ============================================================
# 8. USER: DELETE EVENT
# DELETE /user/events/{event_id}
#
# Requires JWT authentication.
# ============================================================


def delete_event(event_id):
    endpoint = f"{BASE_URL}/user/events/{event_id}"

    print(f"\n=== DELETING EVENT (ID: {event_id}) ===")

    try:
        response = requests.delete(
            endpoint,
            headers=AUTH_HEADERS,
        )

        log_api_interaction(
            "DELETE",
            endpoint,
            response=response,
        )

        print_response(response)

        return response.status_code in (200, 204)

    except Exception as e:
        log_api_interaction(
            "DELETE",
            endpoint,
            error=e,
        )

        print(f"Error: {str(e)}")
        return False


# ============================================================
# DEMO / INTEGRATION TEST FLOW
# ============================================================


def run_demo():
    client_logger.info("\n\n========== STARTING NEW DEMO RUN ==========")

    client_logger.info(f"TIMESTAMP: {datetime.now().isoformat()}")

    ensure_authenticated()

    test_results = {}

    try:
        # ----------------------------------------------------
        # Test 1: Public list
        # GET /events/
        # ----------------------------------------------------

        initial_events = list_events()

        test_results["list_events_initial"] = (
            "Success" if initial_events is not None else "Failed"
        )

        # ----------------------------------------------------
        # Test 2: User list
        # GET /user/events/
        # ----------------------------------------------------

        user_events_before = list_user_events()

        test_results["list_user_events_before"] = (
            "Success" if user_events_before is not None else "Failed"
        )

        # ----------------------------------------------------
        # Test 3: Create
        # POST /user/events/
        # ----------------------------------------------------

        event_id = create_event()

        if event_id is None:
            print("\nFailed to create event.")

            test_results["create_event"] = "Failed"

        else:
            test_results["create_event"] = f"Created event {event_id}"

            # ------------------------------------------------
            # Test 4: User list after creation
            # GET /user/events/
            # ------------------------------------------------

            user_events_after_create = list_user_events()

            test_results["list_user_events_after_create"] = (
                "Success" if user_events_after_create is not None else "Failed"
            )

            # ------------------------------------------------
            # Test 5: Get event
            # GET /user/events/{id}
            # ------------------------------------------------

            event_details = get_event_details(event_id)

            test_results["get_event_details"] = (
                "Success" if event_details is not None else "Failed"
            )

            # ------------------------------------------------
            # Test 6: Update
            # PUT /user/events/{id}
            # ------------------------------------------------

            updated = update_event(event_id)

            test_results["update_event"] = "Success" if updated else "Failed"

            # ------------------------------------------------
            # Test 7: Public registration
            # POST /events/{id}/register
            # ------------------------------------------------

            registered = register_for_event(event_id)

            test_results["register_for_event"] = "Success" if registered else "Failed"

            # ------------------------------------------------
            # Test 8: Owner views attendees
            # GET /user/events/{id}/attendees
            # ------------------------------------------------

            registrations = get_event_registrations(event_id)

            test_results["get_event_registrations"] = (
                "Success" if registrations is not None else "Failed"
            )

            # ------------------------------------------------
            # Test 9: Public events after modifications
            # GET /events/
            # ------------------------------------------------

            events_after_tests = list_events()

            test_results["list_events_after_tests"] = (
                "Success" if events_after_tests is not None else "Failed"
            )

            # ------------------------------------------------
            # Test 10: Delete
            # DELETE /user/events/{id}
            # ------------------------------------------------

            deleted = delete_event(event_id)

            test_results["delete_event"] = "Success" if deleted else "Failed"

        # ----------------------------------------------------
        # Test 11: Final public list
        # GET /events/
        # ----------------------------------------------------

        final_events = list_events()

        test_results["list_events_final"] = (
            "Success" if final_events is not None else "Failed"
        )

    except requests.exceptions.ConnectionError:
        error_msg = (
            "Could not connect to the API. "
            "Make sure the FastAPI/Uvicorn server is running."
        )

        print(error_msg)
        client_logger.error(error_msg)

    except Exception as e:
        error_msg = f"Error during demo: {str(e)}"

        print(error_msg)
        client_logger.error(error_msg)

    # ========================================================
    # SUMMARY
    # ========================================================

    summary = "\n========== TEST SUMMARY ==========\n" + json.dumps(
        test_results, indent=2
    )

    print(summary)
    client_logger.info(summary)
    return test_results


def test_event_management_pytest(client, auth_headers):

    # 1. Public list
    res = client.get("/events/")
    assert res.status_code == 200

    # 2. User list
    res = client.get("/user/events/", headers=auth_headers)
    assert res.status_code == 200

    # 3. Create event
    event_data = {
        "title": "Pytest Event",
        "date": (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d"),
        "time": "12:00",
        "location": "Pytest Room",
        "capacity": 20,
        "description": "Created during pytest test run.",
    }
    res = client.post("/user/events/", json=event_data, headers=auth_headers)
    assert res.status_code in (200, 201)
    created_event = res.json()
    event_id = created_event.get("id")
    assert event_id is not None

    # 4. Get event details
    res = client.get(f"/user/events/{event_id}", headers=auth_headers)
    assert res.status_code == 200

    # 5. Update event
    res = client.put(
        f"/user/events/{event_id}",
        json={"title": "Updated Pytest Event"},
        headers=auth_headers,
    )
    assert res.status_code == 200

    # 6. Register for event
    reg_data = {
        "attendee_name": "Test Attendee",
        "attendee_email": f"attendee_{datetime.now().strftime('%H%M%S')}@example.com",
    }
    res = client.post(f"/events/{event_id}/register", json=reg_data)
    assert res.status_code == 201

    # 7. Get attendees
    res = client.get(f"/user/events/{event_id}/attendees", headers=auth_headers)
    assert res.status_code == 200
    attendees = res.json()
    assert len(attendees) >= 1

    # 8. Delete event
    res = client.delete(f"/user/events/{event_id}", headers=auth_headers)
    assert res.status_code in (200, 204)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    print("=== Event Management System API Demo ===")
    print("Make sure the FastAPI/Uvicorn server is running before continuing.")

    if "--interactive" in sys.argv:
        try:
            input("Press Enter to start the demo...")
        except (EOFError, KeyboardInterrupt):
            pass

    run_demo()


