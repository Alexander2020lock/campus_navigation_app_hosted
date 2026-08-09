from pathlib import Path
from dotenv import load_dotenv
import os

server_dir = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=server_dir / ".env")
load_dotenv()


def resolve_path(val) -> Path:
    if not val:
        return server_dir
    p = Path(val)
    if not p.is_absolute():
        return (server_dir / p).resolve()
    return p.resolve()


env_variables = {
    "db_path": resolve_path(os.getenv("DB_PATH")),
    "event_db": resolve_path(os.getenv("DB_EVENT")),
    "floor_map": resolve_path(os.getenv("FLOOR_MAPS_DIR")),
    "output_map": resolve_path(os.getenv("OUTPUT_MAPS_DIR")),
    "user_db_path": resolve_path(os.getenv("DB_AUTH_PATH")),
    "teacher_data": resolve_path(os.getenv("EXCEL_TEACHER_PATH")),
    "image_assets": resolve_path(os.getenv("ASSETS_DIR")),
    "audio_path": resolve_path(os.getenv("AUDIO_DIR")),
    "teacher_des": resolve_path(os.getenv("DB_TEACHER_DATA")),
    "hf_api_key": str(os.getenv("HUGGING_FACE_API_KEY")),
    "gemini_api_key": str(os.getenv("GEMINI_API_KEY") or os.getenv("GROQ_API_KEY")),
}


