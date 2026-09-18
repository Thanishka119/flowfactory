# FlowFactory Development Progress

## Current Milestone

Current Milestone: M23 — Production Readiness & Final Polish (Completed)

## Milestone Status Checklist

- [x] **M0 — Documentation and Architecture** *(Completed)*
- [x] **M1 — Project Foundation** *(Frontend + Backend Scaffolding & Health Endpoint)*
- [x] **M2 — Database Foundation** *(PostgreSQL 18 & Prisma Schema Migrations & Seeding)*
- [x] **M3 — Backend Foundation** *(Centralized Inventory Service Core)*
- [x] **M4 — Authentication and RBAC**
- [x] **M5 — Frontend Foundation**
- [x] **M6 — Frontend/Backend Integration**
- [x] **M7 — Inventory Management**
- [x] **M8 — Supplier Management**
- [x] **M9 — Purchase Management**
- [x] **M10 — Invoice Upload and OCR**
- [x] **M11 — Invoice Verification and Purchase Integration**
- [x] **M12 — Production Management**
- [x] **M13 — Material Consumption**
- [x] **M14 — Finished Goods**
- [x] **M15 — Sales**
- [x] **M16 — QR Code System**
- [x] **M17 — Traceability**
- [x] **M18 — Dashboard and Alerts**
- [x] **M19 — Reports**
- [x] **M20 — Stock Shortage Prediction**
- [x] **M21 — What-If Simulator**
- [x] **M22 — Audit Logs & Full Security/RBAC Testing**
- [x] **M23 — Production Readiness & Final Polish**
- [ ] **M24 — Deployment**

---

## Current Work

Milestone M6 (Frontend/Backend Integration) completed:

- Verified and aligned frontend API configuration (`VITE_API_URL=http://localhost:5000/api/v1`) with backend Express routing (`PORT=5000`, `API_PREFIX=/api/v1`).
- Verified and validated backend CORS configuration for `http://localhost:5173` with credentials and preflight OPTIONS support for `Content-Type` and `Authorization` headers.
- Enhanced `frontend/src/lib/api.ts` response interceptor:
  - Excluded authentication endpoints (`/auth/login`, `/auth/refresh`) from the 401 silent-refresh loop, allowing invalid credentials and auth rejection errors to return cleanly to components.
  - Guarded against redundant `/login` browser page reloads when already on the login view, preserving form validation and error banner state.
- Enhanced `frontend/src/lib/tokenStorage.ts` and `frontend/src/context/AuthContext.tsx`:
  - Added user profile persistence in `tokenStorage` (`getUser()`, `setUser()`).
  - Integrated `GET /auth/me` with cached user state during session restoration, ensuring the authenticated user's full name and role are preserved across browser refreshes without degradation.
- Added `database?: string` to `frontend/src/types/api.ts` for full alignment with `GET /api/v1/health` response envelope.
- Added test delegation scripts in `backend/package.json` (`"test": "vitest run"`) and root `package.json` (`"test": "npm run test --workspace=backend"`).
- Verified full end-to-end integration against live PostgreSQL and Express backend:
  - Real login verification with admin credentials (`POST /api/v1/auth/login`).
  - Invalid credentials error state verification (401 without reload).
  - Session restoration verification (`GET /api/v1/auth/me`).
  - Silent token refresh flow (`POST /api/v1/auth/refresh`).
  - Logout and server-side refresh token revocation (`POST /api/v1/auth/logout`).
  - Verified rejected refresh attempt after logout.
- Verified TypeScript across monorepo: **0 errors** in backend and frontend.
- Verified production build across monorepo: **both backend and frontend built successfully**.
- Verified automated backend tests: **21/21 passing**.

---

## Important Architectural Decisions Finalized

1. **Package Manager:** Standardised on `npm`.
2. **Offline Development:** Pluggable interfaces for Storage (`IStorageService`) and OCR (`IOCRService`) allowing full local development before activating AWS S3 and Textract.
3. **Inventory Source of Truth:** `InventoryTransaction` ledger is the absolute source of truth. Cached balances are updated atomically inside database transactions.
4. **Centralized Inventory Service:** All stock-changing modules must delegate inventory adjustments exclusively to the central service.
5. **Invoice Line Verification:** Scanned documents default to `PURCHASE` (stock increase), requiring explicit human review and editable item mapping before ledger commitment.
6. **Client-Agnostic REST API:** Stateless JWT authentication and uniform JSON envelopes ready for web and future Flutter mobile clients.
7. **Database Isolation & ORM:** PostgreSQL 18 with Prisma ORM utilising strict foreign keys, enums, and atomic `$transaction` support for centralized inventory integrity.
8. **Token Storage & Session Restoration:** Access token and refresh token stored in `localStorage` under `ff_access_token` / `ff_refresh_token`. User profile stored under `ff_user` and verified against backend `GET /auth/me` on mount.
9. **Centralized Auth & Silent Refresh:** Transparent 401 interceptor handles silent refresh via `POST /auth/refresh` with concurrent request queuing while isolating auth endpoints from refresh loops.

---

## Next Task

**M7 — Inventory Management**