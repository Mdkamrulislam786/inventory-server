# Pharmacy Inventory Server

Backend API for a multi-shop pharmacy inventory application. It supports shop-admin onboarding, employee accounts, medicine catalog management, supplier procurement, batch-level inventory, sales, and operational analytics.

The API is built with TypeScript, Express, MongoDB/Mongoose, JWT authentication, and tenant-aware data scoping. Each administrator owns a shop; employees and most domain records are scoped to that shop.

## Main capabilities

- Register a shop and its administrator; add employee accounts.
- Authenticate with JWT access tokens and database-backed refresh tokens.
- Maintain manufacturers, shelves, and medicine catalog records.
- Receive supplier purchases, track outstanding supplier debt, record payments, and process returns.
- Track batches, expiry dates, and stock movements; sell stock using FEFO (first-expiry-first-out).
- View stock/expiry alerts and financial, supplier, and employee analytics.

For the detailed API contract and React Native integration guidance, see [technical-doc.md](technical-doc.md).

## Prerequisites

- Node.js (current LTS recommended)
- npm
- MongoDB

`POST /api/v1/users/register-admin` creates a user and shop inside a MongoDB transaction. For that endpoint to work locally, run MongoDB as a replica set (including a single-node replica set), not as a standalone MongoDB server.

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

```dotenv
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pharmacy_inventory?replicaSet=rs0
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

`MONGO_URI`, `JWT_SECRET`, and `JWT_EXPIRES_IN` are required. `PORT` defaults to `5000` if omitted.

## Run the app

Start the development server with automatic restart:

```bash
npm run dev
```

The server starts at `http://localhost:5000` after connecting to MongoDB.

Build the TypeScript project:

```bash
npm run build
```

Run the compiled production build:

```bash
npm start
```

## API base paths

| Module | Base path |
| --- | --- |
| Users and authentication | `/api/v1/users` |
| Catalog | `/api/v1/catalog` |
| Procurement | `/api/v1/procurement` |
| Inventory | `/api/v1/inventory` |
| Sales | `/api/v1/sales` |
| Analytics | `/api/v1/analytics` |

Example health check note: no dedicated health endpoint exists currently. Use an API endpoint such as `POST /api/v1/users/login` to verify that the running server can accept requests.

## Typical workflow

1. Register an administrator and shop with `POST /api/v1/users/register-admin`.
2. Log in through `POST /api/v1/users/login` and retain the access and refresh tokens.
3. Create manufacturers, shelves, and medicines.
4. Create suppliers and record purchases to stock medicine batches.
5. Let staff search stock and process sales.
6. Monitor low-stock, expiry, and financial analytics.

Protected endpoints expect this header:

```http
Authorization: Bearer <accessToken>
```

For a physical React Native device, do not use `localhost` as the API host—it resolves to the phone itself. Use the development machine's LAN IP address or a deployed HTTPS endpoint.

## Repository structure

```text
src/
  app.ts                         Express configuration and route mounting
  server.ts                      Environment loading, database startup, HTTP server
  core/                          Authentication, tenant, error, and shared middleware
  modules/
    user/                        Authentication, admin onboarding, employees
    catalog/                     Medicines, manufacturers, shelves
    procurement/                 Suppliers, purchases, payments, returns
    inventory/                   Batches, stock-in/out, stock searching
    sales/                       Sales records and checkout workflow
    analytics/                   Alerts, performance, financial reports
```

## Security and production notes

- Use a long, unique `JWT_SECRET`; never commit `.env` values.
- Serve the production API over HTTPS.
- Store tokens in secure device storage in mobile clients, not plain AsyncStorage.
- The current Analytics routes do not establish tenant context, so their aggregate reports may include cross-shop data. Correct that before treating analytics as tenant-isolated in production.
