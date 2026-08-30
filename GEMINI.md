# FlowFactory AI Development Instructions

## Project

FlowFactory is a Smart Inventory Management System.

It is currently being developed as a web application, with the architecture designed so a Flutter mobile application can be added later.

## Current Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- React Hook Form
- Zod
- Recharts

### Backend
- Node.js
- Express
- TypeScript
- REST API

### Database
- PostgreSQL
- Prisma ORM

### Cloud Services
- AWS S3
- AWS Textract

### Future Mobile Client
- Flutter
- Dart

The Flutter application is NOT part of the current implementation.

Do not create the mobile application unless explicitly instructed.

---

# Architecture

The system must follow:

React Website
        ↓
REST API
        ↓
Node.js + Express
        ↓
Service Layer
        ↓
Prisma
        ↓
PostgreSQL

The frontend must never directly access PostgreSQL.

The backend API must be client-agnostic so that a future Flutter application can use the same API.

---

# Critical Inventory Rule

ALL inventory-changing operations must use a centralized Inventory Service.

Inventory-changing operations include:

- Purchase
- Consumption
- Production
- Sale
- Stock Adjustment

Never modify inventory directly from individual modules.

Example:

Purchase
→ Purchase Service
→ Inventory Service
→ Inventory Transaction
→ Stock Increase

Consumption
→ Consumption Service
→ Inventory Service
→ Inventory Transaction
→ Stock Decrease

Production
→ Production Service
→ Inventory Service
→ Inventory Transaction
→ Finished Goods Increase

Sale
→ Sales Service
→ Inventory Service
→ Inventory Transaction
→ Finished Goods Decrease

---

# Invoice Scanning

Invoice workflow:

Upload Invoice
→ Store Original File
→ OCR using AWS Textract
→ Extract Invoice Data
→ Match Items
→ User Verification
→ Confirm Purchase
→ Inventory Update

OCR must NEVER directly modify inventory.

The user must verify extracted invoice information before the purchase is finalized.

Low-confidence OCR/item matches must require manual verification.

---

# Development Rules

1. Read the PRD before implementing features.
2. Read the architecture documentation before making architectural decisions.
3. Do not implement future milestones automatically.
4. Do not replace the approved technology stack.
5. Do not create duplicate business logic.
6. Do not put business-critical logic in React components.
7. Keep business logic in backend services.
8. Use centralized API services on the frontend.
9. Use TanStack Query for server state.
10. Validate API input.
11. Use database transactions for operations affecting multiple records.
12. Never hardcode secrets.
13. Never commit `.env`.
14. Use `.env.example`.
15. Reuse existing components and services.
16. Do not delete working code without a reason.
17. Do not make major architectural changes without explaining them.
18. Run tests/build checks after significant changes.
19. Update documentation when architecture changes.
20. Update `docs/PROGRESS.md` after completing a milestone.

---

# Development Method

Build FlowFactory incrementally.

The milestone order is:

M0 — Documentation and Architecture
M1 — Project Foundation
M2 — Database Foundation
M3 — Backend Foundation
M4 — Authentication and RBAC
M5 — Frontend Foundation
M6 — Frontend/Backend Integration
M7 — Inventory Management
M8 — Supplier Management
M9 — Purchase Management
M10 — Invoice Upload and OCR
M11 — Invoice Verification and Purchase Integration
M12 — Production Management
M13 — Material Consumption
M14 — Finished Goods
M15 — Sales
M16 — QR Code System
M17 — Traceability
M18 — Dashboard and Alerts
M19 — Reports
M20 — Stock Shortage Prediction
M21 — What-If Simulator
M22 — Audit Logs
M23 — Testing and Security
M24 — Deployment

Only implement the milestone explicitly requested by the user.

---

# Future Mobile Application

The future Flutter application must use the same REST API.

Architecture:

React Website ───┐
                 │
Flutter App ─────┼──→ REST API → Backend → PostgreSQL
                 │
Future Clients ──┘

Do not create separate business logic for Flutter.

---

# Code Quality

Prefer:

- Simple architecture
- Strong typing
- Reusable components
- Clear naming
- Small focused modules
- Proper error handling
- Validation
- Maintainable code

Avoid unnecessary abstraction and unnecessary dependencies.

Before implementing something new, check whether an existing component, service, utility, or API can be reused.