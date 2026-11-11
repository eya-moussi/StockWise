ERP Management System

A full-stack ERP management system focused on inventory, warehouse management, stock movements, inventory counting, role-based access control, and audit logging.

Live Demo

Frontend:

https://erp-project-ll-ec69.vercel.app

Backend API:

https://erp-api-ewd5.onrender.com

Swagger API Documentation:

https://erp-api-ewd5.onrender.com/api/docs

Tech Stack
Backend
NestJS
Prisma ORM
PostgreSQL
JWT
Passport
Argon2
Swagger
Jest
Docker
Frontend
Next.js
React
TypeScript
Tailwind CSS
Axios
React Hook Form
Zod
Deployment
Vercel for the frontend
Render for the backend API
Neon PostgreSQL for the production database
Docker for local/containerized deployment
Architecture
Users
  |
  v
Vercel
Next.js Frontend
  |
 HTTPS
  |
  v
Render
NestJS API
  |
  v
Neon
PostgreSQL
Main Features
Authentication
User registration
User login
JWT authentication
Password hashing with Argon2
Protected API routes
Role-Based Access Control

The system supports three roles:

ADMIN
STOCK_MANAGER
VIEWER

Protected operations are controlled through role-based authorization.

Product Management
Product categories
Product creation
Product listing
Product references
Minimum stock thresholds
Category association
Warehouse Management

The system supports different warehouse types:

PRINCIPAL
PRODUCTION
DISTRIBUTION
RETOUR
REBUT

Warehouses can contain storage locations.

Stock Management

The backend supports the following stock movement types:

IN
OUT
TRANSFER
RETURN_CLIENT
RETURN_SUPPLIER
CORRECTION

Stock levels are maintained per product and warehouse.

Inventory Counts

Inventory counting supports:

Inventory count creation
Count lines
System quantity
Counted quantity
Discrepancy calculation
Justification
Validation workflow
Low Stock Alerts

Products with stock below their configured minimum stock threshold are displayed as low-stock alerts on the dashboard.

Audit Logs

The backend records API activity and important operations, including:

HTTP action
Entity
Entity ID
User
User email
Timestamp
Project Structure
erp-project/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── products/
│   │   ├── product-categories/
│   │   ├── warehouses/
│   │   ├── locations/
│   │   ├── stock-movements/
│   │   ├── stock-levels/
│   │   ├── inventory-counts/
│   │   ├── audit-logs/
│   │   └── common/
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── products/
│   │   ├── warehouses/
│   │   ├── stock-movements/
│   │   ├── inventory-counts/
│   │   └── audit-logs/
│   ├── components/
│   └── package.json
│
├── doc/
│   ├── er-diagram.md
│   ├── er-diagram.mmd
│   └── er-diagram.png
│
├── docker-compose.yml
└── README.md
Database

The application uses PostgreSQL with Prisma ORM.

Main entities include:

Role
User
ProductCategory
Product
Warehouse
Location
StockMovement
StockLevel
InventoryCount
InventoryCountLine
AuditLog

The database schema is available at:

backend/prisma/schema.prisma
ER Diagram

The generated ER diagram is available at:

doc/er-diagram.png




Local Development
Requirements
Node.js
npm
PostgreSQL or Docker
Git
Backend
cd backend
npm install

Create a .env file:

DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mip_erp"
JWT_SECRET="your-development-secret"

Generate the Prisma client:

npx prisma generate

Run database migrations:

npx prisma migrate dev

Seed the database:

npx prisma db seed

Start the backend:

npm run start:dev

The API will be available at:

http://localhost:3001

Swagger documentation:

http://localhost:3001/api/docs
Frontend
cd frontend
npm install
npm run dev

The frontend will be available at:

http://localhost:3000
Docker

The project includes Docker configuration for running the application with PostgreSQL.

Build and start the containers:

docker compose up --build

Stop the containers:

docker compose down
Seed Data

The project includes a Prisma seed script:

backend/prisma/seed.ts

The seed creates realistic demo data including:

Roles
Demo users
Product categories
Products
Warehouses
Locations
Stock movements
Stock levels
Inventory counts
Audit data

Run the seed against a development database:

cd backend
npx prisma db seed

Do not run the seed against the production database unless the production dataset is intentionally being updated.

Demo Accounts
Administrator
Email: admin@erp.local
Password: ChangeMe123!
Stock Manager
Email: stock.manager@erp.local
Password: StockManager123!
Viewer
Email: viewer@erp.local
Password: Viewer123!
CI/CD

The project includes a GitHub Actions CI pipeline.

The pipeline verifies:

Backend installation
Backend linting
Backend unit tests
Backend end-to-end tests
Frontend installation
Frontend tests
Frontend build

Production deployment uses:

GitHub
   |
   +----> Vercel
   |      Frontend
   |
   +----> Render
          Backend API
             |
             v
           Neon
        PostgreSQL
Production Verification

The deployed v1 application was tested in production.

Verified:

Authentication
Dashboard
Product listing
Product creation
Warehouse listing
Stock movement API
Inventory count listing
Audit log viewer
Low-stock alerts
Production database connectivity
Demo Dataset

The production demo dataset contains realistic inventory data including:

Steel Sheet 2mm
Industrial Motor 5kW
Cardboard Box 40x30
Hydraulic Oil 20L
Industrial Safety Gloves

The dashboard demonstrates:

Current stock levels
Warehouse stock
Low-stock alerts
Stock movement activity
API Documentation

Swagger is available at:

https://erp-api-ewd5.onrender.com/api/docs

The API includes endpoints for:

Authentication
Users
Products
Product categories
Warehouses
Locations
Stock movements
Stock levels
Inventory counts
Audit logs
Current Frontend Status

The main production frontend pages are available for:

Login
Dashboard
Products
Product creation
Warehouses
Stock movements
Inventory counts
Audit logs

The Stock Movements and Inventory Counts backend workflows are implemented. Some dedicated frontend management screens remain planned for a future iteration.

Version
v1.0.0
Project Status

The ERP Management System v1 is deployed, tested, and documented as a working full-stack application.

Component	Deployment
Frontend	Vercel
Backend	Render
Database	Neon PostgreSQL
Status	Deployed
Version	v1.0.0