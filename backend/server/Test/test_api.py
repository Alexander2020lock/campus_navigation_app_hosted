import requests
import json
import os
import webbrowser

BASE_URL = "http://127.0.0.1:8000"
# BASE_URL = "https://projecct-expo-backend-group-90-production.up.railway.app"
# BASE_URL = "https://bits-covering-wt-carlo.trycloudflare.com"


def log_response(method, endpoint, params=None, json_data=None, output=""):
    with open("api_test_log.txt", "a") as log_file:
        log_file.write(f"\nTesting {method} {endpoint}")
        if params:
            log_file.write(f"\nParameters: {json.dumps(params, indent=4)}")
        if json_data:
            log_file.write(f"\nRequest Body: {json.dumps(json_data, indent=4)}")
        log_file.write(f"\n{output}\n")


def run_test_load_svg(floor):
    response = requests.get(
        f"{BASE_URL}/load_svg", params={"floor": floor, "building": "AB-01"}
    )
    log_response(
        "GET",
        "/load_svg",
        params={"floor": floor, "building": "AB-01"},
        output=format_response(response),
    )


def run_test_load_shortest_path_svg(floor):
    response = requests.get(
        f"{BASE_URL}/load_shortest_path_svg",
        params={"floor": floor, "building": "AB-01"},
    )
    log_response(
        "GET",
        "/load_shortest_path_svg",
        params={"floor": floor},
        output=format_response(response),
    )


def run_test_process_path(start, end, preference, building):
    data = {"start": start, "end": end, "preference": preference, "building": building}
    response = requests.post(f"{BASE_URL}/process_path", json=data)
    log_response(
        "POST", "/process_path", json_data=data, output=format_response(response)
    )


def run_test_multi_building_process_path(building_name_1, start, building_name_2, end):
    data = {
        "building_name_1": building_name_1,
        "Start Location": start,
        "building_name_2": building_name_2,
        "End Location": end,
    }

    response = requests.post(f"{BASE_URL}/multi_building_process_path", json=data)
    log_response(
        "POST", "/multi_building_process_path", output=format_response(response)
    )

    if response.status_code == 200:
        try:
            files = response.json().get("files", {})
            for building, paths in files.items():
                for path_type, svg_url in paths.items():
                    if not svg_url:
                        continue
                    full_svg_url = f"{BASE_URL}{svg_url}"
                    print(f"Opening SVG for {building} ({path_type}): {full_svg_url}")
                    webbrowser.open(full_svg_url)
        except Exception as e:
            print(f"Error opening SVG files: {str(e)}")


def run_test_process_path_custom(type, start, end, preference, building):
    data = {
        "type": type,
        "start": start,
        "end": end,
        "preference": preference,
        "building": building,
    }
    response = requests.post(f"{BASE_URL}/custom_process", json=data)
    log_response(
        "POST", "/custom_process", json_data=data, output=format_response(response)
    )


def run_test_manage_teachers_post(data):
    response = requests.post(f"{BASE_URL}/teachers", json=data)
    log_response("POST", "/teachers", json_data=data, output=format_response(response))


def run_test_manage_teachers_get(name=None, cabin_no=None, room_no=None):
    params = {
        key: value
        for key, value in [("name", name), ("cabin_no", cabin_no), ("room_no", room_no)]
        if value
    }
    response = requests.get(f"{BASE_URL}/teachers", params=params)
    log_response("GET", "/teachers", params=params, output=format_response(response))


def run_test_search_teacher(teacher_name):
    response = requests.get(
        f"{BASE_URL}/search_teacher", params={"teacher_name": teacher_name}
    )
    log_response(
        "GET",
        "/search_teacher",
        params={"teacher_name": teacher_name},
        output=format_response(response),
    )


def run_test_chatbot(message):
    data = {"message": message}
    response = requests.post(f"{BASE_URL}/chat", json=data)
    log_response("POST", "/chat", params=data, output=format_response(response))


def run_test_text_upload(text):
    form_data = {"text": text}
    response = requests.post(f"{BASE_URL}/upload", data=form_data)
    log_response("POST", "/upload", params=form_data, output=format_response(response))


def run_test_audio_upload(file_path):
    with open(file_path, "rb") as audio_file:
        files = {"audio_file": audio_file}
        response = requests.post(f"{BASE_URL}/upload", files=files)
    log_response(
        "POST",
        "/upload",
        params={"file": file_path},
        output=format_response(response),
    )


def run_test_reload_knowledge():
    response = requests.post(f"{BASE_URL}/reload_knowledge")
    log_response("POST", "/reload_knowledge", output=format_response(response))


def format_response(response):
    output = f"Status Code: {response.status_code}\n"
    try:
        output += "Response JSON:\n" + json.dumps(response.json(), indent=4)
    except ValueError:
        output += "Response Text:\n" + response.text
    return output


def test_api_routes_pytest(client):
    res = client.get("/load_svg", params={"floor": "1", "building": "AB-01"})
    assert res.status_code in (200, 404, 500)

    res = client.get("/teachers")
    assert res.status_code == 200


if __name__ == "__main__":
    try:
        os.remove("api_test_log.txt")
    except FileNotFoundError:
        print("File api_test_log.txt doesn't exist yet.")
        os.open("api_test_log.txt", os.O_CREAT)

    run_test_process_path(start="402", end="504", preference="Lift", building="AB-01")
    run_test_multi_building_process_path("AB-01", "101", "Lab-Complex", "202")
    run_test_load_svg(floor=1)
    run_test_load_shortest_path_svg(floor=2)
    run_test_process_path_custom(
        type="teacher cabin",
        start="g02",
        end="T004",
        preference="Lift",
        building="AB-01",
    )

    run_test_manage_teachers_get(cabin_no="G-02")
    run_test_search_teacher(teacher_name="Dr. Vishal Singh")
    run_test_chatbot("I am Ravi Verma Sirs big fan! What is his position in VIT?")
    run_test_text_upload("How do I get to room 301 from room 201?")
    audio_file_path = os.path.join(os.path.dirname(__file__), "example_audio.wav")
    run_test_audio_upload(audio_file_path)


