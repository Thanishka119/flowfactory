# FlowFactory Development Progress

## Current Milestone

Current Milestone: M4 — Authentication and RBAC (Completed)

## Milestone Status Checklist

- [x] **M0 — Documentation and Architecture** *(Completed)*
- [x] **M1 — Project Foundation** *(Frontend + Backend Scaffolding & Health Endpoint)*
- [x] **M2 — Database Foundation** *(PostgreSQL 18 & Prisma Schema Migrations & Seeding)*
- [x] **M3 — Backend Foundation** *(Centralized Inventory Service Core)*
- [x] **M4 — Authentication and RBAC**
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

Milestone M3 (Backend Foundation) completed:
- Implemented centralized `InventoryService` for all stock-changing operations.
- Implemented atomic stock mutations that update `InventoryItem.currentStock` and create `InventoryTransaction` ledger entries together.
- Established signed ledger quantities: stock increases use positive quantities and stock decreases use negative quantities.
- Implemented negative-stock protection with explicit `allowNegativeStock` override support.
- Added inventory domain errors for missing/inactive items, invalid quantities, insufficient stock, invalid transaction types, and transaction failures.
- Added optional `Prisma.TransactionClient` propagation so future Purchase, Production, and Sales modules can participate in an outer database transaction.
- Implemented stock adjustment, current-stock retrieval, paginated transaction history, and stock reconciliation.
- Added Vitest-based automated tests covering inventory mutations, validation, signed ledger entries, balance tracking, adjustments, history, reconciliation, and transaction-client propagation.
- Verified TypeScript with `npx tsc --noEmit` successfully.
- Verified the Inventory Service test suite with **21/21 tests passing**.

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

**M4 — Authentication and RBAC**.