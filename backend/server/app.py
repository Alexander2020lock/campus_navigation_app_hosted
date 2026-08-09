from pathlib import Path
from fastapi import (
    FastAPI,
    HTTPException,
    File,
    Form,
    UploadFile,
    Query,
)
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional

from Utils.loader import env_variables
from Utils.route_utilary import (
    process_path_logic,
    process_multi_building,
    load_svg_logic,
    load_shortest_path_svg_logic,
    add_teacher,
    retrieve_teachers,
    get_room_no_by_cabin,
    InvalidInputError,
    DatabaseError,
)
from Chatbot.audio_to_text import AudioProcessor
from Chatbot.chat_bot import Chatbot
from Events_Management.event_view import events_router
from Events_Management.user_management import users_router
from Events_Management.event_management import user_events_router

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router=events_router, prefix="/events")
app.include_router(router=users_router, prefix="/user")
app.include_router(router=user_events_router)

app.mount(
    "/server/Assets",
    StaticFiles(directory=env_variables["image_assets"]),
    name="assets",
)
app.mount(
    "/Assets",
    StaticFiles(directory=env_variables["image_assets"]),
    name="assets",
)

chatbot = Chatbot()


class PathData(BaseModel):
    start: str
    end: str
    preference: Optional[str] = None
    building: Optional[str] = None


class CustomPathData(BaseModel):
    type: str
    start: str
    end: str
    preference: Optional[str] = None
    building: Optional[str] = None


class MultiBuildingPathData(BaseModel):
    start: str = Field(alias="Start Location")
    end: str = Field(alias="End Location")
    building_name_1: str
    building_name_2: str

    class Config:
        populate_by_name = True


class TeacherData(BaseModel):
    name: str
    cabin_no: str
    room_no: str
    phone_number: Optional[str] = None



class UserRegister(BaseModel):
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class ChatMessage(BaseModel):
    message: str


@app.get("/load_svg")
async def load_svg(floor: str = Query(None), building: str = Query(None)):
    return await load_svg_logic(floor, building)


@app.get("/load_shortest_path_svg")
async def load_shortest_path_svg(floor: str = Query(None), building: str = Query(None)):
    return await load_shortest_path_svg_logic(floor, building)


@app.post("/process_path")
async def process_path(data: PathData):
    response, status_code = await process_path_logic(data.model_dump())
    if status_code != 200:
        raise HTTPException(
            status_code=status_code, detail=response.get("error", "An error occurred")
        )
    return response


@app.post("/multi_building_process_path")
async def multi_building_process_path(data: MultiBuildingPathData):
    response, status_code = await process_multi_building(data.model_dump(by_alias=True))
    if status_code != 200:
        raise HTTPException(
            status_code=status_code, detail=response.get("error", "An error occurred")
        )
    return response


@app.post("/custom_process")
async def custom_process(data: CustomPathData):
    try:
        custom_type = data.type
        custom_start = data.start
        custom_end = data.end
        preference = data.preference
        building_name = data.building

        if not custom_type or not custom_start or not custom_end:
            raise HTTPException(
                status_code=400, detail="Missing required fields: type, start, or end"
            )

        db_path = env_variables["teacher_des"]

        if custom_type.lower() == "teacher cabin":
            try:
                start_room = get_room_no_by_cabin(custom_start, db_path)
                end_room = get_room_no_by_cabin(custom_end, db_path)
                if not start_room:
                    start_room = custom_start
                if not end_room:
                    end_room = custom_end

                converted_data = {
                    "start": start_room,
                    "end": end_room,
                    "preference": preference,
                    "building": building_name,
                }
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

        response, status_code = await process_path_logic(converted_data)
        if status_code != 200:
            raise HTTPException(
                status_code=status_code,
                detail=response.get("error", "An error occurred"),
            )
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@app.get("/teachers")
async def get_teachers(name: str = None, cabin_no: str = None, room_no: str = None):
    try:
        response = await retrieve_teachers(name, cabin_no, room_no)
        return response
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


@app.post("/teachers", status_code=201)
async def create_teacher(data: TeacherData):
    try:
        response = await add_teacher(data.model_dump())
        return response
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")



@app.post("/upload")
async def upload_audio(text: str = Form(None), audio_file: UploadFile = File(None)):
    audio_dir = env_variables.get("audio_path")
    if not audio_dir:
        raise HTTPException(
            status_code=500, detail="AUDIO_DIR environment variable not set"
        )

    audio_dir_path = Path(audio_dir)
    audio_dir_path.mkdir(parents=True, exist_ok=True)

    audio_processor = AudioProcessor()

    if text:
        response = await audio_processor.process(text=text)
    elif audio_file:
        response = await audio_processor.process(audio_file=audio_file)
    else:
        raise HTTPException(
            status_code=400, detail="Either audio file or text input must be provided"
        )

    if isinstance(response, tuple) and len(response) == 2:
        result, status_code = response

        # If result is a FileResponse, return it directly
        if isinstance(result, FileResponse):
            return result

        # Otherwise, return as JSON
        headers = {
            "message": (
                "Text processed successfully"
                if text
                else "Audio file uploaded successfully"
            )
        }
        return JSONResponse(content=result, status_code=status_code, headers=headers)
    elif isinstance(response, dict):
        status_code = 400 if "error" in response else 200
        return JSONResponse(content=response, status_code=status_code)

    return JSONResponse(
        content={"error": "Invalid response format from processor"}, status_code=400
    )



@app.get("/search_teacher")
async def search_teacher(
    teacher_name: str = Query(..., description="Name of the teacher to search"),
):
    try:
        if not teacher_name:
            raise HTTPException(status_code=400, detail="Teacher name is required.")

        audio_processor = AudioProcessor()
        result = audio_processor.get_teacher_details_with_preprocessing(teacher_name)

        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"An unexpected error occurred: {str(e)}"
        )


@app.post("/chat")
async def chat(message: ChatMessage):
    try:
        user_message = message.message
        response = chatbot.respond(user_message)
        return {"response": response, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@app.post("/reload_knowledge")
async def reload_knowledge():
    try:
        chatbot.reload_knowledge_base()
        return {"message": "Knowledge base reloaded successfully", "status": "success"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to reload knowledge base: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)
