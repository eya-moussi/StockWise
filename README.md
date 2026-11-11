# StockWise

Plateforme web de gestion de stock avec réapprovisionnement prédictif.

A full-stack inventory management system covering products, warehouses, stock movements, inventory counting, role-based access control, and audit logging.

## Live Demo

- Frontend: https://erp-project-ll-ec69.vercel.app
- Backend API: https://erp-api-ewd5.onrender.com
- Swagger API docs: https://erp-api-ewd5.onrender.com/api/docs

## Tech Stack

**Backend**
- NestJS
- Prisma ORM
- PostgreSQL
- JWT / Passport
- Argon2
- Swagger
- Jest
- Docker

**Frontend**
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- Axios

**Deployment**
- Vercel (frontend)
- Render (backend API)
- Neon PostgreSQL (production database)
- Docker (local/containerized deployment)

## Main Features

### Authentication
- User registration
- User login
- JWT authentication
- Password hashing with Argon2
- Protected API routes and frontend routes

### Role-Based Access Control
Three roles are supported: `ADMIN`, `STOCK_MANAGER`, `VIEWER`. Protected operations are controlled through role-based authorization guards.

### Product Management
- Product categories
- Product creation and listing
- Product references
- Minimum stock thresholds
- Category association

### Warehouse Management
Warehouse types: `PRINCIPAL`, `PRODUCTION`, `DISTRIBUTION`, `RETOUR`, `REBUT`. Warehouses can contain storage locations.

### Stock Management
Stock movement types: `IN`, `OUT`, `TRANSFER`, `RETURN_CLIENT`, `RETURN_SUPPLIER`, `CORRECTION`.

Stock levels are maintained per product and warehouse using atomic, concurrency-safe updates. Movements record the authenticated author (`createdBy`).

### Inventory Counts
- Inventory count creation
- Count lines with system quantity and counted quantity
- Discrepancy calculation and justification
- Validation workflow (records a correction movement)

### Audit Logs
The backend records API activity and important operations: HTTP action, entity, entity ID, user, user email, and timestamp. A frontend audit-log viewer is included.

### Low Stock Alerts
Products with stock below their configured minimum threshold are surfaced as low-stock alerts on the dashboard.

## Project Structure

```
StockWise/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── auth/
│       ├── users/
│       ├── products/
│       ├── product-categories/
│       ├── warehouses/
│       ├── locations/
│       ├── stock-movements/
│       ├── stock-levels/
│       ├── inventory-counts/
│       ├── audit-logs/
│       └── common/
│
├── frontend/
│   ├── app/
│   │   ├── (dashboard)/
│   │   └── login/
│   ├── components/
│   └── services/
│
├── docker-compose.yml
└── README.md
```

## Database

The application uses PostgreSQL with Prisma ORM. Main entities: `Role`, `User`, `ProductCategory`, `Product`, `Warehouse`, `Location`, `StockMovement`, `StockLevel`, `InventoryCount`, `InventoryCountLine`, `AuditLog`.

The schema is at `backend/prisma/schema.prisma`.

## Local Development

### Requirements
- Node.js
- npm
- PostgreSQL or Docker
- Git

### Backend

```bash
cd backend
npm install
```

Create a `.env` file (see `backend/.env.example`):

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mip_erp"
JWT_SECRET="your-development-secret"
SEED_ADMIN_PASSWORD="..."
SEED_STOCK_MANAGER_PASSWORD="..."
SEED_VIEWER_PASSWORD="..."
```

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

- API: http://localhost:3001
- Swagger: http://localhost:3001/api/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

Set `NEXT_PUBLIC_API_BASE_URL` if the API is not on `http://localhost:3001/api/v1`.

## Docker

```bash
docker compose up --build
docker compose down
```

## Seed Data

`backend/prisma/seed.ts` creates demo data: roles, demo users, product categories, products, warehouses, locations, stock movements, stock levels, inventory counts, and audit data.

The seed reads demo passwords from the `SEED_ADMIN_PASSWORD`, `SEED_STOCK_MANAGER_PASSWORD`, and `SEED_VIEWER_PASSWORD` environment variables and fails if any are missing. Do not run the seed against production unless the production dataset is intentionally being updated.

## CI/CD

The project includes a GitHub Actions CI pipeline (`.github/workflows/ci.yml`) that verifies backend install/lint/tests/e2e and frontend install/build. Production deployment: GitHub → Vercel (frontend) and GitHub → Render → Neon (backend/database).

## API Documentation

Swagger is available at `/api/docs`. Endpoints cover authentication, users, products, product categories, warehouses, locations, stock movements, stock levels, inventory counts, and audit logs.

## Version

v1.0.0
