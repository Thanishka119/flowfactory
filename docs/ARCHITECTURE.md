# FlowFactory Architecture

## Technology Stack

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
- Prisma

### Cloud
- AWS S3
- AWS Textract

## Architecture

Frontend
    ↓
REST API
    ↓
Backend
    ↓
Prisma
    ↓
PostgreSQL

Invoice:
Frontend
    ↓
Backend
    ↓
S3
    ↓
AWS Textract
    ↓
Invoice Processing
    ↓
Verification
    ↓
Purchase Service
    ↓
Inventory Service

## Core Principle

Every stock-changing operation must go through the centralized Inventory Service.

Purchase
Consumption
Production
Sale
Adjustment

must never independently modify inventory.