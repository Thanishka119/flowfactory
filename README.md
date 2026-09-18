# FlowFactory — Smart Inventory Management System

FlowFactory is an enterprise-grade Smart Inventory Management System (SIMS) designed to manage the end-to-end lifecycle of materials and products with complete visibility, traceability, and operational intelligence.

```
Purchase → Inventory → Consumption → Production → Finished Goods → Sales
```

---

## 1. Project Overview

FlowFactory enables manufacturing and distribution organizations to streamline procurement, automate invoice data ingestion with human-in-the-loop verification, track multi-stage production and material consumption, enforce strict inventory transaction ledgers, and simulate operational outcomes.

### Core Architectural Invariants
* **Centralized Inventory Service:** All stock-changing operations (`PURCHASE`, `CONSUMPTION`, `PRODUCTION`, `SALE`, `ADJUSTMENT`) are routed exclusively through one centralized service layer (`inventoryService`).
* **Immutable Transaction Ledger:** The `InventoryTransaction` ledger is the single source of truth for stock history.
* **Human-Verified OCR:** Extracted OCR invoice data is always reviewed and verified by a user before any purchase is confirmed or inventory is updated.
* **Read-Only Simulator:** All What-If simulation endpoints and simulator tools are strictly read-only and never alter physical stock or ledger records.
* **Client-Agnostic REST API:** The backend API provides standard JSON envelopes and JWT authentication designed to serve both the React web application and future Flutter mobile applications.

---

## 2. Architecture

```text
React Web Frontend (Vite + TypeScript + Tailwind)
               ↓ HTTPS / REST (JSON + Bearer JWT)
Node.js + Express Backend API (Zod Validation + RBAC)
               ↓
Domain Controllers & Services (Purchase, Production, Sales, OCR, Simulator)
               ↓
Centralized Inventory Service (Single Stock Mutation Authority)
               ↓ Atomic Transactions ($transaction)
PostgreSQL Database (Prisma ORM)
```

---

## 3. Technology Stack

### Frontend
* **Core:** React 19, TypeScript, Vite
* **Styling & UI:** Tailwind CSS (Grayscale Enterprise Theme), shadcn/ui primitives, Lucide React icons
* **Routing:** React Router v7
* **State & Data Fetching:** TanStack Query v5 (React Query)
* **Forms & Validation:** React Hook Form, Zod
* **Data Visualization:** Recharts

### Backend
* **Runtime & Framework:** Node.js, Express v4, TypeScript
* **ORM & Database:** Prisma ORM with PostgreSQL 18
* **Validation & Security:** Zod, Helmet, CORS, bcryptjs, jsonwebtoken
* **Logging & Error Handling:** Morgan, Centralized AppError handler with production sanitization

---

## 4. Setup & Installation

### Prerequisites
* **Node.js:** v20.x or higher
* **PostgreSQL:** v15+ (v18 recommended)
* **Package Manager:** `npm`

### 1. Environment Configuration

Create `.env` in `backend/` and `frontend/`:

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
API_PREFIX=/api/v1
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/flowfactory?schema=public"
JWT_SECRET="replace-with-a-random-secret-at-least-32-characters-long"
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5000/api/v1
```

### 2. Database Migration & Seeding

```bash
cd backend
npx prisma migrate dev
npm run db:seed
```

### 3. Running the Application

**Run Backend:**
```bash
cd backend
npm run dev
# Running on http://localhost:5000
```

**Run Frontend:**
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

---

## 5. Verification & Testing

Run comprehensive tests and builds across both workspaces:

```bash
# Backend verification
cd backend
npm run typecheck
npm test
npm run build

# Frontend verification
cd frontend
npm run typecheck
npm run build
```

---

## 6. Completed Milestones

* **M0–M6:** Foundation, Scaffolding, Database, Centralized Inventory Core, Auth & RBAC, API Integration
* **M7–M11:** Inventory Ledger, Supplier Management, Purchase Orders, OCR Upload & Human Line Verification
* **M12–M15:** Production Management, Material Consumption, Finished Goods Yield, Customer Sales Orders
* **M16–M21:** QR Codes, Traceability, Analytics Dashboard, Reports, What-If Simulator & Operational Intelligence
* **M22–M23:** Comprehensive Security/RBAC Auditing, Test Automation, Production Error Sanitization & Grayscale Enterprise UI Polish
