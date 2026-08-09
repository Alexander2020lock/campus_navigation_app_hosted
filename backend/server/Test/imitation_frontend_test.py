import json
import os
import requests
import sounddevice as sd
import numpy as np
import wave
import webbrowser
from test_api import BASE_URL


def record_audio(file_name, record_seconds, sample_rate=44100, channels=1):
    print("Recording...")

    audio_data = sd.rec(
        int(record_seconds * sample_rate),
        samplerate=sample_rate,
        channels=channels,
        dtype=np.int16,
    )
    sd.wait()
    print("Recording complete.")

    with wave.open(file_name, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_data.tobytes())

    print(f"Audio saved as {file_name }")


def upload_file_to_api(api_url, file_path):
    with open(file_path, "rb") as file:
        files = {"audio_file": file}
        try:
            response = requests.post(api_url, files=files)

            if response.status_code == 200:
                print("File uploaded successfully!")
                try:
                    # Try parsing as JSON first
                    json_response = response.json()
                    print("Server Response (JSON):", json_response)
                    open_in_browser(json_response)
                except json.JSONDecodeError:
                    # If not JSON, treat as SVG content
                    print("Server Response (SVG content received)")
                    output_svg = "output.svg"
                    with open(output_svg, "w") as svg_file:
                        svg_file.write(response.text)
                    print(f"SVG saved as {output_svg}")
                    webbrowser.open(f"file://{os.path.abspath(output_svg)}")
            else:
                print(f"Failed to upload file. Status Code: {response.status_code}")
                print("Server Response:", response.text)

        except requests.exceptions.RequestException as e:
            print(f"An error occurred: {e}")


def open_in_browser(response):
    svg_content = response["files"]

    print(f"Opening start in the default web browser...")
    webbrowser.open(
        f"{BASE_URL }/{svg_content ['start_floor']}",
    )

    print(f"Opening end in the default web browser...")
    webbrowser.open(
        f"{BASE_URL }/{svg_content ['end_floor']}",
    )


if __name__ == "__main__":
    # record_audio("example_audio.wav", 10)
    api_endpoint = "http://127.0.0.1:5000/upload"
    file_to_upload = "example_audio.wav"
    upload_file_to_api(api_endpoint, file_to_upload)
