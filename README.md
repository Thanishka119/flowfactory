# FlowFactory — Smart Inventory Management System

FlowFactory is an enterprise-grade Smart Inventory Management System (SIMS) designed to manage the end-to-end lifecycle of materials and products with complete visibility, traceability, and intelligence.

```
Purchase → Inventory → Consumption → Production → Finished Goods → Sales
```

---

## 1. Project Overview

FlowFactory enables manufacturing and distribution organizations to streamline procurement, automate invoice data ingestion with human-in-the-loop verification, track multi-stage production and material consumption, enforce strict inventory transaction ledgers, and prevent stock shortages through predictive analytics.

### Core Architectural Invariants
* **Centralized Inventory Service:** All stock-changing operations (Purchases, Consumption, Production, Sales, Adjustments) are routed exclusively through one centralized service layer.
* **Immutable Transaction Ledger:** The `InventoryTransaction` ledger is the single source of truth for stock history.
* **Human-Verified OCR:** Extracted OCR invoice data is always reviewed and verified by a user before any purchase is confirmed or inventory is updated.
* **Client-Agnostic REST API:** The backend API is designed to serve both the React web application and a future Flutter mobile application.

---

## 2. Current Architecture

```text
React Web Frontend (Vite + TypeScript)
               ↓ HTTPS / REST (JSON + Bearer JWT)
Node.js + Express Backend API (Zod Validation)
               ↓
Domain Services Layer (Purchase, Production, Sales, OCR)
               ↓
Centralized Inventory Service
               ↓ Atomic Transactions ($transaction)
PostgreSQL Database (Prisma ORM)
```

---

## 3. Technology Stack

### Frontend
* **Core:** React 19, TypeScript, Vite
* **Styling & UI:** Tailwind CSS, shadcn/ui primitives, Lucide React icons
* **Routing:** React Router v7
* **State & Data Fetching:** TanStack Query v5 (React Query)
* **Forms & Validation:** React Hook Form, Zod
* **Data Visualization:** Recharts

### Backend
* **Runtime & Framework:** Node.js (v20+ / v24+), Express v4, TypeScript
* **Validation & Security:** Zod, Helmet, CORS
* **Logging:** Morgan, Structured Console Logger
* **Architecture:** Controller-Service-Repository Pattern

### Database & Storage (Planned for M2 & M10)
* **Database:** PostgreSQL via Prisma ORM
* **Object Storage:** Pluggable `IStorageService` (Local filesystem during dev / AWS S3 in production)
* **OCR Engine:** Pluggable `IOCRService` (Mock fixtures during dev / AWS Textract in production)

---

## 4. Folder Structure

```text
flowfactory/
├── backend/                    # Node.js + Express REST API
│   ├── src/
│   │   ├── config/             # Environment validation & configuration
│   │   ├── controllers/        # HTTP request handlers
│   │   ├── middleware/         # Error handling, request logging, security
│   │   ├── routes/             # Express API v1 route definitions
│   │   ├── services/           # Business domain services (including Central Inventory Service)
│   │   ├── repositories/       # Database data access layer
│   │   ├── types/              # Standard API response interfaces
│   │   ├── utils/              # Structured logger & utility helpers
│   │   ├── app.ts              # Express application factory
│   │   └── server.ts           # HTTP server startup
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React + Vite web application
│   ├── src/
│   │   ├── assets/             # Static assets
│   │   ├── components/         # Shared UI & layout components
│   │   │   └── ui/             # shadcn/ui components (Button, Card, Badge...)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── layouts/            # Page shell & navigation layouts
│   │   ├── lib/                # Utilities & Axios client instance
│   │   ├── pages/              # View pages (HomePage, etc.)
│   │   ├── routes/             # React Router route definitions
│   │   ├── services/           # Frontend API consumer services
│   │   ├── types/              # Shared frontend TypeScript interfaces
│   │   ├── App.tsx             # Providers & Router setup
│   │   ├── index.css           # Tailwind CSS directives & variables
│   │   └── main.tsx            # React application entrypoint
│   ├── public/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── docs/                       # Project specifications & progress
│   ├── AI_RULES.md
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── PRD.md
│   └── PROGRESS.md
├── .env.example
├── .gitignore
├── GEMINI.md
├── package.json                # Root workspace configuration
└── README.md
```

---

## 5. Prerequisites

* **Node.js:** v20.x or higher (Tested on Node v24.x)
* **Package Manager:** `npm` v10+ (Pre-installed with Node.js)
* **OS:** Windows 10/11, macOS, or Linux

---

## 6. Installation Instructions

Clone the repository and install all dependencies for both backend and frontend:

```bash
# 1. From the project root, install all workspace packages
npm install

# Alternatively, install individually:
cd backend && npm install
cd ../frontend && npm install
```

---

## 7. Environment Variables

Create `.env` files in both `backend` and `frontend` using the provided `.env.example` templates:

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
API_PREFIX=/api/v1
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 8. Running the Application

### Option A: Run Backend and Frontend Concurrently (from root)
```bash
# Start backend and frontend simultaneously
npm run dev
```

### Option B: Run Individually

**Start Backend Server:**
```bash
cd backend
npm run dev
# Server will start on http://localhost:5000
```

**Start Frontend Development Server:**
```bash
cd frontend
npm run dev
# Vite client will start on http://localhost:5173
```

---

## 9. Health Check Endpoint

To verify that the backend REST API is running:

```bash
GET http://localhost:5000/api/v1/health
```

**Example JSON Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "FlowFactory API",
    "version": "0.1.0",
    "timestamp": "2026-08-30T07:15:00.000Z",
    "uptimeSeconds": 12,
    "environment": "development"
  }
}
```

---

## 10. Development Status & Current Milestone

* **Current Milestone:** **M1 — Project Foundation** (Complete)
* **Next Milestone:** **M2 — Database Foundation** (PostgreSQL + Prisma Schema + Migrations)

For detailed roadmap tracking, see [`docs/PROGRESS.md`](docs/PROGRESS.md).
