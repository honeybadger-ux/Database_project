# Multi-Hub Courier & Logistics Tracking System

A full-stack logistics tracking application with PostgreSQL, FastAPI, and React — designed for multi-hub parcel routing, real-time tracking, and operational analytics.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    localhost                          │
│                                                       │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────┐ │
│  │ PostgreSQL   │  │ FastAPI       │  │ Vite/React │ │
│  │ :5432        │←─│ :8000         │←─│ :5173      │ │
│  │              │  │ (uvicorn)     │  │ (npm dev)  │ │
│  └──────────────┘  └───────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- **PostgreSQL 15+** (native install or Docker)
- **Python 3.11+** with pip
- **Node.js 18+** with npm

### Option A: Manual Setup (Recommended for Development)

#### 1. Database Setup

**If using Docker for PostgreSQL only:**
```bash
docker run -d --name courier_pg \
  -e POSTGRES_USER=courier \
  -e POSTGRES_PASSWORD=courier123 \
  -e POSTGRES_DB=courier_logistics \
  -p 5432:5432 \
  postgres:15-alpine
```

**If using native PostgreSQL:**
```bash
createdb -U postgres courier_logistics
```

Then initialize the schema and seed data:
```bash
cd database
psql -U courier -d courier_logistics -f init.sql
```

Run trigger tests to verify:
```bash
psql -U courier -d courier_logistics -f tests/test_triggers.sql
```

#### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

#### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App available at: http://localhost:5173

### Option B: Docker Compose (One Command)

```bash
docker-compose up --build
```

This starts all three services:
- Database at `localhost:5432`
- API at `localhost:8000`
- Frontend at `localhost:5173`

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Hub Manager (Mumbai) | rajesh.kumar@courier.com | password123 |
| Hub Manager (Delhi) | neha.agarwal@courier.com | password123 |
| Clerk (Mumbai) | amit.verma@courier.com | password123 |
| Courier (Mumbai) | suresh.yadav@courier.com | password123 |
| Courier (Bangalore) | arun.nair@courier.com | password123 |

All seed employees use password: `password123`

## Application Portals

### 1. Public Tracking (No Auth Required)
- Landing page at `/`
- Enter any tracking number (e.g., `TRK0000001` through `TRK0000020`)
- View complete parcel journey with timeline

### 2. Hub Operations Portal (Authenticated)
- **Dashboard** — Overview of hub operations
- **Parcels** — Register, view, and update parcel statuses
- **Shipments** — Create outbound shipments, receive inbound ones
- **Delivery** — Record delivery attempts (Courier role)

### 3. Admin & Analytics (HUB_MANAGER Role)
- **Hub Management** — Create and manage logistics facilities
- **Employee Management** — Create and manage personnel
- **Analytics Dashboard** — Interactive charts showing:
  - Pipeline status distribution
  - Hub throughput volumes
  - Transit time analysis
  - Delivery success rates

## Seed Data Overview

The database is pre-loaded with:
- **10 customers** across major Indian cities
- **6 hubs** (2 Collection, 2 Sorting, 2 Distribution)
- **15 employees** across all hubs
- **20 parcels** in various lifecycle states:
  - 5 × DELIVERED (completed journeys)
  - 3 × IN_TRANSIT (on vehicles between hubs)
  - 3 × ARRIVED_AT_HUB (at intermediate/destination hubs)
  - 2 × OUT_FOR_DELIVERY (with couriers)
  - 2 × FAILED_DELIVERY (awaiting re-attempt)
  - 3 × Early stages (REGISTERED, PICKED_UP, RECEIVED_AT_ORIGIN_HUB)
  - 1 × CANCELLED
  - 1 × RETURNED_TO_SENDER
- **6 shipments** linking transit legs
- Full tracking history for all parcels

## Database Schema

### Entity Relationships
```
customers ──┬── parcels (sender_id)
             └── parcels (receiver_id)

hubs ────┬── employees (hub_id)
         ├── parcels (origin/destination/current_hub_id)
         └── shipments (from/to_hub_id)

parcels ──┬── tracking_history
          ├── delivery_attempts
          └── shipment_parcels ── shipments

employees ─┬── tracking_history
            ├── shipments (dispatched_by/received_by)
            └── delivery_attempts
```

### Business Invariants Enforced
1. **Physical Singularity** — A parcel can only be at one hub at a time
2. **Ledger Immutability** — Tracking events cannot be updated or deleted
3. **Hub Authorization** — Employees can only scan at their assigned hub
4. **Monotonic Progression** — Parcel states follow a strict state machine
5. **Terminal Finality** — Delivered/cancelled/returned parcels cannot be modified
6. **Temporal Ordering** — Event timestamps must be monotonically increasing

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | PostgreSQL 15+ with PL/pgSQL triggers & stored procedures |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0 (sync), Pydantic v2 |
| Frontend | React 18, Vite 5, Tailwind CSS v3, Recharts, Lucide React |
| Auth | JWT (python-jose) + bcrypt (passlib) |

## Project Structure

```
DSD_Project/
├── database/
│   ├── init.sql                    # Master init script
│   ├── migrations/                 # Schema DDL, triggers, seed data
│   ├── queries/                    # Analytical SQL queries
│   └── tests/                      # Trigger test suite
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # FastAPI entry point
│       ├── config.py               # Settings
│       ├── database.py             # SQLAlchemy engine
│       ├── auth/                   # JWT authentication
│       ├── models/                 # ORM models
│       ├── schemas/                # Pydantic schemas
│       ├── services/               # Business logic
│       └── routers/                # API endpoints
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx                 # Router config
│       ├── context/                # Auth context
│       ├── services/               # API client
│       ├── components/             # Shared UI components
│       └── pages/                  # Page components
├── docker-compose.yml              # Optional: one-command setup
└── README.md                       # This file
```
