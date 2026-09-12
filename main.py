"""
Apna Crop - FastAPI Backend
Smart India Hackathon Baseline Backend with SQLite, JWT Role-Based Auth,
Username & Password Authentication (with server-side bcrypt hashing),
Crop & Price Management, Profit/Deduction Calculation Engine,
Procurement Pipeline & Auto-Notifications.
"""

import os
import re
import sqlite3
import datetime
import uuid
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
import jwt
import bcrypt

# ============================================================================
# CONSTANTS & CONFIGURATION
# ============================================================================
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "procurement.db")
SECRET_KEY = os.environ.get("JWT_SECRET", "sih-smart-crop-procurement-secret-key-2026-poppins")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

PIPELINE_STAGES = [
    "Booked",
    "Arrived",
    "Verification",
    "Weighing",
    "Quality Check",
    "Final Acceptance",
    "Completed"
]

security = HTTPBearer()

# ============================================================================
# SECURITY & AUTH UTILITIES (Bcrypt Salted Hashing & JWT)
# ============================================================================
def hash_password(password: str) -> str:
    """Hash password using bcrypt with salt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def validate_password_rules(password: str):
    """Enforce minimum password security: >= 8 characters, at least 1 digit, at least 1 letter."""
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )
    if not any(char.isdigit() for char in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number."
        )
    if not any(char.isalpha() for char in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one letter."
        )

def create_jwt_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired. Please login again.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token.")

# ============================================================================
# DATABASE INITIALIZATION & AUTO-SEEDING
# Zero data-destructive policy: tables created with soft-status support
# ============================================================================
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 1. Farmers table with username & bcrypt password_hash
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS farmers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        mobile TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        aadhaar_hash TEXT,
        district TEXT NOT NULL DEFAULT 'Nizamabad',
        state TEXT NOT NULL DEFAULT 'Telangana',
        village TEXT DEFAULT 'Bodhan',
        bank_account TEXT,
        ifsc_code TEXT,
        role TEXT NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'admin')),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # Check if existing table needs username column migration
    cursor.execute("PRAGMA table_info(farmers)")
    columns = [row[1] for row in cursor.fetchall()]
    if "username" not in columns:
        cursor.execute("ALTER TABLE farmers ADD COLUMN username TEXT")
        # Update existing records with default username
        cursor.execute("UPDATE farmers SET username = mobile WHERE username IS NULL")

    # 2. Procurement Centres table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS procurement_centres (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        district TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'Telangana',
        daily_capacity_quintals REAL NOT NULL DEFAULT 500.0,
        operating_status TEXT NOT NULL DEFAULT 'active' CHECK (operating_status IN ('active', 'inactive', 'maintenance')),
        contact_number TEXT,
        address TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # 3. Crop Prices table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS crop_prices (
        id TEXT PRIMARY KEY,
        crop_name TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL DEFAULT 'Cereal',
        price_per_quintal REAL NOT NULL CHECK (price_per_quintal > 0),
        is_active INTEGER NOT NULL DEFAULT 1,
        updated_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (updated_by) REFERENCES farmers (id)
    )
    """)

    # 4. Deduction Config table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS deduction_config (
        id TEXT PRIMARY KEY,
        mandi_fee_percent REAL NOT NULL DEFAULT 1.5,
        labor_charge_per_quintal REAL NOT NULL DEFAULT 20.0,
        transport_charge_per_quintal REAL NOT NULL DEFAULT 25.0,
        is_active INTEGER NOT NULL DEFAULT 1,
        updated_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (updated_by) REFERENCES farmers (id)
    )
    """)

    # 5. Bookings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        token_number TEXT UNIQUE NOT NULL,
        farmer_id TEXT NOT NULL,
        centre_id TEXT NOT NULL,
        crop_name TEXT NOT NULL,
        quantity_quintals REAL NOT NULL CHECK (quantity_quintals > 0),
        booking_date TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Booked' CHECK (
            status IN ('Booked', 'Arrived', 'Verification', 'Weighing', 'Quality Check', 'Final Acceptance', 'Completed', 'Cancelled')
        ),
        price_per_quintal_at_booking REAL NOT NULL,
        gross_amount REAL NOT NULL,
        mandi_fee REAL NOT NULL DEFAULT 0.0,
        labor_charge REAL NOT NULL DEFAULT 0.0,
        transport_charge REAL NOT NULL DEFAULT 0.0,
        total_deductions REAL NOT NULL DEFAULT 0.0,
        net_amount REAL NOT NULL,
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (farmer_id) REFERENCES farmers (id),
        FOREIGN KEY (centre_id) REFERENCES procurement_centres (id)
    )
    """)

    # 6. Queues table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS queues (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        centre_id TEXT NOT NULL,
        queue_number INTEGER NOT NULL,
        estimated_wait_minutes INTEGER NOT NULL DEFAULT 30,
        current_stage TEXT NOT NULL DEFAULT 'Booked',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (booking_id) REFERENCES bookings (id),
        FOREIGN KEY (centre_id) REFERENCES procurement_centres (id)
    )
    """)

    # 7. Payments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        farmer_id TEXT NOT NULL,
        gross_amount REAL NOT NULL,
        deductions REAL NOT NULL,
        net_amount REAL NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Processing', 'Paid', 'Failed')),
        payment_reference TEXT,
        paid_at TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (booking_id) REFERENCES bookings (id),
        FOREIGN KEY (farmer_id) REFERENCES farmers (id)
    )
    """)

    # 8. Notifications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        farmer_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info',
        is_read INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (farmer_id) REFERENCES farmers (id)
    )
    """)

    now_iso = datetime.datetime.now().isoformat()

    # Pre-seed Admin Account (username: 'admin', password: 'admin123')
    admin_id = "a0000000-0000-0000-0000-000000000001"
    admin_hash = hash_password("admin123")
    cursor.execute("SELECT id FROM farmers WHERE username = 'admin' OR mobile = '9999999999'")
    existing_admin = cursor.fetchone()
    if not existing_admin:
        cursor.execute("""
        INSERT INTO farmers (id, name, username, mobile, role, password_hash, district, state, village, is_active, created_at, updated_at)
        VALUES (?, ?, 'admin', '9999999999', 'admin', ?, 'Nizamabad', 'Telangana', 'Collectorate HQ', 1, ?, ?)
        """, (admin_id, "District Procurement Admin", admin_hash, now_iso, now_iso))
    else:
        cursor.execute("UPDATE farmers SET username = 'admin', password_hash = ? WHERE id = ?", (admin_hash, existing_admin[0]))

    # Pre-seed Demo Farmers (password: 'Farmer@123')
    farmer_pw_hash = hash_password("Farmer@123")
    demo_farmers = [
        ("f0000000-0000-0000-0000-000000000001", "Ramesh Patel", "ramesh", "9876543210", "farmer", "Nizamabad", "Telangana", "Bodhan", "SBIN00012345678", "SBIN0001234"),
        ("f0000000-0000-0000-0000-000000000002", "Suresh Kumar", "suresh", "9876543211", "farmer", "Warangal", "Telangana", "Narsampet", "HDFC00087654321", "HDFC0008765"),
        ("f0000000-0000-0000-0000-000000000003", "Anita Devi", "anita", "9876543212", "farmer", "Karimnagar", "Telangana", "Huzurabad", "UBIN00099887766", "UBIN0009988")
    ]
    for fid, fname, funame, fmob, frole, fdist, fstate, fvill, fbank, fifsc in demo_farmers:
        cursor.execute("SELECT id FROM farmers WHERE username = ? OR mobile = ?", (funame, fmob))
        existing_f = cursor.fetchone()
        if not existing_f:
            cursor.execute("""
            INSERT INTO farmers (id, name, username, mobile, role, password_hash, district, state, village, bank_account, ifsc_code, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            """, (fid, fname, funame, fmob, frole, farmer_pw_hash, fdist, fstate, fvill, fbank, fifsc, now_iso, now_iso))
        else:
            cursor.execute("UPDATE farmers SET username = ?, password_hash = ? WHERE id = ?", (funame, farmer_pw_hash, existing_f[0]))

    # Pre-seed Procurement Centres
    demo_centres = [
        ("c0000000-0000-0000-0000-000000000001", "Nizamabad Central Mandi", "NZB-01", "Nizamabad", "Telangana", 600.0, "active", "+91 8462 220101", "Market Yard, Nizamabad Highway"),
        ("c0000000-0000-0000-0000-000000000002", "Warangal Agri Center", "WGL-02", "Warangal", "Telangana", 750.0, "active", "+91 870 2450202", "Grain Market, Warangal Urban"),
        ("c0000000-0000-0000-0000-000000000003", "Karimnagar Grain Yard", "KRM-03", "Karimnagar", "Telangana", 500.0, "active", "+91 878 2230303", "Collectorate Road, Karimnagar"),
        ("c0000000-0000-0000-0000-000000000004", "Khammam Procurement Hub", "KHM-04", "Khammam", "Telangana", 450.0, "active", "+91 8742 230404", "APMC Yard, Khammam")
    ]
    for cid, cname, ccode, cdist, cstate, ccap, cstat, cphone, caddr in demo_centres:
        cursor.execute("SELECT id FROM procurement_centres WHERE code = ?", (ccode,))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO procurement_centres (id, name, code, district, state, daily_capacity_quintals, operating_status, contact_number, address, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            """, (cid, cname, ccode, cdist, cstate, ccap, cstat, cphone, caddr, now_iso, now_iso))

    # Pre-seed Crop Prices
    demo_crops = [
        ("e0000000-0000-0000-0000-000000000001", "Paddy (Common)", "Cereal", 2183.0),
        ("e0000000-0000-0000-0000-000000000002", "Paddy (Grade A)", "Cereal", 2203.0),
        ("e0000000-0000-0000-0000-000000000003", "Wheat", "Cereal", 2275.0),
        ("e0000000-0000-0000-0000-000000000004", "Maize", "Coarse Cereals", 2090.0),
        ("e0000000-0000-0000-0000-000000000005", "Cotton (Medium Staple)", "Commercial", 6620.0),
        ("e0000000-0000-0000-0000-000000000006", "Soybean (Yellow)", "Oilseeds", 4600.0),
        ("e0000000-0000-0000-0000-000000000007", "Mustard", "Oilseeds", 5650.0),
        ("e0000000-0000-0000-0000-000000000008", "Groundnut", "Oilseeds", 6377.0)
    ]
    for eid, ename, ecat, eprice in demo_crops:
        cursor.execute("SELECT id FROM crop_prices WHERE crop_name = ?", (ename,))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO crop_prices (id, crop_name, category, price_per_quintal, is_active, updated_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)
            """, (eid, ename, ecat, eprice, admin_id, now_iso, now_iso))

    # Pre-seed Deduction Config
    deduction_id = "d0000000-0000-0000-0000-000000000001"
    cursor.execute("SELECT id FROM deduction_config WHERE id = ?", (deduction_id,))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO deduction_config (id, mandi_fee_percent, labor_charge_per_quintal, transport_charge_per_quintal, is_active, updated_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?)
        """, (deduction_id, 1.5, 20.0, 25.0, admin_id, now_iso, now_iso))

    conn.commit()
    conn.close()

# Initialize database
init_db()

# ============================================================================
# FASTAPI APP & MIDDLEWARE
# ============================================================================
app = FastAPI(
    title="Apna Crop API",
    description="Full implementation of SIH Apna Crop Portal with Poppins UI, Username/Password Auth (bcrypt), Dynamic Crops & Pricing, Profit Breakdown, and Queue Pipelines.",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# AUTHENTICATION & AUTHORIZATION DEPENDENCIES
# ============================================================================
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = decode_jwt_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM farmers WHERE id = ? AND is_active = 1", (user_id,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or deactivated.")

    return dict(user)

def require_role(required_role: str):
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action forbidden: requires '{required_role}' role."
            )
        return current_user
    return role_checker

require_admin = require_role("admin")
require_farmer = require_role("farmer")

# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================
class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=1, max_length=50)
    mobile: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=1)
    district: Optional[str] = "Nizamabad"
    village: Optional[str] = "Bodhan"
    state: Optional[str] = "Telangana"

class UserLoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None

class CropCreateRequest(BaseModel):
    crop_name: str = Field(..., min_length=2, max_length=100)
    category: Optional[str] = "Cereal"
    price_per_quintal: float = Field(..., gt=0)

class CropUpdateRequest(BaseModel):
    crop_name: Optional[str] = None
    category: Optional[str] = None
    price_per_quintal: Optional[float] = Field(None, gt=0)

class DeductionUpdateRequest(BaseModel):
    mandi_fee_percent: float = Field(..., ge=0)
    labor_charge_per_quintal: float = Field(..., ge=0)
    transport_charge_per_quintal: float = Field(..., ge=0)

class BookingCreateRequest(BaseModel):
    crop_name: str = Field(..., min_length=2)
    quantity_quintals: float = Field(..., gt=0)
    centre_id: str = Field(...)
    booking_date: str = Field(...)  # YYYY-MM-DD
    time_slot: str = Field(...)     # e.g. "09:00 - 11:00"
    notes: Optional[str] = None

class BookingStatusUpdateRequest(BaseModel):
    status: str = Field(...)
    notes: Optional[str] = None

# ============================================================================
# AUTHENTICATION ENDPOINTS (USERNAME & PASSWORD)
# ============================================================================

@app.post("/api/auth/register", tags=["Authentication"])
def register_farmer(req: UserRegisterRequest):
    """
    Self-registration for farmers.
    Validates username, mobile, and password strength.
    Role is strictly forced to 'farmer' server-side.
    Passswords are securely hashed using bcrypt.
    """
    name = req.name.strip()
    username = req.username.strip().lower()
    mobile = req.mobile.strip()
    password = req.password

    # Validate username format
    if not re.match(r"^[a-zA-Z0-9_]{3,50}$", username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be 3-50 characters and contain only letters, numbers, or underscores."
        )

    # Validate password rules
    validate_password_rules(password)

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Check if username exists
    cursor.execute("SELECT id FROM farmers WHERE LOWER(username) = LOWER(?)", (username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{username}' is already taken. Please choose another."
        )

    # Check if mobile exists
    cursor.execute("SELECT id FROM farmers WHERE mobile = ?", (mobile,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mobile number '{mobile}' is already registered."
        )

    # Hash password with bcrypt
    pw_hash = hash_password(password)
    new_id = str(uuid.uuid4())
    now_iso = datetime.datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO farmers (
        id, name, username, mobile, password_hash, district, state, village, role, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'farmer', 1, ?, ?)
    """, (
        new_id, name, username, mobile, pw_hash,
        req.district or "Nizamabad", req.state or "Telangana", req.village or "Bodhan",
        now_iso, now_iso
    ))
    conn.commit()

    cursor.execute("SELECT * FROM farmers WHERE id = ?", (new_id,))
    user = dict(cursor.fetchone())
    conn.close()

    # Issue JWT token for immediate seamless login
    token_data = {
        "sub": user["id"],
        "role": "farmer",
        "username": user["username"],
        "mobile": user["mobile"],
        "name": user["name"]
    }
    access_token = create_jwt_token(token_data)

    return {
        "success": True,
        "message": f"Welcome to Apna Crop, {user['name']}! Registration successful.",
        "token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "username": user["username"],
            "mobile": user["mobile"],
            "role": "farmer",
            "district": user["district"],
            "village": user["village"],
            "bank_account": user["bank_account"],
            "ifsc_code": user["ifsc_code"]
        }
    }

@app.post("/api/auth/login", tags=["Authentication"])
def login_user(req: UserLoginRequest):
    """
    Universal login endpoint for both Farmers and Administrators using username/mobile and password.
    Verifies bcrypt salted password hash. Role is extracted securely from the database record.
    """
    login_id = req.username.strip()
    password = req.password

    if not login_id or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required."
        )

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM farmers
    WHERE (LOWER(username) = LOWER(?) OR mobile = ?) AND is_active = 1
    """, (login_id, login_id))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )

    user_dict = dict(user)

    # Verify bcrypt password hash
    if not verify_password(password, user_dict["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )

    # Generate JWT containing user_id and authoritative role
    token_data = {
        "sub": user_dict["id"],
        "role": user_dict["role"],
        "username": user_dict.get("username", user_dict["mobile"]),
        "mobile": user_dict["mobile"],
        "name": user_dict["name"]
    }
    access_token = create_jwt_token(token_data)

    return {
        "success": True,
        "message": f"Welcome back, {user_dict['name']}!",
        "token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_dict["id"],
            "name": user_dict["name"],
            "username": user_dict.get("username", user_dict["mobile"]),
            "mobile": user_dict["mobile"],
            "role": user_dict["role"],
            "district": user_dict["district"],
            "village": user_dict["village"],
            "bank_account": user_dict["bank_account"],
            "ifsc_code": user_dict["ifsc_code"]
        }
    }

@app.get("/api/auth/me", tags=["Authentication"])
def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Validates the active session token and returns the current user profile."""
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "username": current_user.get("username"),
        "mobile": current_user["mobile"],
        "role": current_user["role"],
        "district": current_user["district"],
        "state": current_user["state"],
        "village": current_user["village"],
        "bank_account": current_user["bank_account"],
        "ifsc_code": current_user["ifsc_code"],
        "created_at": current_user["created_at"]
    }

# ============================================================================
# FARMER PROFILE ENDPOINTS
# ============================================================================

@app.get("/api/profile", tags=["Profile"])
def get_profile(current_user: dict = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return current_user

@app.put("/api/profile", tags=["Profile"])
def update_profile(req: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update profile fields for the logged in user."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    now_iso = datetime.datetime.now().isoformat()
    fields_to_update = []
    values = []

    if req.name is not None:
        fields_to_update.append("name = ?")
        values.append(req.name.strip())
    if req.village is not None:
        fields_to_update.append("village = ?")
        values.append(req.village.strip())
    if req.district is not None:
        fields_to_update.append("district = ?")
        values.append(req.district.strip())
    if req.state is not None:
        fields_to_update.append("state = ?")
        values.append(req.state.strip())
    if req.bank_account is not None:
        fields_to_update.append("bank_account = ?")
        values.append(req.bank_account.strip())
    if req.ifsc_code is not None:
        fields_to_update.append("ifsc_code = ?")
        values.append(req.ifsc_code.strip().upper())

    if not fields_to_update:
        conn.close()
        return {"success": True, "message": "No changes submitted.", "profile": current_user}

    fields_to_update.append("updated_at = ?")
    values.append(now_iso)

    values.append(current_user["id"])
    query = f"UPDATE farmers SET {', '.join(fields_to_update)} WHERE id = ?"
    cursor.execute(query, tuple(values))
    conn.commit()

    cursor.execute("SELECT * FROM farmers WHERE id = ?", (current_user["id"],))
    updated_user = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "message": "Profile updated successfully.",
        "profile": updated_user
    }

# ============================================================================
# CROPS & PRICING MANAGEMENT (ADMIN ONLY + PUBLIC READ)
# ============================================================================

@app.get("/api/crops", tags=["Crops"])
def list_crops():
    """
    Get all active crops and their current procurement price per quintal.
    Accessible to all users and authenticated farmers.
    """
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
    SELECT c.id, c.crop_name, c.category, c.price_per_quintal, c.updated_at, f.name as updated_by_name
    FROM crop_prices c
    LEFT JOIN farmers f ON c.updated_by = f.id
    WHERE c.is_active = 1
    ORDER BY c.crop_name ASC
    """)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/crops", tags=["Crops"])
def add_crop(req: CropCreateRequest, admin: dict = Depends(require_admin)):
    """Admin-only: Add a new crop type and price per quintal."""
    crop_name = req.crop_name.strip()
    if req.price_per_quintal <= 0:
        raise HTTPException(status_code=400, detail="Price per quintal must be greater than 0.")

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM crop_prices WHERE LOWER(crop_name) = LOWER(?)", (crop_name,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail=f"Crop with name '{crop_name}' already exists.")

    new_id = str(uuid.uuid4())
    now_iso = datetime.datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO crop_prices (id, crop_name, category, price_per_quintal, is_active, updated_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    """, (new_id, crop_name, req.category, req.price_per_quintal, admin["id"], now_iso, now_iso))
    conn.commit()

    cursor.execute("SELECT * FROM crop_prices WHERE id = ?", (new_id,))
    row = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "message": f"Crop '{crop_name}' created with price ₹{req.price_per_quintal:.2f}/qtl",
        "crop": row
    }

@app.put("/api/crops/{crop_id}", tags=["Crops"])
def update_crop_price(crop_id: str, req: CropUpdateRequest, admin: dict = Depends(require_admin)):
    """Admin-only: Update existing crop price and details."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM crop_prices WHERE id = ?", (crop_id,))
    crop = cursor.fetchone()
    if not crop:
        conn.close()
        raise HTTPException(status_code=404, detail="Crop not found.")

    updates = []
    params = []
    now_iso = datetime.datetime.now().isoformat()

    if req.crop_name is not None:
        name = req.crop_name.strip()
        cursor.execute("SELECT id FROM crop_prices WHERE LOWER(crop_name) = LOWER(?) AND id != ?", (name, crop_id))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail=f"Another crop with name '{name}' already exists.")
        updates.append("crop_name = ?")
        params.append(name)

    if req.category is not None:
        updates.append("category = ?")
        params.append(req.category.strip())

    if req.price_per_quintal is not None:
        if req.price_per_quintal <= 0:
            conn.close()
            raise HTTPException(status_code=400, detail="Price must be greater than 0.")
        updates.append("price_per_quintal = ?")
        params.append(req.price_per_quintal)

    updates.append("updated_by = ?")
    params.append(admin["id"])
    updates.append("updated_at = ?")
    params.append(now_iso)

    params.append(crop_id)
    cursor.execute(f"UPDATE crop_prices SET {', '.join(updates)} WHERE id = ?", tuple(params))
    conn.commit()

    cursor.execute("SELECT * FROM crop_prices WHERE id = ?", (crop_id,))
    updated_crop = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "message": "Crop pricing updated successfully.",
        "crop": updated_crop
    }

# ============================================================================
# DEDUCTION CONFIGURATION ENDPOINTS (ADMIN ONLY + READ)
# ============================================================================

@app.get("/api/deductions", tags=["Deductions"])
def get_deductions():
    """Get current deduction parameters."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM deduction_config WHERE is_active = 1 LIMIT 1")
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {
            "mandi_fee_percent": 1.5,
            "labor_charge_per_quintal": 20.0,
            "transport_charge_per_quintal": 25.0
        }
    return dict(row)

@app.put("/api/deductions", tags=["Deductions"])
def update_deductions(req: DeductionUpdateRequest, admin: dict = Depends(require_admin)):
    """Admin-only: Update deduction parameters for profit calculations."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    now_iso = datetime.datetime.now().isoformat()
    cursor.execute("""
    UPDATE deduction_config
    SET mandi_fee_percent = ?, labor_charge_per_quintal = ?, transport_charge_per_quintal = ?,
        updated_by = ?, updated_at = ?
    WHERE is_active = 1
    """, (req.mandi_fee_percent, req.labor_charge_per_quintal, req.transport_charge_per_quintal, admin["id"], now_iso))
    conn.commit()

    cursor.execute("SELECT * FROM deduction_config WHERE is_active = 1 LIMIT 1")
    updated = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "message": "Deduction rates updated successfully.",
        "deductions": updated
    }

# ============================================================================
# PROCUREMENT CENTRES ENDPOINTS
# ============================================================================

@app.get("/api/centres", tags=["Centres"])
def list_centres():
    """List all operating procurement centres with capacities."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM procurement_centres WHERE is_active = 1 ORDER BY name ASC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

# ============================================================================
# BOOKINGS & PROFIT CALCULATION ENGINE
# ============================================================================

@app.post("/api/bookings", tags=["Bookings"])
def create_booking(req: BookingCreateRequest, current_user: dict = Depends(get_current_user)):
    """
    Create a new slot booking for a farmer.
    Performs full profit calculation snapshotting historical rates:
    gross_amount = quantity * price_per_quintal
    deductions = mandi_fee + labor_charge + transport_charge
    net_amount = gross_amount - deductions
    """
    farmer_id = current_user["id"]
    crop_name = req.crop_name.strip()
    qty = float(req.quantity_quintals)

    if qty <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0 quintals.")

    try:
        booking_d = datetime.date.fromisoformat(req.booking_date)
        if booking_d < datetime.date.today():
            raise HTTPException(status_code=400, detail="Booking date cannot be in the past.")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM crop_prices WHERE crop_name = ? AND is_active = 1", (crop_name,))
    crop = cursor.fetchone()
    if not crop:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Selected crop '{crop_name}' is not currently available for procurement.")
    price_per_quintal = float(crop["price_per_quintal"])

    cursor.execute("SELECT * FROM deduction_config WHERE is_active = 1 LIMIT 1")
    ded_row = cursor.fetchone()
    if ded_row:
        mandi_pct = float(ded_row["mandi_fee_percent"])
        labor_rate = float(ded_row["labor_charge_per_quintal"])
        trans_rate = float(ded_row["transport_charge_per_quintal"])
    else:
        mandi_pct, labor_rate, trans_rate = 1.5, 20.0, 25.0

    gross_amount = round(qty * price_per_quintal, 2)
    mandi_fee = round(gross_amount * (mandi_pct / 100.0), 2)
    labor_charge = round(qty * labor_rate, 2)
    transport_charge = round(qty * trans_rate, 2)
    total_deductions = round(mandi_fee + labor_charge + transport_charge, 2)
    net_amount = round(gross_amount - total_deductions, 2)

    date_str = booking_d.strftime("%Y%m%d")
    cursor.execute("SELECT COUNT(*) FROM bookings WHERE booking_date = ? AND centre_id = ?", (req.booking_date, req.centre_id))
    current_count = cursor.fetchone()[0]
    seq_no = current_count + 1
    token_number = f"TK-{date_str}-{seq_no:03d}"
    queue_number = seq_no
    estimated_wait = max(15, seq_no * 15)

    booking_id = str(uuid.uuid4())
    now_iso = datetime.datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO bookings (
        id, token_number, farmer_id, centre_id, crop_name, quantity_quintals,
        booking_date, time_slot, status, price_per_quintal_at_booking, gross_amount,
        mandi_fee, labor_charge, transport_charge, total_deductions, net_amount,
        notes, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Booked', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    """, (
        booking_id, token_number, farmer_id, req.centre_id, crop_name, qty,
        req.booking_date, req.time_slot, price_per_quintal, gross_amount,
        mandi_fee, labor_charge, transport_charge, total_deductions, net_amount,
        req.notes, now_iso, now_iso
    ))

    queue_id = str(uuid.uuid4())
    cursor.execute("""
    INSERT INTO queues (id, booking_id, centre_id, queue_number, estimated_wait_minutes, current_stage, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'Booked', 1, ?, ?)
    """, (queue_id, booking_id, req.centre_id, queue_number, estimated_wait, now_iso, now_iso))

    payment_id = str(uuid.uuid4())
    cursor.execute("""
    INSERT INTO payments (id, booking_id, farmer_id, gross_amount, deductions, net_amount, payment_status, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Pending', 1, ?, ?)
    """, (payment_id, booking_id, farmer_id, gross_amount, total_deductions, net_amount, now_iso, now_iso))

    notif_id = str(uuid.uuid4())
    cursor.execute("""
    INSERT INTO notifications (id, farmer_id, title, message, type, is_read, is_active, created_at)
    VALUES (?, ?, ?, ?, 'booking', 0, 1, ?)
    """, (
        notif_id, farmer_id, "Slot Booking Confirmed",
        f"Your booking for {qty} quintals of {crop_name} is confirmed. Token #{token_number}. Net Estimated Payout: ₹{net_amount:,.2f}",
        now_iso
    ))

    conn.commit()

    cursor.execute("""
    SELECT b.*, c.name as centre_name, c.district as centre_district, c.address as centre_address,
           f.name as farmer_name, f.mobile as farmer_mobile,
           q.queue_number, q.estimated_wait_minutes
    FROM bookings b
    JOIN procurement_centres c ON b.centre_id = c.id
    JOIN farmers f ON b.farmer_id = f.id
    JOIN queues q ON b.id = q.booking_id
    WHERE b.id = ?
    """, (booking_id,))
    full_booking = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "message": f"Booking created successfully! Token: {token_number}",
        "token_number": token_number,
        "queue_position": queue_number,
        "estimated_wait_minutes": estimated_wait,
        "financial_breakdown": {
            "quantity_quintals": qty,
            "rate_per_quintal": price_per_quintal,
            "gross_amount": gross_amount,
            "mandi_fee": mandi_fee,
            "labor_charge": labor_charge,
            "transport_charge": transport_charge,
            "total_deductions": total_deductions,
            "net_amount": net_amount
        },
        "booking": full_booking
    }

@app.get("/api/bookings", tags=["Bookings"])
def get_bookings(current_user: dict = Depends(get_current_user)):
    """Get bookings list. Farmers view own; Admins view all."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    if current_user["role"] == "admin":
        cursor.execute("""
        SELECT b.*, c.name as centre_name, f.name as farmer_name, f.mobile as farmer_mobile,
               q.queue_number, q.estimated_wait_minutes
        FROM bookings b
        JOIN procurement_centres c ON b.centre_id = c.id
        JOIN farmers f ON b.farmer_id = f.id
        LEFT JOIN queues q ON b.id = q.booking_id
        WHERE b.is_active = 1
        ORDER BY b.created_at DESC
        """)
    else:
        cursor.execute("""
        SELECT b.*, c.name as centre_name, f.name as farmer_name, f.mobile as farmer_mobile,
               q.queue_number, q.estimated_wait_minutes
        FROM bookings b
        JOIN procurement_centres c ON b.centre_id = c.id
        JOIN farmers f ON b.farmer_id = f.id
        LEFT JOIN queues q ON b.id = q.booking_id
        WHERE b.farmer_id = ? AND b.is_active = 1
        ORDER BY b.created_at DESC
        """, (current_user["id"],))

    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.get("/api/bookings/{booking_id}", tags=["Bookings"])
def get_booking_detail(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Get single booking details."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
    SELECT b.*, c.name as centre_name, c.district as centre_district, c.address as centre_address,
           f.name as farmer_name, f.mobile as farmer_mobile,
           q.queue_number, q.estimated_wait_minutes, q.current_stage,
           p.payment_status, p.payment_reference
    FROM bookings b
    JOIN procurement_centres c ON b.centre_id = c.id
    JOIN farmers f ON b.farmer_id = f.id
    LEFT JOIN queues q ON b.id = q.booking_id
    LEFT JOIN payments p ON b.id = p.booking_id
    WHERE b.id = ? AND b.is_active = 1
    """, (booking_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Booking not found.")

    booking_dict = dict(row)
    if current_user["role"] != "admin" and booking_dict["farmer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this booking.")

    return booking_dict

@app.post("/api/bookings/{booking_id}/cancel", tags=["Bookings"])
def cancel_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Soft-cancel a booking."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM bookings WHERE id = ? AND is_active = 1", (booking_id,))
    b = cursor.fetchone()
    if not b:
        conn.close()
        raise HTTPException(status_code=404, detail="Booking not found.")

    b_dict = dict(b)
    if current_user["role"] != "admin" and b_dict["farmer_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Forbidden: You cannot cancel another farmer's booking.")

    if b_dict["status"] in ["Completed", "Final Acceptance"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot cancel a booking that is completed or accepted.")

    now_iso = datetime.datetime.now().isoformat()
    cursor.execute("UPDATE bookings SET status = 'Cancelled', updated_at = ? WHERE id = ?", (now_iso, booking_id))
    cursor.execute("UPDATE payments SET payment_status = 'Failed', updated_at = ? WHERE booking_id = ?", (now_iso, booking_id))

    cursor.execute("""
    INSERT INTO notifications (id, farmer_id, title, message, type, is_read, is_active, created_at)
    VALUES (?, ?, 'Booking Cancelled', ?, 'booking', 0, 1, ?)
    """, (str(uuid.uuid4()), b_dict["farmer_id"], f"Booking token {b_dict['token_number']} has been cancelled.", now_iso))

    conn.commit()
    conn.close()

    return {"success": True, "message": f"Booking {b_dict['token_number']} cancelled successfully."}

# ============================================================================
# QUEUE TRACKING ENDPOINTS
# ============================================================================

@app.get("/api/queue/{booking_id}", tags=["Queue"])
def get_queue_status(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Live queue position, estimated wait time, and current stage progress."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
    SELECT b.id as booking_id, b.token_number, b.status as booking_status, b.farmer_id, b.crop_name, b.quantity_quintals,
           c.name as centre_name,
           q.queue_number, q.estimated_wait_minutes, q.current_stage
    FROM bookings b
    JOIN procurement_centres c ON b.centre_id = c.id
    LEFT JOIN queues q ON b.id = q.booking_id
    WHERE b.id = ? AND b.is_active = 1
    """, (booking_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Queue status not found for booking.")

    res = dict(row)
    if current_user["role"] != "admin" and res["farmer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden.")

    stage_name = res["current_stage"] or res["booking_status"]
    stage_idx = PIPELINE_STAGES.index(stage_name) if stage_name in PIPELINE_STAGES else 0

    return {
        "booking_id": res["booking_id"],
        "token_number": res["token_number"],
        "centre_name": res["centre_name"],
        "crop_name": res["crop_name"],
        "quantity_quintals": res["quantity_quintals"],
        "queue_number": res["queue_number"] or 1,
        "estimated_wait_minutes": res["estimated_wait_minutes"] or 15,
        "current_stage": stage_name,
        "stage_index": stage_idx,
        "total_stages": len(PIPELINE_STAGES),
        "all_stages": PIPELINE_STAGES
    }

# ============================================================================
# PAYMENTS ENDPOINTS
# ============================================================================

@app.get("/api/payments", tags=["Payments"])
def get_payments(current_user: dict = Depends(get_current_user)):
    """Farmer: View own transparent payouts list and breakdown."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
    SELECT p.*, b.token_number, b.crop_name, b.quantity_quintals, b.price_per_quintal_at_booking,
           b.mandi_fee, b.labor_charge, b.transport_charge, b.total_deductions,
           c.name as centre_name
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    JOIN procurement_centres c ON b.centre_id = c.id
    WHERE p.farmer_id = ? AND p.is_active = 1
    ORDER BY p.created_at DESC
    """, (current_user["id"],))

    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

# ============================================================================
# NOTIFICATIONS ENDPOINTS
# ============================================================================

@app.get("/api/notifications", tags=["Notifications"])
def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get notifications for current farmer."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM notifications
    WHERE farmer_id = ? AND is_active = 1
    ORDER BY created_at DESC
    LIMIT 30
    """, (current_user["id"],))

    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/notifications/{notification_id}/read", tags=["Notifications"])
def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark notification as read."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND farmer_id = ?", (notification_id, current_user["id"]))
    conn.commit()
    conn.close()
    return {"success": True}

# ============================================================================
# ADMIN PORTAL ENDPOINTS (ROLE ENFORCED: ADMIN)
# ============================================================================

@app.get("/api/admin/dashboard", tags=["Admin"])
def get_admin_dashboard(admin: dict = Depends(require_admin)):
    """Aggregate statistics for the administrative dashboard."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    today_str = datetime.date.today().isoformat()

    cursor.execute("SELECT COUNT(*) FROM farmers WHERE role = 'farmer' AND is_active = 1")
    total_farmers = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM bookings WHERE booking_date = ? AND is_active = 1 AND status != 'Cancelled'", (today_str,))
    today_bookings = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM bookings WHERE status NOT IN ('Completed', 'Cancelled') AND is_active = 1")
    in_queue_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM bookings WHERE status = 'Completed' AND is_active = 1")
    completed_bookings = cursor.fetchone()[0]

    cursor.execute("""
    SELECT COALESCE(SUM(quantity_quintals), 0),
           COALESCE(SUM(gross_amount), 0),
           COALESCE(SUM(net_amount), 0)
    FROM bookings
    WHERE is_active = 1 AND status != 'Cancelled'
    """)
    totals = cursor.fetchone()
    total_quintals = round(totals[0], 2)
    total_gross_val = round(totals[1], 2)
    total_net_val = round(totals[2], 2)

    cursor.execute("SELECT COUNT(*) FROM payments WHERE payment_status IN ('Pending', 'Processing') AND is_active = 1")
    pending_payments = cursor.fetchone()[0]

    conn.close()

    return {
        "total_farmers": total_farmers,
        "today_bookings": today_bookings,
        "in_queue_count": in_queue_count,
        "completed_bookings": completed_bookings,
        "total_procurement_quintals": total_quintals,
        "total_gross_value": total_gross_val,
        "total_net_payouts": total_net_val,
        "pending_payments_count": pending_payments
    }

@app.get("/api/admin/bookings", tags=["Admin"])
def get_admin_bookings(
    status_filter: Optional[str] = None,
    centre_id: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """Admin: List all bookings with detailed farmer, centre, and queue info."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = """
    SELECT b.*, c.name as centre_name, f.name as farmer_name, f.mobile as farmer_mobile,
           q.queue_number, q.estimated_wait_minutes, q.current_stage,
           p.payment_status, p.payment_reference
    FROM bookings b
    JOIN procurement_centres c ON b.centre_id = c.id
    JOIN farmers f ON b.farmer_id = f.id
    LEFT JOIN queues q ON b.id = q.booking_id
    LEFT JOIN payments p ON b.id = p.booking_id
    WHERE b.is_active = 1
    """
    params = []
    if status_filter:
        query += " AND b.status = ?"
        params.append(status_filter)
    if centre_id:
        query += " AND b.centre_id = ?"
        params.append(centre_id)

    query += " ORDER BY b.created_at DESC"
    cursor.execute(query, tuple(params))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.put("/api/admin/bookings/{booking_id}/status", tags=["Admin"])
def update_booking_status(booking_id: str, req: BookingStatusUpdateRequest, admin: dict = Depends(require_admin)):
    """Admin: Advance booking status through pipeline."""
    new_status = req.status.strip()
    valid_statuses = PIPELINE_STAGES + ["Cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{new_status}'. Allowed: {', '.join(valid_statuses)}"
        )

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM bookings WHERE id = ? AND is_active = 1", (booking_id,))
    b = cursor.fetchone()
    if not b:
        conn.close()
        raise HTTPException(status_code=404, detail="Booking not found.")

    b_dict = dict(b)
    old_status = b_dict["status"]
    now_iso = datetime.datetime.now().isoformat()

    cursor.execute("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?", (new_status, now_iso, booking_id))
    cursor.execute("UPDATE queues SET current_stage = ?, updated_at = ? WHERE booking_id = ?", (new_status, now_iso, booking_id))

    if new_status == "Completed":
        p_ref = f"REF-{datetime.date.today().strftime('%Y%m%d')}-{b_dict['token_number'][-6:]}"
        cursor.execute("""
        UPDATE payments
        SET payment_status = 'Paid', payment_reference = ?, paid_at = ?, updated_at = ?
        WHERE booking_id = ?
        """, (p_ref, now_iso, now_iso, booking_id))

        notif_msg = f"Procurement completed for token #{b_dict['token_number']} ({b_dict['quantity_quintals']} qtl {b_dict['crop_name']}). Net payment of ₹{b_dict['net_amount']:,.2f} disbursed (Ref: {p_ref})."
        cursor.execute("""
        INSERT INTO notifications (id, farmer_id, title, message, type, is_read, is_active, created_at)
        VALUES (?, ?, 'Procurement Completed & Payment Disbursed', ?, 'payment', 0, 1, ?)
        """, (str(uuid.uuid4()), b_dict["farmer_id"], notif_msg, now_iso))

    elif new_status == "Cancelled":
        cursor.execute("UPDATE payments SET payment_status = 'Failed', updated_at = ? WHERE booking_id = ?", (now_iso, booking_id))
        notif_msg = f"Booking #{b_dict['token_number']} was marked as Cancelled by the procurement authority."
        cursor.execute("""
        INSERT INTO notifications (id, farmer_id, title, message, type, is_read, is_active, created_at)
        VALUES (?, ?, 'Booking Cancelled', ?, 'booking', 0, 1, ?)
        """, (str(uuid.uuid4()), b_dict["farmer_id"], notif_msg, now_iso))

    else:
        notif_msg = f"Pipeline Stage Update: Your booking #{b_dict['token_number']} has moved from '{old_status}' to '{new_status}'."
        cursor.execute("""
        INSERT INTO notifications (id, farmer_id, title, message, type, is_read, is_active, created_at)
        VALUES (?, ?, 'Pipeline Stage Advanced', ?, 'pipeline', 0, 1, ?)
        """, (str(uuid.uuid4()), b_dict["farmer_id"], notif_msg, now_iso))

    conn.commit()

    cursor.execute("""
    SELECT b.*, c.name as centre_name, f.name as farmer_name, f.mobile as farmer_mobile,
           p.payment_status, p.payment_reference
    FROM bookings b
    JOIN procurement_centres c ON b.centre_id = c.id
    JOIN farmers f ON b.farmer_id = f.id
    LEFT JOIN payments p ON b.id = p.booking_id
    WHERE b.id = ?
    """, (booking_id,))
    updated_booking = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "message": f"Booking status successfully updated to '{new_status}'.",
        "booking": updated_booking
    }

@app.get("/api/admin/farmers", tags=["Admin"])
def get_admin_farmers(admin: dict = Depends(require_admin)):
    """Admin: List all registered farmers."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
    SELECT id, name, username, mobile, district, state, village, bank_account, ifsc_code, role, created_at
    FROM farmers
    WHERE role = 'farmer' AND is_active = 1
    ORDER BY name ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

# ============================================================================
# ROOT SERVING: Serve index.html
# ============================================================================
INDEX_HTML_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")

@app.get("/")
def serve_index():
    if os.path.exists(INDEX_HTML_PATH):
        return FileResponse(INDEX_HTML_PATH)
    return {"message": "Apna Crop API is running. index.html is being prepared."}

if __name__ == "__main__":
    import uvicorn
    print("Starting Apna Crop backend on http://127.0.0.1:8000 ...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
