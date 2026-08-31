# FlowFactory Development Progress

## Current Milestone

M2 — Database Foundation *(Completed)*

## Milestone Status Checklist

- [x] **M0 — Documentation and Architecture** *(Completed)*
- [x] **M1 — Project Foundation** *(Frontend + Backend Scaffolding & Health Endpoint)*
- [x] **M2 — Database Foundation** *(PostgreSQL 18 & Prisma Schema Migrations & Seeding)*
- [ ] **M3 — Backend Foundation** *(Centralized Inventory Service Core)*
- [ ] **M4 — Authentication and RBAC**
- [ ] **M5 — Frontend Foundation**
- [ ] **M6 — Frontend/Backend Integration**
- [ ] **M7 — Inventory Management**
- [ ] **M8 — Supplier Management**
- [ ] **M9 — Purchase Management**
- [ ] **M10 — Invoice Upload and OCR**
- [ ] **M11 — Invoice Verification and Purchase Integration**
- [ ] **M12 — Production Management**
- [ ] **M13 — Material Consumption**
- [ ] **M14 — Finished Goods**
- [ ] **M15 — Sales**
- [ ] **M16 — QR Code System**
- [ ] **M17 — Traceability**
- [ ] **M18 — Dashboard and Alerts**
- [ ] **M19 — Reports**
- [ ] **M20 — Stock Shortage Prediction**
- [ ] **M21 — What-If Simulator**
- [ ] **M22 — Audit Logs**
- [ ] **M23 — Testing and Security**
- [ ] **M24 — Deployment**

---

## Current Work

Milestone M2 (Database Foundation) completed:
- Configured local-only PostgreSQL 18 with Prisma ORM (`@prisma/client` and `prisma` CLI).
- Defined full 20-model Prisma schema (`prisma/schema.prisma`) matching PRD and Database design: Users, Roles, Permissions, Suppliers, Inventory Items, Transactions Ledger, Purchases, Invoices, Production Orders, BOM Items, Consumption Records, Finished Goods Yields, Sales, QR Codes, Alerts, Notifications, and Audit Logs.
- Created and executed initial database migration `20260831141439_init_db_foundation` creating all relational tables, enums, indexes, and foreign key constraints on local database `flowfactory`.
- Implemented and executed database seed script (`prisma/seed.ts`) seeding roles, RBAC permissions, default administrator user, sample suppliers, and initial inventory items.
- Added singleton `PrismaClient` connection manager (`src/config/db.ts`) with query logging and graceful shutdown handlers.
- Updated `/api/v1/health` endpoint with active `SELECT 1` ping reporting `database: "connected"`.

---

## Important Architectural Decisions Finalized

1. **Package Manager:** Standardized on `npm`.
2. **Offline Development:** Pluggable interfaces for Storage (`IStorageService`) and OCR (`IOCRService`) allowing full local development before activating AWS S3 and Textract.
3. **Inventory Source of Truth:** `InventoryTransaction` ledger is the absolute source of truth. Cached balances are updated atomically inside database transactions.
4. **Centralized Inventory Service:** All stock-changing modules must delegate inventory adjustments exclusively to the central service.
5. **Invoice Line Verification:** Scanned documents default to `PURCHASE` (stock increase), requiring explicit human review and editable item mapping before ledger commitment.
6. **Client-Agnostic REST API:** Stateless JWT authentication and uniform JSON envelopes ready for web and future Flutter mobile clients.
7. **Database Isolation & ORM:** PostgreSQL 18 with Prisma ORM utilizing strict foreign keys, enums, and atomic `$transaction` support for centralized inventory integrity.

---

## Next Task

**M3 — Backend Foundation** (Centralized Inventory Service Core, base repositories, and transactional ledger operations).