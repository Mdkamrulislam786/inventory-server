# Inventory Server — Mobile Client Technical Guide

## Purpose and scope

This repository is the backend for a **multi-shop pharmacy inventory application**. A shop administrator owns one shop and can create employee accounts for that same shop. The wider backend contains catalog, procurement, inventory, sales, and analytics modules; this document intentionally describes the **User module** only, so a React Native client (or an API tool such as Postman) can implement onboarding and authentication correctly.

All endpoints in this document are mounted below:

```text
{BASE_URL}/api/v1/users
```

Local development example: `http://localhost:5000/api/v1/users`. On a physical phone, `localhost` means the phone itself; use the computer's LAN IP or a deployed HTTPS URL instead.

## API conventions

- Send JSON: `Content-Type: application/json`.
- Successful controller responses use `status: "success"`.
- Failed requests use the global error shape below. `stack` is included only when `NODE_ENV=development`.
- User passwords are hashed with bcrypt before storage and are not returned in normal user responses.
- Database identifiers such as `_id` and `shopId` are MongoDB ObjectId strings in JSON.

```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

## Data model and roles

### User

| Field | Type | Required when creating? | Notes |
| --- | --- | --- | --- |
| `_id` | string | Server-generated | MongoDB user ID. |
| `name` | string | Yes | Display name. |
| `username` | string | Yes | Globally unique; employee creation checks this explicitly. |
| `email` | string | No | Unique when provided. |
| `phone` | string | Yes | Globally unique and used for login. |
| `password` | string | Yes | Never returned; do not persist it in the app. |
| `role` | `admin` \| `employee` \| `platform-admin` | Server-controlled | The current client flow creates `admin` or `employee`. |
| `shopId` | string | Server-controlled | The tenant/shop to which an admin or employee belongs. |
| `createdAt`, `updatedAt` | ISO date string | Server-generated | Mongoose timestamps. |

### Tenant model

`register-admin` creates both an `admin` user and a Shop in one MongoDB transaction. The shop is linked to the user through `shopId`. Each employee created by an admin is forced onto that admin's `shopId`; clients cannot select another shop.

For protected endpoints, the backend reads `shopId` from the access-token payload and establishes the request tenant context. This is how later inventory-domain APIs keep data scoped to one shop.

## Endpoint catalog

| Method | Path | Authentication | Primary mobile use |
| --- | --- | --- | --- |
| `POST` | `/register-admin` | None | First-time shop/admin onboarding. |
| `POST` | `/login` | None | Sign in an admin or employee. |
| `POST` | `/refresh` | None; body refresh token | Recover from an expired access token. |
| `POST` | `/logout` | None; body refresh token | Revoke the current refresh-token record locally and server-side. |
| `POST` | `/add-employee` | Bearer access token, `admin` role | Let an admin add a staff account for their shop. |

`POST /signup` exists in controller code but is commented out in the route file. It is **not a public API** and clients must not use it.

---

## 1. Register a shop administrator

`POST /register-admin`

Creates the initial admin account and its shop atomically. The server forces `role` to `admin`, hashes the password, creates a shop using `shopName` and `location`, then assigns that shop to the new user.

### Request body

```json
{
  "name": "Amina Rahman",
  "username": "amina.admin",
  "email": "amina@example.com",
  "phone": "+8801712345678",
  "password": "use-a-strong-password",
  "shopName": "Central Pharmacy",
  "location": "Dhanmondi, Dhaka"
}
```

`email` is optional. All other shown user fields plus `shopName` and `location` are required by the current persistence models. Phone uniqueness is checked before creation. MongoDB's unique indexes also enforce unique `username` and, when provided, `email`.

### Success — `201 Created`

```json
{
  "status": "success",
  "token": "<JWT access token>",
  "data": {
    "user": {
      "_id": "...",
      "name": "Amina Rahman",
      "username": "amina.admin",
      "email": "amina@example.com",
      "phone": "+8801712345678",
      "role": "admin",
      "shopId": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

### Client use

Use this from the onboarding screen. The response calls its JWT field `token` (not `accessToken`) and does **not** return a refresh token. Treat the user as registered, then call `/login` with phone and password to establish the normal mobile session and obtain both tokens.

---

## 2. Log in

`POST /login`

Authenticates a user by `phone` and `password`. The endpoint works for both admins and employees and creates a new database-backed refresh token on every successful login.

### Request body

```json
{
  "phone": "+8801712345678",
  "password": "use-a-strong-password"
}
```

### Success — `200 OK`

```json
{
  "status": "success",
  "data": {
    "accessToken": "<JWT access token>",
    "refreshToken": "<opaque 80-character token>",
    "role": "admin",
    "name": "Amina Rahman"
  }
}
```

### Client use

Store `accessToken`, `refreshToken`, `role`, and `name` after login. `accessToken` is sent to protected APIs; `refreshToken` is only sent to `/refresh` and `/logout`. Route the user by role: an `admin` can use employee management; an `employee` cannot.

Incorrect credentials return `401` with `"Incorrect phone or password"`.

---

## 3. Refresh an access token

`POST /refresh`

Exchanges a valid, unexpired refresh token for a new JWT access token. Refresh tokens are random opaque values stored by the backend, expire seven days after issuance, and are not rotated by this endpoint.

### Request body

```json
{
  "refreshToken": "<stored refresh token>"
}
```

### Success — `200 OK`

```json
{
  "status": "success",
  "accessToken": "<new JWT access token>"
}
```

### Client use

When an authenticated API call returns `401` because the JWT is expired, make one `/refresh` request, replace only the saved `accessToken`, then retry the original request once. If refresh returns `403`, clear local session data and send the user to login. Do not send concurrent refresh requests; serialize them so multiple failed API calls share one refresh operation.

Missing `refreshToken` returns `400`; missing, expired, or invalid tokens return `403`.

---

## 4. Log out

`POST /logout`

Deletes the supplied refresh-token record. It is intentionally callable without a bearer token, so the client should include the refresh token in the body.

### Request body

```json
{
  "refreshToken": "<stored refresh token>"
}
```

### Success — `200 OK`

```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

### Client use

Call this when the user explicitly signs out, then clear all locally stored session values even if the request fails (for example, when offline). The endpoint currently returns success even when the submitted token does not match a database record. An already-issued access token remains usable until its own JWT expiry; logout only removes the refresh token.

---

## 5. Add an employee

`POST /add-employee`

Creates an `employee` user for the authenticated admin's shop. The server ignores any client-supplied role or `shopId` and always sets `role: "employee"` and the admin's shop ID.

### Required headers

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Request body

```json
{
  "name": "Rafi Hasan",
  "username": "rafi.counter",
  "email": "rafi@example.com",
  "phone": "+8801812345678",
  "password": "employee-initial-password"
}
```

`email` is optional. Do not send `role` or `shopId`; they are server-owned. The employee later signs in through the same `/login` endpoint with their phone and password.

### Success — `201 Created`

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "...",
      "name": "Rafi Hasan",
      "username": "rafi.counter",
      "email": "rafi@example.com",
      "phone": "+8801812345678",
      "role": "employee",
      "shopId": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

### Client use

Show this action only in admin-facing staff management UI. A missing/invalid bearer token returns `401`; a valid non-admin token returns `403`; a valid token without `shopId` cannot establish the tenant context. Duplicate usernames return `400`.

## Authentication lifecycle for a React Native client

```text
New shop: Register admin → Login → save session → call protected APIs
Existing user: Login → save session → call protected APIs
JWT expires: Protected API returns 401 → Refresh → replace access token → retry once
Refresh invalid/expired: clear session → Login
Sign out: Logout with refresh token → clear session
```

Keep both tokens in device-secure storage (for example, iOS Keychain / Android Keystore via a secure-storage library), not AsyncStorage. Keep profile/display data separately if desired. Always attach the current access token on protected requests:

```ts
const response = await fetch(`${API_BASE_URL}/add-employee`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify(employee),
});
```

## Postman setup

Create these environment variables:

| Variable | Example |
| --- | --- |
| `baseUrl` | `http://localhost:5000/api/v1/users` |
| `accessToken` | Value copied from `data.accessToken` after login |
| `refreshToken` | Value copied from `data.refreshToken` after login |

Use `{{baseUrl}}/login`, etc. For `add-employee`, set the Authorization tab to **Bearer Token** with `{{accessToken}}`. For refresh and logout, use raw JSON body with `{{refreshToken}}`.

## Implementation notes and current API constraints

These are behavior facts a coding agent should preserve or account for when building the mobile app:

1. Register and login have different response token field names: registration returns `token`, while login returns `data.accessToken` and `data.refreshToken`.
2. The JWT from `register-admin` is produced by a different signing helper and contains user ID and role but not `shopId`. Because protected routes require a `shopId` for tenant context, the app should immediately log in after registration instead of relying on that registration token.
3. No request validation layer exists. The client should validate required fields and password rules before submission, but still render server errors because database constraints remain authoritative.
4. Login only returns `role` and `name`, not a full user profile or shop record. There is currently no `GET /me` endpoint.
5. Every login creates another valid refresh token. Logging out one session deletes only the supplied refresh token, not all of a user's sessions.
6. There is no password reset, password change, employee list, employee update, employee deletion, or profile endpoint in the current User module.
7. CORS is enabled without an explicit allowlist in the current server. Production mobile API deployment should use HTTPS and set environment variables including `JWT_SECRET` and `JWT_EXPIRES_IN`.

## Suggested mobile types

```ts
export type UserRole = "admin" | "employee" | "platform-admin";

export type Session = {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  name: string;
};

export type LoginResponse = {
  status: "success";
  data: Session;
};

export type ApiFailure = {
  success: false;
  message: string;
  stack?: string;
};
```

# Backend domain reference

This section completes the mobile-client contract for the currently mounted backend domains: Catalog, Procurement, Inventory, and Analytics. Every endpoint below returns `{ "status": "success", ... }` on success and uses the error format described earlier on failure.

## Shared authorization and tenant rules

Unless a route explicitly says otherwise, send:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Catalog, Procurement, and Inventory routes establish the tenant from the JWT's `shopId`; therefore use an access token obtained from `/login`, not the initial `/register-admin` token. Their tenant-enabled records are automatically assigned to and queried within the authenticated shop.

| Domain | Base path | Who can use it |
| --- | --- | --- |
| Catalog | `{BASE_URL}/api/v1/catalog` | All authenticated users can search/match; admins create catalog records. |
| Procurement | `{BASE_URL}/api/v1/procurement` | Admin only. |
| Inventory | `{BASE_URL}/api/v1/inventory` | Authenticated users; only admins stock in. |
| Analytics | `{BASE_URL}/api/v1/analytics` | Authenticated users; several financial reports are admin only. |

## Catalog

The catalog defines medicines, manufacturers, and physical shelves. A medicine needs a manufacturer and shelf before it can be created. Medicines have no stock themselves; stock comes from Inventory batches.

### Data types

| Type | Fields |
| --- | --- |
| Manufacturer | `name` (unique per tenant), `code` (unique; normalized uppercase) |
| Shelf | `shelfTag` (unique; normalized uppercase), optional `description` |
| Medicine | `brandName`, `genericName`, `manufacturerId`, `shelfId`, `baseUnit`, `packaging`, `defaultStorePrice` |
| `baseUnit` | `tablet`, `capsule`, `syrup`, `injection`, `ointment`, or `other` |
| Packaging | `hasStrips`, optional `unitsPerStrip`, optional `stripsPerBox` |

### Endpoints

| Method | Path | Role | What it does |
| --- | --- | --- | --- |
| `POST` | `/manufacturer` | Admin | Creates a supplier/manufacturer reference for medicines. |
| `POST` | `/shelf` | Admin | Creates a physical shelf tag used for placement and OCR matching. |
| `POST` | `/medicine` | Admin | Creates a medicine catalog item. |
| `GET` | `/search?search=term` | Any authenticated user | Searches catalog medicines by brand or generic name and enriches results with live stock/pricing. |
| `POST` | `/match-shelf` | Any authenticated user | Filters a scanned/selected tray of medicine IDs to those belonging to a shelf tag. |

Create manufacturer:

```json
POST /manufacturer
{ "name": "Square Pharmaceuticals", "code": "SQ" }
```

Create shelf:

```json
POST /shelf
{ "shelfTag": "A-01", "description": "Front counter, top row" }
```

Create medicine:

```json
POST /medicine
{
  "brandName": "Napa 500",
  "genericName": "Paracetamol",
  "manufacturerId": "<manufacturerId>",
  "shelfId": "<shelfId>",
  "baseUnit": "tablet",
  "packaging": {
    "hasStrips": true,
    "unitsPerStrip": 10,
    "stripsPerBox": 10
  },
  "defaultStorePrice": 2
}
```

Search response items are purpose-built for a medicine picker/list and look like this:

```json
{
  "id": "<medicineId>",
  "brandName": "Napa 500",
  "genericName": "Paracetamol",
  "baseUnit": "tablet",
  "manufacturer": { "_id": "...", "name": "Square Pharmaceuticals" },
  "shelfLocation": { "tag": "A-01", "description": "Front counter, top row" },
  "displayPrice": 20,
  "priceUnit": "per strip",
  "totalStock": 250,
  "batchInfo": { "batchNumber": "NAPA-24A", "expiryDate": "2027-06-30T00:00:00.000Z" }
}
```

`displayPrice`, `totalStock`, and `batchInfo` use the nearest-expiring, positive, unexpired batch. For tablets/capsules the displayed price is batch price × units per strip; for other units it is the per-piece batch price. A search with no match returns `data: []`.

Shelf matching request:

```json
POST /match-shelf
{
  "shelfTag": "A-01",
  "trayIds": ["<medicineId1>", "<medicineId2>"]
}
```

Use it after barcode/OCR/UI selection: the app supplies candidate medicine IDs and a recognized shelf label, and receives only the candidates assigned to that shelf. A missing shelf returns `404`.

## Procurement

Procurement is the admin workflow for suppliers, receiving stock through purchases, recording supplier payments, returning damaged/expired stock, and viewing a supplier ledger. All its routes are admin-only and tenant-aware.

### Endpoint catalog

| Method | Path | What it does |
| --- | --- | --- |
| `POST` | `/suppliers` | Creates a supplier. |
| `GET` | `/suppliers` | Returns suppliers alphabetically. |
| `POST` | `/purchase` | Receives a multi-item purchase, creates/updates inventory batches, and records the purchase. |
| `POST` | `/pay` | Records supplier payment and subtracts it from supplier outstanding debt. |
| `POST` | `/return` | Removes batch quantity and creates supplier-return credit. |
| `GET` | `/supplier-ledger/:id` | Returns one supplier plus purchase/payment history. |

Create supplier:

```json
POST /suppliers
{
  "name": "ABC Distributors",
  "contactPerson": "Nusrat",
  "phone": "+8801912345678"
}
```

`totalOutstanding` defaults to `0`; the client should not set it during creation. Duplicate supplier names are rejected with `400`.

Create purchase:

```json
POST /purchase
{
  "supplierId": "<supplierId>",
  "invoiceNumber": "INV-2026-102",
  "totalAmount": 2400,
  "items": [
    {
      "medicineId": "<medicineId>",
      "batchNumber": "NAPA-24A",
      "expiryDate": "2027-06-30T00:00:00.000Z",
      "unitsReceived": 2,
      "boxesPerUnit": 10,
      "stripsPerBox": 10,
      "tabletsPerStrip": 10,
      "totalPurchasePrice": 2000,
      "companyMrp": 25,
      "storePrice": 20
    }
  ]
}
```

Each item is the same stock-in payload used by Inventory. Quantity becomes `unitsReceived × boxesPerUnit × stripsPerBox × tabletsPerStrip`, stored as the smallest unit. For tablet/capsule medicines, `storePrice` is entered per strip and is internally converted to a per-tablet/capsule price; for non-strip products it is per piece/bottle. A purchase increases the supplier's outstanding balance by each item’s `totalPurchasePrice` and creates an `in` inventory transaction. Its `totalAmount` should equal the sum of item totals; the server does not currently recalculate/validate that equality.

Record payment:

```json
POST /pay
{
  "supplierId": "<supplierId>",
  "amountPaid": 1000,
  "paymentMethod": "cash"
}
```

Supported persisted payment methods are `cash`, `bank_transfer`, `cheque`, and `bkash`. The response includes the payment record and `remainingBalance`. The current endpoint controller accepts only these three request fields; any optional payment note is not forwarded.

Return stock:

```json
POST /return
{
  "batchId": "<batchId>",
  "quantity": 10,
  "reason": "damaged"
}
```

`reason` must be `expired`, `damaged`, or `wrong_delivery`. Quantity is in the batch's smallest unit. The API reduces that batch quantity, records the return, and credits supplier debt by `quantity × batch.purchasePrice`; it rejects an unknown batch or insufficient quantity with `400`.

The ledger response contains `{ supplier, ledger }`. Ledger entries combine purchases (`entryType: "PURCHASE"`, `amount: totalAmount`) and payments (`entryType: "PAYMENT"`, `amount: amountPaid`). The current implementation sorts each source descending but does not perform a final merged chronological sort; the client should sort `ledger` by `createdAt` before rendering.

## Inventory

Inventory works in **smallest base units** (tablet/capsule/piece). It tracks batches, uses FEFO (first-expiry-first-out) when selling, and records `in`/`out` transaction rows.

### Endpoint catalog

| Method | Path | Role | What it does |
| --- | --- | --- | --- |
| `POST` | `/stock-in` | Admin | Creates or increases a batch and records stock-in. |
| `POST` | `/sell` | Any authenticated user | Deducts medicine stock across valid batches using FEFO. |
| `GET` | `/status/:medicineId` | Any authenticated user | Returns available batches and total quantity for one medicine. |
| `GET` | `/list?page=1&limit=10&search=...` | Any authenticated user | Returns paginated stock-list cards. |
| `GET` | `/search?q=term1,term2` | Any authenticated user | Search optimized for adding medicines to a sale tray. |

Direct stock-in uses the same item shape as a purchase item (with optional `supplierId`):

```json
POST /stock-in
{
  "medicineId": "<medicineId>",
  "supplierId": "<supplierId>",
  "batchNumber": "NAPA-24A",
  "expiryDate": "2027-06-30T00:00:00.000Z",
  "unitsReceived": 1,
  "boxesPerUnit": 10,
  "stripsPerBox": 10,
  "tabletsPerStrip": 10,
  "totalPurchasePrice": 1000,
  "companyMrp": 25,
  "storePrice": 20
}
```

If the same medicine and batch number already exist, the server increases the batch quantity and replaces its cost, store price, and expiry date. If a `supplierId` is supplied, outstanding supplier debt increases. `companyMrp` is accepted by the input type but is not persisted by the current Batch model.

Sell:

```json
POST /sell
{ "medicineId": "<medicineId>", "quantity": 12 }
```

`quantity` is always in smallest units—not strips or boxes. The endpoint excludes expired batches, checks total availability, then deducts from the earliest expiry batches first. Its response provides `message` and `processedBatches`, e.g. `{ "batchNumber": "NAPA-24A", "deducted": 10 }`. Insufficient stock returns `400` with the currently available quantity.

`GET /status/:medicineId` responds with `{ totalQuantity, batches }`, including every positive-quantity batch (including expired batches). Use this to show detailed batch availability; do not assume it only includes sellable stock.

`GET /list` defaults to `page=1`, `limit=10`, and empty `search`. It responds at the top level, rather than inside `data`:

```json
{
  "status": "success",
  "data": [{ "id": "...", "brandName": "Napa 500", "totalStock": 250, "activeBatches": ["NAPA-24A"] }],
  "total": 1,
  "limit": 10,
  "page": 1,
  "totalPages": 1
}
```

Each list card also includes `genericName`, `baseUnit`, `shelf`, `displayPrice`, and `priceUnit`. It only uses positive, unexpired batches for `totalStock`, prices, and `activeBatches`.

`GET /search?q=napa,paracetamol` splits comma-separated terms and returns sale-tray cards: `id`, names, `baseUnit`, shelf/location, `totalStock`, `displayPrice`, and `priceUnit`. An omitted or empty `q` returns `data: []` without searching. Use this for responsive cashier search, then submit the selected medicine ID and quantity to `/sell`.

## Analytics

Analytics supplies dashboard cards, alerts, and admin financial reports. All endpoints need a bearer token. Expiry alerts, low-stock alerts, and top-selling medicines are available to employees; the remaining analytics endpoints require an admin token.

| Method | Path | Role | Client use / response |
| --- | --- | --- | --- |
| `GET` | `/daily-profit` | Admin | Today’s stock-out totals: `totalSales`, `totalCost`, `netProfit`, `transactionCount`; empty days return only `{ totalSales: 0, netProfit: 0 }`. |
| `GET` | `/expiry-alerts?days=30` | Any authenticated user | Positive-quantity batches expiring within the next N days, sorted by expiry, with populated medicine brand name. |
| `GET` | `/low-stock?threshold=50` | Any authenticated user | Medicines whose total batch quantity is at or below the threshold. |
| `GET` | `/financial-summary?startDate=...&endDate=...` | Admin | Revenue, COGS, net profit, sale count, and applied period. Defaults to today. |
| `GET` | `/top-selling?limit=5` | Any authenticated user | Best-selling medicines with `brandName`, `totalSold`, and `revenueGenerated`. |
| `GET` | `/supplier-debt-summary` | Admin | `{ totalOutstanding, supplierCount }`. |
| `GET` | `/employee-performance` | Admin | Ranked employee sale metrics: `name`, `totalSales`, `transactionCount`, `averageSaleValue`. |

For `financial-summary`, date-only values such as `2026-09-01` are parsed by the server then expanded to that day’s local start/end time. Passing both dates gives an inclusive report range. The endpoint has no pagination; the mobile UI should apply presentation limits only after receiving the complete result.

### Important current analytics constraint

Unlike Catalog, Procurement, and Inventory, the Analytics router does **not** call `setTenantContext`. In addition, its aggregate queries do not automatically receive tenant-plugin filters. As currently implemented, analytics results may aggregate data across shops. Do not present this as safely shop-isolated reporting until the backend is changed to set tenant context and explicitly add `shopId` filters to every analytics query/pipeline.

## Cross-domain mobile workflow

```text
Admin onboarding/login
  → Create manufacturer and shelf
  → Create medicine
  → Create supplier
  → Record purchase (this stocks batches and increases supplier debt)
  → Search/list stock
  → Employee/admin sells by smallest-unit quantity (FEFO)
  → View low stock / expiry alerts and admin dashboard reports
  → Record supplier payments or returns as needed
```

## Current implementation constraints for coding agents

1. These domains have no formal request-validation layer. Validate required fields, positive numeric values, valid ObjectIds, and valid dates in the mobile client, then display server errors as the final authority.
2. The tenant plugin applies to regular Mongoose find/save operations. MongoDB aggregation pipelines require explicit `shopId` matching; Inventory list does this, but Analytics currently does not.
3. Several document schemas have globally unique fields in addition to intended tenant behavior, notably manufacturer `name`/`code`, shelf tag, and supplier name. A record used by another shop can therefore cause a duplicate error.
4. There is no API to edit/delete catalog records, suppliers, batches, or purchases, and no endpoint to list purchase history or returns. Build the screens around the exposed create/search/list/ledger operations only.
5. Inventory `/sell` is a direct stock-out operation. The repository also contains a separate Sales module, but it is outside this document and its more complete sale-record workflow is not described here.
