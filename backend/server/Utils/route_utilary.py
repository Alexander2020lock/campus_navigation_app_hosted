from sqlite3 import DatabaseError
from fastapi import HTTPException, Depends
from fastapi.responses import FileResponse
import os
import sqlite3

from .building_handling import get_building_paths
from .db_access import add_teacher_to_db, get_teacher_data
from .svg_manipulator import (
    main as make_svg,
    output as output_svg_location,
    floor_svg as floor_svg_location,
    multi_building_nav as make_svg_multi,
)
from .loader import env_variables
from typing import Dict, Any, Optional, Tuple, Union


class InvalidInputError(Exception):
    pass


async def process_path_logic(
    data: Dict[str, Any],
) -> Tuple[Union[Dict[str, Any], FileResponse], int]:
    start = data.get("start")
    end = data.get("end")
    preference = data.get("preference")
    building = data.get("building")

    if not start or not end:
        raise HTTPException(status_code=400, detail="Start and end points are required")
    if start == end:
        raise HTTPException(
            status_code=400, detail="Start and end points cannot be the same"
        )

    try:
        result = make_svg(start, end, building, preference)
        _, _, output_path = get_building_paths(building_name=building)

        if result["error"]:
            raise HTTPException(status_code=500, detail=result["error"])

        if result["complexity"] == "simple":
            floor_no = result["path"][0]
            output_svg = output_svg_location(floor_no, output_path)
            return FileResponse(output_svg, media_type="image/svg+xml"), 200

        elif result["complexity"] == "complex":
            start_floor = result["path"][0][0]
            end_floor = result["path"][1][0]
            return {
                "files": {
                    "start_floor": f"/load_shortest_path_svg?floor={start_floor }&building={building }",
                    "end_floor": f"/load_shortest_path_svg?floor={end_floor }&building={building }",
                }
            }, 200

        raise HTTPException(status_code=500, detail="Unexpected path complexity")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def process_multi_building(data: Dict[str, Any]) -> Dict[str, Any]:
    building_name_1 = data.get("building_name_1")
    building_1_start = data.get("Start Location")
    building_name_2 = data.get("building_name_2")
    building_2_end = data.get("End Location")

    if not building_1_start or not building_2_end:
        raise HTTPException(status_code=400, detail="Start and end points are required")
    if building_1_start == building_2_end and building_name_1 == building_name_2:
        raise HTTPException(
            status_code=400, detail="Start and end points cannot be the same"
        )


    try:
        result = make_svg_multi(
            building_name_1, building_1_start, building_name_2, building_2_end
        )

        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])


        building_1_path = result["path"][building_name_1]
        building_2_path = result["path"][building_name_2]

        response = {"files": {}}

        def process_path(building_name, building_path):
            building_response = response["files"].setdefault(building_name, {})

            if building_path["complexity"] == "simple":
                floor_no = building_path["path"][0]
                building_response["start_floor"] = (
                    f"/load_shortest_path_svg?floor={floor_no }&building={building_name }"
                )

            elif building_path["complexity"] == "complex":
                start_floor = building_path["path"][0][0]
                end_floor = building_path["path"][1][0]
                building_response["start_floor"] = (
                    f"/load_shortest_path_svg?floor={start_floor }&building={building_name }"
                )
                building_response["end_floor"] = (
                    f"/load_shortest_path_svg?floor={end_floor }&building={building_name }"
                )

        process_path(building_name_1, building_1_path)
        process_path(building_name_2, building_2_path)

        return response, 200

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



async def prepare_custom_data(data: Dict[str, Any]) -> Dict[str, Any]:
    custom_type = data.get("type")
    custom_start = data.get("start")
    custom_end = data.get("end")
    preference = data.get("preference")
    building_name = data.get("building")

    if not custom_type or not custom_start or not custom_end:
        raise HTTPException(
            status_code=400, detail="Missing required fields: type, start, or end"
        )

    if custom_type.lower() == "teacher cabin":
        try:
            building_path = get_building_paths(building_name)[0]
            start_room = (
                get_room_no_by_cabin(custom_start, building_path) or custom_start
            )
            end_room = get_room_no_by_cabin(custom_end, building_path) or custom_end

            converted_data = {
                "start": start_room,
                "end": end_room,
                "preference": preference,
                "building": building_name,
            }
            return converted_data
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    converted_data = {
        "start": custom_start,
        "end": custom_end,
        "preference": preference,
        "building": building_name,
    }
    return converted_data


async def load_svg_logic(floor: str, building: str) -> FileResponse:
    if not floor or not building:
        raise HTTPException(
            status_code=400, detail="Floor/Building parameter is required"
        )

    _, floor_map, _ = get_building_paths(building)

    svg_path = floor_svg_location(floor, floor_map)
    if not os.path.exists(svg_path):
        raise HTTPException(
            status_code=404, detail=f"SVG file for floor {floor } not found"
        )

    return FileResponse(svg_path, media_type="image/svg+xml")


async def load_shortest_path_svg_logic(floor: str, building: str) -> FileResponse:
    if not floor:
        raise HTTPException(status_code=400, detail="Floor parameter is required")

    _, _, output = get_building_paths(building)
    svg_path = output_svg_location(floor, output)
    if not os.path.exists(svg_path):
        raise HTTPException(
            status_code=404, detail=f"SVG file for floor {floor } not found"
        )

    return FileResponse(svg_path, media_type="image/svg+xml")


async def add_teacher(data: Dict[str, Any]) -> Dict[str, str]:
    required_fields = ["name", "cabin_no", "room_no", "phone_number"]

    if not data or not all(field in data for field in required_fields):
        raise HTTPException(status_code=400, detail="Missing required fields")

    try:
        db_path = env_variables["teacher_des"]
        add_teacher_to_db(db_path, data)
        return {"message": "Teacher added successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to add teacher: {str (e )}"
        )


async def retrieve_teachers(
    name: Optional[str] = None,
    cabin_no: Optional[str] = None,
    room_no: Optional[str] = None,
) -> Dict[str, Any]:
    try:
        db_path = env_variables["teacher_des"]
        teachers = get_teacher_data(db_path, name, cabin_no, room_no)
        if not teachers:
            raise HTTPException(status_code=404, detail="No teacher found")
        return teachers
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve teachers: {str (e )}"
        )


def format_cabin_no(cabin_no: str) -> str:
    if not cabin_no or len(cabin_no) < 2:
        raise ValueError("Invalid cabin number format")

    building_side = cabin_no[0].upper()
    cabin_number = cabin_no[1:]

    if not cabin_number.isdigit():
        raise ValueError("Invalid cabin number format")

    return f"{building_side }-{cabin_number }"


def get_room_no_by_cabin(cabin_no: str, db_path: str) -> Optional[str]:
    try:
        formatted_cabin_no = format_cabin_no(cabin_no)
    except ValueError:
        return None

    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            query = """
            SELECT room_no
            FROM teachers
            WHERE TRIM(cabin_no) = ?;
            """
            cursor.execute(query, (formatted_cabin_no,))
            result = cursor.fetchone()

            return result[0] if result else None
    except sqlite3.Error as e:
        print(f"An error occurred while accessing the database: {e }")
        return None
