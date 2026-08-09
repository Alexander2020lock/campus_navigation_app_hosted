from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from datetime import timedelta
from .helpers import get_db_connection
from .user_auth_jwt import get_current_user, create_access_token
import sqlite3

from Utils.db_access import (
    get_password_users as get_user_credentials,
)
from Utils.db_maker import add_login_timestamp
from Utils.loader import env_variables
from werkzeug.security import check_password_hash, generate_password_hash


class UserLogin(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    password: str
    email: EmailStr
    mobile_number: Optional[str] = None
    gender: Optional[str] = None
    title: Optional[str] = None
    position: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    mobile_number: Optional[str] = None
    gender: Optional[str] = None
    title: Optional[str] = None
    position: Optional[str] = None


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


users_router = APIRouter(tags=["users"])


@users_router.post("/register")
async def register_user(user: UserCreate):

    hashed_password = generate_password_hash(user.password)

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO users (username, password, email, mobile_number, gender, title, position)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user.username,
                    hashed_password,
                    user.email,
                    user.mobile_number,
                    user.gender,
                    user.title,
                    user.position,
                ),
            )
            conn.commit()
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Username or email already exists")

    return {"message": "User registered successfully", "user_id": user_id}


@users_router.post("/login")
async def login(request: Request):

    username = None
    password = None

    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        try:
            data = await request.json()
            username = data.get("username")
            password = data.get("password")
        except Exception:
            pass
    elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        try:
            form = await request.form()
            username = form.get("username")
            password = form.get("password")
        except Exception:
            pass
    else:
        try:
            data = await request.json()
            username = data.get("username")
            password = data.get("password")
        except Exception:
            pass

    if not username or not password:
        raise HTTPException(
            status_code=400, detail="Username and password are required"
        )

    stored_hashed_password = get_user_credentials(env_variables["event_db"], username)

    if not stored_hashed_password or not check_password_hash(
        stored_hashed_password, password
    ):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    result = add_login_timestamp(username, env_variables["event_db"])
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    access_token = create_access_token(
        data={"sub": str(user["id"])}, expires_delta=timedelta(minutes=30)
    )

    return {
        "message": "Login successful",
        "last_login": result.get("last_login"),
        "access_token": access_token,
        "token_type": "bearer",
    }


@users_router.get("/me")
@users_router.get("/profile")
async def get_user_profile(current_user_id: str = Depends(get_current_user)):


    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT id, username, email, mobile_number, gender, title, position, 
                   created_at, updated_at 
            FROM users 
            WHERE id = ?
            """,
            (current_user_id,),
        )
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        cursor.execute(
            """
            SELECT login_time FROM login_timestamps 
            WHERE user_id = ? 
            ORDER BY login_time DESC 
            LIMIT 2
            """,
            (current_user_id,),
        )
        login_times = cursor.fetchall()

        user_info = dict(user)

        if len(login_times) >= 2:
            user_info["last_login"] = login_times[1]["login_time"]
        else:
            user_info["last_login"] = None

        user_info["current_login"] = (
            login_times[0]["login_time"] if login_times else None
        )

        cursor.execute(
            "SELECT COUNT(*) as event_count FROM events WHERE user_id = ?",
            (current_user_id,),
        )
        event_count = cursor.fetchone()
        user_info["event_count"] = event_count["event_count"] if event_count else 0

    return user_info


@users_router.put("/profile")
async def update_user_profile(
    user_update: UserUpdate, current_user_id: str = Depends(get_current_user)
):

    update_data = {k: v for k, v in user_update.dict().items() if v is not None}

    if not update_data:
        return JSONResponse(content={"detail": "No fields to update"}, status_code=400)

    try:
        set_clause = ", ".join([f"{field } = ?" for field in update_data.keys()])
        values = list(update_data.values())
        values.append(current_user_id)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE users SET {set_clause } WHERE id = ?", values)
            conn.commit()

            cursor.execute(
                """
                SELECT id, username, email, mobile_number, gender, title, position, 
                       created_at, updated_at 
                FROM users 
                WHERE id = ?
                """,
                (current_user_id,),
            )
            updated_user = cursor.fetchone()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Email already exists")

    return dict(updated_user)


@users_router.put("/password")
async def update_user_password(
    password_update: PasswordUpdate, current_user_id: str = Depends(get_current_user)
):

    current_password = password_update.current_password
    new_password = password_update.new_password

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT username, password FROM users WHERE id = ?", (current_user_id,)
        )
        user = cursor.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not check_password_hash(user["password"], current_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    new_password_hash = generate_password_hash(new_password)

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET password = ? WHERE id = ?",
            (new_password_hash, current_user_id),
        )
        conn.commit()

    return {"message": "Password updated successfully"}


@users_router.get("/login-history")
async def get_login_history(current_user_id: str = Depends(get_current_user)):

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT login_time 
            FROM login_timestamps 
            WHERE user_id = ? 
            ORDER BY login_time DESC
            LIMIT 10
            """,
            (current_user_id,),
        )
        logins = [dict(row) for row in cursor.fetchall()]

    return {"login_history": logins}


@users_router.delete("/profile")
async def delete_user_profile(current_user_id: str = Depends(get_current_user)):

    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE id = ?", (current_user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        cursor.execute("DELETE FROM users WHERE id = ?", (current_user_id,))
        conn.commit()

    return JSONResponse(
        content={"message": "User deleted successfully"}, status_code=200
    )
