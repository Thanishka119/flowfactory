# FlowFactory Development Progress

## Current Milestone

Current Milestone: M5 — Frontend Foundation (Completed)

## Milestone Status Checklist

- [x] **M0 — Documentation and Architecture** *(Completed)*
- [x] **M1 — Project Foundation** *(Frontend + Backend Scaffolding & Health Endpoint)*
- [x] **M2 — Database Foundation** *(PostgreSQL 18 & Prisma Schema Migrations & Seeding)*
- [x] **M3 — Backend Foundation** *(Centralized Inventory Service Core)*
- [x] **M4 — Authentication and RBAC**
- [x] **M5 — Frontend Foundation**
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

Milestone M5 (Frontend Foundation) completed:

- Added `src/types/auth.ts` — `AuthUser`, `LoginRequest`, `LoginResponse`, `RefreshResponse`, `MeResponse` TypeScript interfaces.
- Added `src/services/auth.service.ts` — thin service layer over `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`.
- Added `src/lib/tokenStorage.ts` — centralised localStorage token read/write module (`ff_access_token`, `ff_refresh_token`). All token access goes through this module.
- Updated `src/lib/api.ts` — added request interceptor (injects `Authorization: Bearer` header) and response interceptor (silent token refresh on 401, queues concurrent requests, redirects to `/login` on refresh failure).
- Added `src/context/AuthContext.tsx` — React context providing `user`, `isAuthenticated`, `isLoading`, `login()`, `logout()`. Restores session on mount via `GET /auth/me`.
- Added `src/hooks/useAuth.ts` — convenience hook for reading `AuthContext`.
- Added `src/components/auth/ProtectedRoute.tsx` — route guard that shows a loading screen during session verification, redirects to `/login` if unauthenticated, renders `<Outlet />` when authenticated.
- Added `src/components/ui/input.tsx` and `src/components/ui/label.tsx` — shadcn-style Input and Label primitives needed for the login form.
- Added `src/pages/LoginPage.tsx` — login form with Zod validation, password show/hide toggle, loading state, error banner, and redirect guard for already-authenticated users.
- Added `src/components/layout/Sidebar.tsx` — responsive collapsible sidebar with NavLink active-state highlighting, mobile slide-in with overlay, and "Coming soon" states for M7+ modules.
- Added `src/components/layout/Topbar.tsx` — top bar with mobile hamburger, user name/role display, and user dropdown with logout.
- Replaced `src/layouts/RootLayout.tsx` — full authenticated app shell (sidebar + topbar + `<Outlet />`).
- Updated `src/routes/index.tsx` — auth-aware router: `/login` is public; all other routes are wrapped in `ProtectedRoute`; root `/` redirects to `/dashboard`.
- Added `src/pages/DashboardPage.tsx` — M5 stub dashboard showing user name, role, and KPI placeholder cards (real data in M18).
- Added `src/pages/NotFoundPage.tsx` — 404 page with return-to-dashboard link.
- Updated `src/App.tsx` — wrapped app with `<AuthProvider>`.
- Verified TypeScript: `tsc --noEmit` — **0 errors**.
- Verified production build: `vite build` — **success** (exit code 0, no warnings related to code).

---

## Important Architectural Decisions Finalized

1. **Package Manager:** Standardised on `npm`.
2. **Offline Development:** Pluggable interfaces for Storage (`IStorageService`) and OCR (`IOCRService`) allowing full local development before activating AWS S3 and Textract.
3. **Inventory Source of Truth:** `InventoryTransaction` ledger is the absolute source of truth. Cached balances are updated atomically inside database transactions.
4. **Centralized Inventory Service:** All stock-changing modules must delegate inventory adjustments exclusively to the central service.
5. **Invoice Line Verification:** Scanned documents default to `PURCHASE` (stock increase), requiring explicit human review and editable item mapping before ledger commitment.
6. **Client-Agnostic REST API:** Stateless JWT authentication and uniform JSON envelopes ready for web and future Flutter mobile clients.
7. **Database Isolation & ORM:** PostgreSQL 18 with Prisma ORM utilising strict foreign keys, enums, and atomic `$transaction` support for centralized inventory integrity.
8. **Token Storage:** Access token and refresh token stored in `localStorage` under `ff_access_token` / `ff_refresh_token`. All access via `tokenStorage` module. Upgrade to `httpOnly` cookies is possible in a future security hardening pass.
9. **Auth Context:** Single `AuthContext` is the source of truth for session state. Token refresh is handled transparently by the Axios response interceptor with concurrent-request queuing.

---

## Next Task

**M6 — Frontend/Backend Integration**