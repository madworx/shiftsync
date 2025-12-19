from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    role: str
    store_ids: List[str]

class Store(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    time_slots: List[str]

class ShiftCreate(BaseModel):
    store_id: str
    day_of_week: int
    time_slot: str
    shift_type: str
    notes: Optional[str] = ""
    week_start: str

class ShiftUpdate(BaseModel):
    day_of_week: Optional[int] = None
    time_slot: Optional[str] = None
    shift_type: Optional[str] = None
    notes: Optional[str] = None

class Shift(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    store_id: str
    user_id: str
    user_name: str
    day_of_week: int
    time_slot: str
    shift_type: str
    notes: str
    status: str
    week_start: str
    created_at: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ConflictCheck(BaseModel):
    store_id: str
    day_of_week: int
    time_slot: str
    week_start: str
    exclude_shift_id: Optional[str] = None

# Mock authentication - in production, use proper JWT
async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = authorization.replace("Bearer ", "")
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

# Auth endpoints
@api_router.post("/auth/login")
async def login(request: LoginRequest):
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(request.password.encode(), user_doc["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "token": user_doc["id"],
        "user": User(**user_doc)
    }

@api_router.get("/auth/me", response_model=User)
async def get_me(authorization: Optional[str] = Header(None)):
    return await get_current_user(authorization)

# Store endpoints
@api_router.get("/stores", response_model=List[Store])
async def get_stores(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    stores = await db.stores.find({"id": {"$in": user.store_ids}}, {"_id": 0}).to_list(100)
    return stores

@api_router.get("/stores/{store_id}", response_model=Store)
async def get_store(store_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    
    if store_id not in user.store_ids:
        raise HTTPException(status_code=403, detail="Access denied")
    
    store = await db.stores.find_one({"id": store_id}, {"_id": 0})
    
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    return Store(**store)

# Shift endpoints
@api_router.get("/shifts", response_model=List[Shift])
async def get_shifts(
    store_id: str,
    week_start: str,
    authorization: Optional[str] = Header(None)
):
    user = await get_current_user(authorization)
    
    if store_id not in user.store_ids:
        raise HTTPException(status_code=403, detail="Access denied")
    
    shifts = await db.shifts.find(
        {"store_id": store_id, "week_start": week_start},
        {"_id": 0}
    ).to_list(1000)
    
    return shifts

@api_router.post("/shifts", response_model=Shift)
async def create_shift(
    shift_data: ShiftCreate,
    authorization: Optional[str] = Header(None)
):
    user = await get_current_user(authorization)
    
    if shift_data.store_id not in user.store_ids:
        raise HTTPException(status_code=403, detail="Access denied")
    
    shift = Shift(
        id=str(uuid.uuid4()),
        store_id=shift_data.store_id,
        user_id=user.id,
        user_name=user.name,
        day_of_week=shift_data.day_of_week,
        time_slot=shift_data.time_slot,
        shift_type=shift_data.shift_type,
        notes=shift_data.notes,
        status="pending" if user.role != "admin" else "approved",
        week_start=shift_data.week_start,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.shifts.insert_one(shift.model_dump())
    return shift

@api_router.put("/shifts/{shift_id}", response_model=Shift)
async def update_shift(
    shift_id: str,
    shift_data: ShiftUpdate,
    authorization: Optional[str] = Header(None)
):
    user = await get_current_user(authorization)
    
    existing_shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    
    if not existing_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    if existing_shift["user_id"] != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in shift_data.model_dump().items() if v is not None}
    
    await db.shifts.update_one(
        {"id": shift_id},
        {"$set": update_data}
    )
    
    updated_shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    return Shift(**updated_shift)

@api_router.delete("/shifts/{shift_id}")
async def delete_shift(
    shift_id: str,
    authorization: Optional[str] = Header(None)
):
    user = await get_current_user(authorization)
    
    existing_shift = await db.shifts.find_one({"id": shift_id})
    
    if not existing_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete shifts")
    
    await db.shifts.delete_one({"id": shift_id})
    return {"message": "Shift deleted"}

@api_router.post("/shifts/{shift_id}/approve")
async def approve_shift(
    shift_id: str,
    authorization: Optional[str] = Header(None)
):
    user = await get_current_user(authorization)
    
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can approve shifts")
    
    existing_shift = await db.shifts.find_one({"id": shift_id})
    
    if not existing_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    await db.shifts.update_one(
        {"id": shift_id},
        {"$set": {"status": "approved"}}
    )
    
    updated_shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    return Shift(**updated_shift)

@api_router.post("/shifts/{shift_id}/reject")
async def reject_shift(
    shift_id: str,
    authorization: Optional[str] = Header(None)
):
    user = await get_current_user(authorization)
    
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can reject shifts")
    
    existing_shift = await db.shifts.find_one({"id": shift_id})
    
    if not existing_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    await db.shifts.update_one(
        {"id": shift_id},
        {"$set": {"status": "rejected"}}
    )
    
    updated_shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    return Shift(**updated_shift)

@api_router.post("/shifts/check-conflict")
async def check_conflict(
    conflict_data: ConflictCheck,
    authorization: Optional[str] = Header(None)
):
    user = await get_current_user(authorization)
    
    query = {
        "store_id": conflict_data.store_id,
        "day_of_week": conflict_data.day_of_week,
        "time_slot": conflict_data.time_slot,
        "week_start": conflict_data.week_start,
        "status": {"$in": ["pending", "approved"]}
    }
    
    if conflict_data.exclude_shift_id:
        query["id"] = {"$ne": conflict_data.exclude_shift_id}
    
    existing_shift = await db.shifts.find_one(query, {"_id": 0})
    
    return {
        "has_conflict": existing_shift is not None,
        "conflicting_shift": Shift(**existing_shift) if existing_shift else None
    }

# Seed data endpoint
@api_router.post("/seed")
async def seed_data():
    await db.users.delete_many({})
    await db.stores.delete_many({})
    await db.shifts.delete_many({})
    
    admin_password = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
    user_password = bcrypt.hashpw("user123".encode(), bcrypt.gensalt()).decode()
    
    users = [
        {
            "id": "admin-1",
            "name": "Admin User",
            "email": "admin@example.com",
            "password_hash": admin_password,
            "role": "admin",
            "store_ids": ["store-1", "store-2", "store-3"]
        },
        {
            "id": "user-1",
            "name": "John Doe",
            "email": "john@example.com",
            "password_hash": user_password,
            "role": "user",
            "store_ids": ["store-1", "store-2"]
        },
        {
            "id": "user-2",
            "name": "Jane Smith",
            "email": "jane@example.com",
            "password_hash": user_password,
            "role": "user",
            "store_ids": ["store-2", "store-3"]
        }
    ]
    
    stores = [
        {
            "id": "store-1",
            "name": "Downtown Store",
            "time_slots": ["09:00 - 13:00", "13:00 - 17:00", "17:00 - 21:00"]
        },
        {
            "id": "store-2",
            "name": "Mall Store",
            "time_slots": ["10:00 - 14:00", "14:00 - 18:00", "18:00 - 22:00"]
        },
        {
            "id": "store-3",
            "name": "Airport Store",
            "time_slots": ["06:00 - 12:00", "12:00 - 18:00", "18:00 - 00:00"]
        }
    ]
    
    await db.users.insert_many(users)
    await db.stores.insert_many(stores)
    
    return {"message": "Data seeded successfully"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"] if os.environ.get('CORS_ORIGINS', '*') == '*' else os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()