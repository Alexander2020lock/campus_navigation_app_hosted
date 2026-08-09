import requests
import json
from Utils.loader import env_variables

api_key = env_variables.get("gemini_api_key", "")
url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}

import os

data = {
    "model": os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
    "messages": [{"role": "user", "content": "Hello!"}],
}





def test_gemini_api():
    if not api_key or api_key == "your_gemini_api_key_here":
        print("Skipping Gemini API call: GEMINI_API_KEY is placeholder")
        return
    response = requests.post(url, headers=headers, json=data)
    print(response.status_code)
    print(response.text)


if __name__ == "__main__":
    test_gemini_api()

