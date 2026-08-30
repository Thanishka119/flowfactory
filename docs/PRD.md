# FlowFactory — Product Requirements Document

## 1. Product Overview

### Product Name

FlowFactory

### Product Type

Web-based Smart Inventory Management System (SIMS)

### Product Goal

FlowFactory is a web-based inventory and production management platform designed to help organizations manage the complete lifecycle of materials and products.

The system provides visibility and traceability from:

**Purchase → Inventory → Consumption → Production → Finished Goods → Sales**

The system should reduce manual inventory tracking, improve stock accuracy, identify shortages and expiry risks, and provide actionable analytics.

---

# 2. Scope

FlowFactory is a **web-only application**.

There will be no Android or iOS application in the initial version.

The system will provide role-based access for different employees and departments.

---

# 3. Target Users

## 3.1 Admin

Responsibilities:

* Manage users
* Manage roles and permissions
* View overall system activity
* Manage master data
* View reports
* View audit logs
* Configure system settings

## 3.2 Purchase Manager

Responsibilities:

* Manage suppliers
* Create purchases
* Upload purchase invoices
* Scan/process invoices
* Verify extracted invoice information
* Track purchase history

## 3.3 Production Manager

Responsibilities:

* Create production orders
* Define material requirements
* Monitor production
* View material availability
* Manage production completion
* View production history

## 3.4 Warehouse Staff

Responsibilities:

* View inventory
* Receive purchased materials
* Record material consumption
* Scan QR codes
* View stock
* Track inventory movements
* Manage stock adjustments where permitted

## 3.5 Sales Team

Responsibilities:

* Create sales
* View finished goods
* Check finished-goods availability
* Record sales
* View sales history

---

# 4. Core Features

## 4.1 Authentication

The system shall provide:

* Login
* Logout
* User registration where permitted
* Password hashing
* Session/token management
* Current-user information
* Authentication validation

Passwords must never be stored in plaintext.

---

# 5. Role-Based Access Control

The system shall support:

* Admin
* Purchase Manager
* Production Manager
* Warehouse Staff
* Sales Team

Permissions must be enforced on the backend.

The frontend should hide actions that users are not allowed to perform, but backend authorization must remain the final security layer.

---

# 6. Dashboard

The dashboard shall provide an overview of the organization's inventory and operations.

It should display:

* Total inventory items
* Current stock value/summary
* Low-stock items
* Expiring items
* Expired items
* Pending invoice verification
* Purchase summary
* Consumption summary
* Production summary
* Sales summary

Charts may include:

* Purchase trends
* Consumption trends
* Production trends
* Sales trends
* Stock movement

Dashboard values must be calculated from real application data.

---

# 7. Inventory Management

The inventory module is the central component of FlowFactory.

Users with appropriate permissions shall be able to:

* Create inventory items
* Edit inventory items
* View inventory items
* Search inventory
* Filter inventory
* View stock
* View transaction history
* Deactivate items

## Inventory Item Information

An inventory item may contain:

* Item ID
* SKU
* Name
* Description
* Category
* Type
* Unit
* Current stock
* Minimum stock
* Reorder level
* Supplier
* Expiry date where applicable
* QR identifier
* Active/inactive status

## Inventory Types

The system should support:

* Raw Material
* Component
* Finished Good
* Other

---

# 8. Inventory Transaction System

All inventory changes must be traceable.

Supported transaction types:

* PURCHASE
* CONSUMPTION
* PRODUCTION
* SALE
* ADJUSTMENT

## Critical Business Rule

No module should directly manipulate inventory independently.

All stock-changing operations must use a centralized Inventory Service.

Example:

Purchase:

**Purchase → Inventory Service → PURCHASE transaction → Stock increases**

Consumption:

**Production → Inventory Service → CONSUMPTION transaction → Stock decreases**

Production:

**Production → Inventory Service → PRODUCTION transaction → Finished-goods stock increases**

Sale:

**Sale → Inventory Service → SALE transaction → Finished-goods stock decreases**

This prevents different modules from calculating stock differently.

---

# 9. Supplier Management

The system shall allow authorized users to:

* Add suppliers
* Edit suppliers
* View suppliers
* Search suppliers
* Deactivate suppliers
* View supplier purchase history

Supplier information may include:

* Supplier ID
* Supplier name
* Contact person
* Email
* Phone
* Address
* Tax/GST information where applicable
* Lead time
* Status

---

# 10. Purchase Management

The purchase module shall allow authorized users to:

* Create purchases
* Add multiple items
* Select suppliers
* Enter invoice details
* Enter quantities
* Enter unit prices
* Calculate totals
* View purchase history
* View purchase details

## Purchase Workflow

**Create Purchase → Add Items → Verify → Confirm → Update Inventory**

When a purchase is confirmed:

1. Create purchase record.
2. Create purchase items.
3. Create inventory PURCHASE transactions.
4. Increase inventory stock.
5. Link transactions to the purchase.
6. Record the action in the audit log.

The operation should use a database transaction so partial updates do not occur.

---

# 11. Purchase Invoice Scanning

The system shall allow users to upload purchase invoices.

Supported formats should include:

* PDF
* JPG/JPEG
* PNG

## Invoice Workflow

**Upload → Store → OCR → Extract → Match → Verify → Purchase**

The system should:

1. Upload the invoice.
2. Store the original document.
3. Process the invoice using OCR.
4. Extract invoice information.
5. Extract line items.
6. Match extracted items against inventory.
7. Show confidence/status.
8. Allow the user to verify and correct information.
9. Create the purchase only after confirmation.
10. Update inventory through the existing Purchase and Inventory services.

---

# 12. Invoice OCR

OCR should extract information such as:

* Supplier name
* Invoice number
* Invoice date
* Item names
* Item codes/SKUs where available
* Quantities
* Units
* Unit prices
* Taxes where available
* Total amount

AWS Textract will be used as the initial OCR service.

The OCR implementation should be abstracted behind an internal OCR service so another provider can be used in the future if required.

---

# 13. Invoice Verification

OCR results must not directly update inventory.

The verification page shall display:

* Original invoice
* Supplier
* Invoice number
* Invoice date
* Extracted items
* Suggested inventory item
* Quantity
* Unit price
* Confidence/status
* Validation errors

Users should be able to:

* Correct supplier
* Correct invoice information
* Map an extracted item to an inventory item
* Change quantity
* Correct prices
* Remove invalid items
* Confirm the purchase
* Cancel processing

## Critical Rule

Inventory must only be updated after the user verifies and confirms the invoice.

---

# 14. Invoice Item Matching

The system should attempt to match extracted invoice items with existing inventory items.

Matching priority:

1. Exact SKU/item code
2. Exact normalized name
3. Alias/name matching
4. Fuzzy text matching
5. Optional AI/semantic matching

Each suggested match should have:

* Suggested inventory item
* Confidence
* Matching reason

Low-confidence or unmatched items must require manual verification.

The system must never invent an inventory item.

---

# 15. Production Management

Production managers shall be able to:

* Create production orders
* Select finished products
* Enter planned quantity
* View required materials
* Check material availability
* Start production
* Complete production
* View production history

## Production Workflow

**Production Order → Material Check → Consumption → Production Completion → Finished Goods**

The system should calculate required materials based on the product's material requirements.

Before production begins, the system must check whether sufficient materials are available.

Negative stock should not be allowed by default.

---

# 16. Material Consumption

When materials are consumed during production:

1. Identify the production order.
2. Identify required materials.
3. Validate available stock.
4. Create consumption records.
5. Create CONSUMPTION inventory transactions.
6. Reduce material stock.
7. Link consumption to the production order.

All operations should be traceable.

---

# 17. Finished Goods

When production is completed:

1. Validate actual production quantity.
2. Create PRODUCTION inventory transaction.
3. Increase finished-goods inventory.
4. Link finished goods to the production order.

Example:

Production:

10 chairs

Result:

**Finished Goods → Office Chair +10**

---

# 18. Sales Management

Sales users shall be able to:

* Create sales
* Select finished goods
* Enter quantities
* Check availability
* Confirm sales
* View sales history
* View sale details

## Sales Workflow

**Create Sale → Stock Check → Confirm → SALE Transaction → Stock Decrease**

Sales must only reduce finished-goods inventory.

Raw materials must not be reduced by sales transactions.

---

# 19. QR Code System

The system shall provide QR codes for inventory identification.

QR codes may be generated for:

* Raw materials
* Components
* Finished goods

Scanning a QR code should allow authorized users to:

* Identify the item
* View current stock
* View item details
* View recent transactions
* View traceability information

Sensitive information should not be stored directly inside QR codes.

The QR should preferably contain a secure identifier or application URL.

---

# 20. Inventory Traceability

FlowFactory shall provide end-to-end traceability.

Users should be able to trace:

**Purchase Invoice → Purchase → Inventory Transaction → Consumption → Production → Finished Good → Sale**

For an inventory item or finished product, the system should display related records where the user's permissions allow access.

Traceability should include:

* Supplier
* Purchase
* Invoice
* Quantity purchased
* Consumption
* Production order
* Finished product
* Sale

---

# 21. Alerts

The system shall provide alerts for:

### Low Stock

When:

**Current Stock ≤ Reorder Level**

### Expiry

Items approaching their expiry date.

### Expired Items

Items whose expiry date has passed.

### Pending Invoice Verification

Invoices waiting for user verification.

### Potential Shortage

Items predicted to become insufficient based on consumption and stock information.

Users should be able to:

* View alerts
* Filter alerts
* Mark alerts as read
* View alert details

---

# 22. Reports

The system shall provide reports for:

* Purchases
* Inventory
* Consumption
* Production
* Finished goods
* Sales
* Low stock
* Expiry

Reports should support filters such as:

* Date range
* Item
* Category
* Supplier
* Transaction type

CSV export should be supported where practical.

---

# 23. Stock Shortage Prediction

The first version should use a transparent baseline calculation.

### Average Daily Consumption

**Total historical consumption / active days**

### Estimated Days Remaining

**Current Stock / Average Daily Consumption**

The system should compare estimated remaining days against:

* Supplier lead time
* Reorder threshold
* Configured risk threshold

Risk levels:

* LOW
* MEDIUM
* HIGH

The system should display the factors used in the calculation.

The prediction system must not automatically create purchases.

Future versions may replace the baseline with a machine-learning model.

---

# 24. What-If Simulator

The system shall provide a simulation tool for planning.

Users may modify:

* Production quantity
* Expected demand
* Purchase quantity
* Consumption rate
* Time period

The simulator should calculate projected inventory.

It should show:

* Current stock
* Expected consumption
* Projected stock
* Potential shortage
* Potential excess
* Risk level

## Critical Rule

The simulator must never modify actual inventory.

Simulation calculations must remain isolated from real inventory transactions.

---

# 25. Audit Logs

Important actions should be recorded.

Examples:

* Login
* User creation
* User role changes
* Inventory creation/update
* Purchase creation
* Invoice verification
* Stock adjustment
* Production
* Consumption
* Sales

Audit records should contain relevant information such as:

* User
* Action
* Entity
* Entity ID
* Timestamp
* Relevant metadata

---

# 26. UI/UX Requirements

FlowFactory should have a modern premium SaaS design.

Design characteristics:

* Minimal
* Professional
* Clean
* Spacious
* Strong typography
* Consistent spacing
* Subtle borders
* Consistent cards
* Clear tables
* Responsive layout
* Accessible controls

The interface should provide:

* Loading states
* Empty states
* Error states
* Confirmation dialogs
* Toast notifications
* Form validation
* Search
* Filters
* Pagination where appropriate

The design should be inspired by premium SaaS interfaces but must remain original and suitable for an industrial inventory management system.

---

# 27. Security Requirements

The system must:

* Hash passwords securely
* Protect authenticated routes
* Enforce backend authorization
* Validate all API inputs
* Protect against injection attacks
* Secure file uploads
* Validate invoice file types
* Protect S3 resources
* Never expose AWS credentials
* Store secrets in environment variables
* Avoid exposing sensitive information in errors
* Implement appropriate rate limiting
* Maintain audit logs

---

# 28. Non-Functional Requirements

## Performance

Common API requests should respond quickly under normal workload.

## Reliability

Critical stock-changing operations must be atomic.

## Scalability

The architecture should allow future growth in:

* Users
* Inventory items
* Transactions
* Suppliers
* Production orders
* Sales

## Maintainability

Code should be modular and documented.

## Testability

Important business logic must be independently testable.

---

# 29. Core Business Rules

1. All stock changes go through the centralized Inventory Service.
2. Invoice OCR never directly changes inventory.
3. Invoice data must be verified before purchase confirmation.
4. Low-confidence invoice matches require manual review.
5. Negative inventory is not allowed by default.
6. Sales reduce finished goods only.
7. Consumption reduces raw materials/components.
8. Production increases finished-goods inventory.
9. Purchase increases inventory.
10. What-if simulation never modifies real inventory.
11. Backend RBAC is mandatory.
12. Every important inventory operation should be traceable.
13. AI predictions must not silently perform irreversible actions.
14. Real inventory data must be used for dashboard calculations.
15. Business logic must not be duplicated between modules.

---

# 30. Future Enhancements

Potential future features:

* Automatic purchase order generation
* Supplier performance analysis
* Advanced ML demand forecasting
* Multi-location warehouses
* Barcode support
* Email notifications
* WhatsApp notifications
* Advanced approval workflows
* Mobile application
* Multi-company support
* Advanced financial integration

These features are outside the initial development scope unless explicitly added later.

---

# 31. Initial Technology Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* React Router
* TanStack Query
* React Hook Form
* Zod
* Recharts

## Backend

* Node.js
* Express
* TypeScript
* REST API
* Prisma

## Database

* PostgreSQL

## Cloud Services

* AWS S3
* AWS Textract

## Authentication

* JWT
* Argon2 or bcrypt

## Testing

* Vitest/Jest
* Supertest
* React Testing Library

## Version Control

* Git
* GitHub
