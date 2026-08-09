import sys
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from datetime import datetime

# Ensure server directory is in sys.path
server_dir = Path(__file__).resolve().parent.parent
if str(server_dir) not in sys.path:
    sys.path.insert(0, str(server_dir))

from app import app

log_dir = Path(__file__).resolve().parent


def log_test_interaction(
    filename: str,
    method: str,
    url: str,
    status_code: int,
    req_data=None,
    res_data=None,
):
    filepath = log_dir / filename
    timestamp = datetime.now().isoformat()
    with open(filepath, "a", encoding="utf-8") as f:
        f.write(f"\n{'=' * 60}\n")
        f.write(f"TIMESTAMP   : {timestamp}\n")
        f.write(f"TESTED ROUTE: {method.upper()} {url}\n")
        if req_data is not None:
            try:
                f.write(f"REQUEST DATA:\n{json.dumps(req_data, indent=2)}\n")
            except Exception:
                f.write(f"REQUEST DATA:\n{req_data}\n")
        else:
            f.write("REQUEST DATA: None\n")
        f.write(f"STATUS CODE : {status_code}\n")
        if res_data is not None:
            try:
                f.write(f"RESPONSE:\n{json.dumps(res_data, indent=2)}\n")
            except Exception:
                f.write(f"RESPONSE:\n{res_data}\n")
        f.write(f"{'=' * 60}\n")


class LoggingTestClient:
    def __init__(self, client: TestClient, log_filename: str = "api_test_log.txt"):
        self._client = client
        self.log_filename = log_filename
        # Truncate log file at fixture init
        filepath = log_dir / self.log_filename
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"=== TEST SUITE LOG: {log_filename} ===\n")

    def request(self, method: str, url: str, **kwargs):
        req_data = (
            kwargs.get("json")
            if "json" in kwargs
            else (kwargs.get("data") if "data" in kwargs else kwargs.get("params"))
        )
        response = self._client.request(method, url, **kwargs)
        try:
            res_data = response.json()
        except Exception:
            res_data = response.text
        log_test_interaction(
            self.log_filename,
            method,
            url,
            response.status_code,
            req_data,
            res_data,
        )
        return response

    def get(self, url: str, **kwargs):
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs):
        return self.request("POST", url, **kwargs)

    def put(self, url: str, **kwargs):
        return self.request("PUT", url, **kwargs)

    def delete(self, url: str, **kwargs):
        return self.request("DELETE", url, **kwargs)


@pytest.fixture
def client(request):
    stem = request.path.stem if hasattr(request, "path") else "test_suite"
    log_filename = f"{stem}_log.txt"
    with TestClient(app) as test_client:
        yield LoggingTestClient(test_client, log_filename)


@pytest.fixture
def auth_headers(client):
    test_user = {
        "username": "pytest_user_auth",
        "password": "TestPassword123!",
        "email": "pytest_user_auth@example.com",
    }
    client.post("/user/register", json=test_user)
    response = client.post(
        "/user/login",
        json={"username": test_user["username"], "password": test_user["password"]},
    )
    token = response.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}
