# Apna Crop — Smart Procurement Portal (SIH Project)

A full-stack, production-grade agricultural procurement and mandi management platform developed for the Smart India Hackathon. 

Built with:
- **Database:** PostgreSQL / Supabase with Row Level Security (RLS) & Zero Data-Destructive Architecture (`schema.sql`).
- **Backend:** Python FastAPI with SQLite demo backend, JWT Role-Based Access Control (RBAC), live profit/deductions calculation engine, queue management, and automated notifications (`main.py`).
- **Frontend:** Single-page responsive web app with pure Poppins typography, preserved agricultural green theme, split farmer/admin authentication, dynamic pricing, and 7-stage procurement pipeline tracking (`index.html`).
- **Authentication:** Standard Username & Password Authentication with server-side salted **bcrypt** password hashing and farmer self-registration (Zero OTP dependencies).
- **Design & Media:** Responsive **two-column desktop hero layout**, **Lucide & FontAwesome icons**, high-resolution agritech photography, crop glyphs, and custom vector empty states.
- **Localization:** Multilingual support in **English**, **తెలుగు (Telugu)**, and **हिंदी (Hindi)**.

---

## 1. Icon Library & Image Sources

### Icon Libraries
- **Lucide Icons:** Integrated via CDN:
  `<script src="https://unpkg.com/lucide@latest"></script>`
- **FontAwesome 6:** Integrated via CDN:
  `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />`
- Contextual icons placed throughout all inputs (user, lock, eye, phone, sprout, location-pin, calendar, clock, weight scale, building, bank).

### Photography & Visual Illustrations
1. **Login & Registration Hero Banner (Left Column):**
   `https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80`
   *Description: Modern Indian agriculture wheat field with farmer and green gradient overlay.*
2. **Farmer Dashboard Welcome Banner:**
   `https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=80`
   *Description: Golden agricultural harvest landscape with live weather snippet.*
3. **APMC Mandi Procurement Center Graphic:**
   `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80`
   *Description: Modern state APMC grain yard with electronic weighbridge notice.*
4. **Crop Thumbnails & Glyphs:**
   Dynamic badges for all 8 official crops: 🌾 Wheat, 🌾 Paddy (Common & Grade A), 🌽 Maize, ⚪ Cotton, 🟡 Soybean, 🌼 Mustard, 🥜 Groundnut.
5. **Vector SVG Empty States:**
   Custom vector SVGs designed in `#16823B` and `#E9F7EE` for Empty Calendar (Bookings), Empty Ticket Pass (Tokens), Empty Queue, and Empty Wallet (Payments).

---

## 2. Reconciled API Reference Table

All endpoints are organized under the unified `/api/...` contract:

| Method | Path | Role Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Farmer self-registration (`name`, `mobile`, `username`, `password`, `village`, `district`, `state`). Password hashed with bcrypt; role forced to `'farmer'`. |
| `POST` | `/api/auth/login` | Public | Universal login for Farmers and Admins using `username`/`mobile` + `password`. Returns JWT with authoritative role. |
| `GET` | `/api/auth/me` | Authenticated | Validates session token and returns logged-in user profile & role. |
| `GET` | `/api/profile` | Authenticated | Retrieves current user's profile details. |
| `PUT` | `/api/profile` | Authenticated | Persistently updates current user's village, district, bank account, and IFSC. |
| `GET` | `/api/crops` | Authenticated / Public | Returns active crops catalog and official MSP price per quintal. |
| `POST` | `/api/crops` | **Admin only** (`403` otherwise) | Creates a new crop type and starting procurement rate (per quintal > 0). |
| `PUT` | `/api/crops/{crop_id}` | **Admin only** (`403` otherwise) | Updates existing crop procurement price and details. |
| `GET` | `/api/deductions` | Authenticated | Retrieves current state deduction configuration (Mandi fee %, labor, transport). |
| `PUT` | `/api/deductions` | **Admin only** (`403` otherwise) | Configures standard deduction rates used for transparent profit calculations. |
| `GET` | `/api/centres` | Authenticated | Lists operating government mandis, daily capacities, and locations. |
| `POST` | `/api/bookings` | **Farmer** | Creates slot reservation with immutable financial breakdown snapshot. |
| `GET` | `/api/bookings` | Authenticated | Lists own bookings for farmers; lists all bookings for admins. |
| `GET` | `/api/bookings/{id}` | Authenticated | Retrieves specific booking details and digital token pass data. |
| `POST` | `/api/bookings/{id}/cancel`| Authenticated (Owner/Admin) | Soft-cancels slot reservation (zero data destruction). |
| `GET` | `/api/queue/{booking_id}` | Authenticated | Real-time queue position, estimated wait time, and 7-stage progress. |
| `GET` | `/api/payments` | Authenticated | Lists farmer payout slips with gross, itemized deductions, and net amount. |
| `GET` | `/api/notifications` | Authenticated | Retrieves farmer notifications (booking, queue, pipeline, payment). |
| `POST` | `/api/notifications/{id}/read`| Authenticated | Marks notification alert as read. |
| `GET` | `/api/admin/dashboard` | **Admin only** | Aggregated state analytics: farmers, bookings, queue, gross value, net payouts. |
| `GET` | `/api/admin/bookings` | **Admin only** | Admin pipeline list of all bookings across all mandis with status filters. |
| `PUT` | `/api/admin/bookings/{id}/status`| **Admin only** | Advances procurement stage (`Booked` → `Arrived` → `Verification` → `Weighing` → `Quality Check` → `Final Acceptance` → `Completed`), dispatches alerts, and triggers DBT payout. |
| `GET` | `/api/admin/farmers` | **Admin only** | Lists all registered farmers and contact information. |

---

## 3. Default Seeded Credentials

When launched, `main.py` automatically initializes the database and seeds the system with bcrypt-hashed passwords:

### 👑 State Administrator Account
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** `admin` (Access to Crop Management, Pipeline Control, and State Analytics)

### 🌾 Demonstration Farmer Accounts
- **Farmer 1 (Ramesh Patel):** Username: `ramesh` &bull; Password: `Farmer@123` (Mobile: `9876543210`)
- **Farmer 2 (Suresh Kumar):** Username: `suresh` &bull; Password: `Farmer@123` (Mobile: `9876543211`)
- **Farmer 3 (Anita Devi):** Username: `anita` &bull; Password: `Farmer@123` (Mobile: `9876543212`)

---

## 4. Profit & Payout Calculation Logic

Historical bookings snapshot all financial parameters at the time of reservation, preserving auditability against future MSP or fee changes:

$$\text{Gross Amount} = \text{Quantity (quintals)} \times \text{Price per Quintal (MSP)}$$
$$\text{Mandi Fee} = \text{Gross Amount} \times \left(\frac{\text{Mandi Fee Percent}}{100}\right) \quad (\text{Default: } 1.5\%)$$
$$\text{Labor Charge} = \text{Quantity} \times \text{Labor Charge per Quintal} \quad (\text{Default: } ₹20/\text{qtl})$$
$$\text{Transport Charge} = \text{Quantity} \times \text{Transport Charge per Quintal} \quad (\text{Default: } ₹25/\text{qtl})$$
$$\text{Total Deductions} = \text{Mandi Fee} + \text{Labor Charge} + \text{Transport Charge}$$
$$\mathbf{\text{Net Amount (DBT Payout)}} = \mathbf{\text{Gross Amount} - \text{Total Deductions}}$$

---

## 5. Running the Application

### Prerequisites
- Python 3.9+
- Dependencies: `pip install fastapi uvicorn pydantic pyjwt bcrypt httpx`

### Start the Server
```bash
python main.py
```
or
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser and navigate to:
**`http://127.0.0.1:8000/`**

### Run Automated Test Suite
```bash
python test_backend.py
```
