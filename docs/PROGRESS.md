# FlowFactory Development Progress

## Current Milestone

M1 — Project Foundation

## Milestone Status Checklist

- [x] **M0 — Documentation and Architecture** *(Completed)*
- [x] **M1 — Project Foundation** *(Frontend + Backend Scaffolding & Health Endpoint)*
- [ ] **M2 — Database Foundation** *(PostgreSQL & Prisma Schema)*
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

Milestone M1 (Project Foundation) completed:
- Root monorepo workspace configuration with npm
- Backend Node.js + Express + TypeScript scaffolding with `/api/v1/health` endpoint
- Frontend React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui scaffolding
- Verified end-to-end communication via TanStack Query and Axios

---

## Important Architectural Decisions Finalized

1. **Package Manager:** Standardized on `npm`.
2. **Offline Development:** Pluggable interfaces for Storage (`IStorageService`) and OCR (`IOCRService`) allowing full local development before activating AWS S3 and Textract.
3. **Inventory Source of Truth:** `InventoryTransaction` ledger is the absolute source of truth. Cached balances are updated atomically inside database transactions.
4. **Centralized Inventory Service:** All stock-changing modules must delegate inventory adjustments exclusively to the central service.
5. **Invoice Line Verification:** Scanned documents default to `PURCHASE` (stock increase), requiring explicit human review and editable item mapping before ledger commitment.
6. **Client-Agnostic REST API:** Stateless JWT authentication and uniform JSON envelopes ready for web and future Flutter mobile clients.

---

## Next Task

**M2 — Database Foundation** (PostgreSQL schema definition, Prisma ORM configuration, migrations, and seed scripts).