# CylinderHub — API & Database Reference

> Base URL: `http://your-domain/api/v1`
> Auth: Laravel Sanctum (Bearer token in `Authorization` header)
> All responses: `Content-Type: application/json`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Database Schema — All Tables](#2-database-schema)
3. [API Endpoints — All Roles](#3-api-endpoints--all-roles)
4. [API Endpoints — Admin Only](#4-api-endpoints--admin-only)
5. [Calculations Reference](#5-calculations-reference)
6. [Role Access Matrix](#6-role-access-matrix)
7. [Error Responses](#7-error-responses)

---

## 1. Authentication

### POST `/auth/login`
**Public — no token needed**

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

**Response `200`:**
```json
{
  "token": "1|abc123...",
  "user": {
    "id": 1,
    "name": "MD Fazle Rabbi",
    "email": "admin@example.com",
    "phone": "01863098727",
    "role": "admin",
    "avatar_initials": "MF",
    "is_active": true
  }
}
```

Use the `token` as: `Authorization: Bearer 1|abc123...` on all subsequent requests.

---

### POST `/auth/logout`
**All authenticated users**

**Request:** _(no body)_

**Response `200`:**
```json
{ "message": "Logged out." }
```

---

### GET `/auth/me`
**All authenticated users**

**Response `200`:** Same user object as login.

---

## 2. Database Schema

### Entity Relationship Overview

```
users ──────────────────────────────────────────────────────────────────┐
  │                                                                      │
  │ (salesman_id)          (recorded_by)            (collected_by)      │
  ▼                             ▼                        ▼              │
sales ◄──── sale_items     purchases ◄── purchase_items  due_collections│
  │              │               │                                      │
  │ (cylinder_id)│ (purchase_    │ (cylinder_id)                        │
  │              │  item_id,     ▼                                      │
  ▼              │  cylinder_id) cylinder_stocks ◄── cylinders          │
customers        │                                       │              │
  │              └────────────────────────────►          │              │
  │                                        stock_allocations ◄──────────┘
  └──── due_collections                    (salesman_id, cylinder_id)

suppliers ◄── purchases ◄── due_payments (supplier payments)
expenses (standalone)
cylinder_returns (standalone)
```

---

### Table: `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | Auto-increment |
| `name` | varchar | Full name |
| `email` | varchar UNIQUE | Login email |
| `phone` | varchar(20) | nullable |
| `avatar_initials` | varchar(5) | e.g. "MF" — nullable |
| `role` | enum | `admin` or `salesman` |
| `is_active` | boolean | default `true` |
| `password` | varchar | Bcrypt hashed |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### Table: `cylinders`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `name` | varchar | e.g. "Basundhara LPG" |
| `size` | varchar | e.g. "35kg", "12kg" |
| `short_code` | varchar(5) | e.g. "BAS35" |
| `color1` | varchar(10) | Hex color for badge gradient |
| `color2` | varchar(10) | Hex color for badge gradient |
| `brands` | varchar | nullable |
| `status` | enum | `active` or `inactive` |
| `reorder_level` | int unsigned | Alert threshold, default `10` |
| `capacity` | int unsigned | Max storage, default `100` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### Table: `cylinder_stocks`

One row per cylinder type — live inventory counts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `cylinder_id` | bigint FK UNIQUE | → `cylinders.id` (cascade delete) |
| `filled_qty` | int unsigned | Ready-to-sell cylinders, default `0` |
| `empty_qty` | int unsigned | Returned empty cylinders, default `0` |
| `capacity` | int unsigned | Warehouse capacity, default `100` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**How it moves:**
- `filled_qty` ↑ when purchase recorded
- `filled_qty` ↓ when sale recorded
- `filled_qty` ↑ when sale deleted (reversed)
- `empty_qty` ↑ when empty cylinders returned (`cylinder_returns`)
- `filled_qty` ↑ on end-of-day reconciliation (unsold stock restored)

---

### Table: `suppliers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `name` | varchar | |
| `phone` | varchar(20) | nullable |
| `address` | varchar | nullable |
| `total_due` | decimal(12,2) | Running payable balance, default `0` |
| `is_active` | boolean | default `true` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### Table: `purchases`

One record per purchase order.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `supplier_id` | bigint FK | → `suppliers.id` |
| `recorded_by` | bigint FK | → `users.id` |
| `purchase_date` | date | |
| `total_amount` | decimal(12,2) | Sum of all item costs |
| `paid_amount` | decimal(12,2) | Amount paid so far |
| `due_amount` | decimal(12,2) | `total_amount − paid_amount` |
| `notes` | text | nullable |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### Table: `purchase_items`

One row per cylinder type per purchase — the FIFO lot.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `purchase_id` | bigint FK | → `purchases.id` (cascade delete) |
| `cylinder_id` | bigint FK | → `cylinders.id` |
| `qty` | int unsigned | Original quantity purchased |
| `remaining_qty` | int unsigned | How many still available (decreases on each sale) |
| `unit_cost` | decimal(10,2) | Cost per cylinder in this lot |
| `status` | enum | `pending` → `active` → `done` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Status transitions:**
- `pending` → first sale from this lot sets it to `active`
- `active` → lot partially consumed
- `done` → `remaining_qty = 0`, fully consumed

---

### Table: `customers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `name` | varchar | |
| `phone` | varchar(20) | nullable |
| `address` | varchar | nullable |
| `total_due` | decimal(12,2) | Running receivable balance, default `0` |
| `added_by` | bigint FK nullable | → `users.id` |
| `is_active` | boolean | default `true` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### Table: `sales`

One record per sale transaction.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `customer_id` | bigint FK nullable | → `customers.id` (null = walk-in) |
| `salesman_id` | bigint FK | → `users.id` |
| `sale_date` | date | |
| `total_amount` | decimal(12,2) | Sum of all item revenues |
| `paid_amount` | decimal(12,2) | Amount collected so far |
| `payment_type` | enum | `cash`, `due`, or `partial` |
| `notes` | text | nullable |
| `deleted_at` | timestamp | Soft delete |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Computed attribute (not stored):**
- `due_amount` = `total_amount − paid_amount`

---

### Table: `sale_items`

One row per cylinder type per sale — the FIFO lot breakdown.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `sale_id` | bigint FK | → `sales.id` (cascade delete) |
| `purchase_item_id` | bigint FK | → `purchase_items.id` — which FIFO lot was consumed |
| `cylinder_id` | bigint FK | → `cylinders.id` |
| `qty` | int unsigned | Quantity sold from this lot |
| `unit_price` | decimal(10,2) | Sale price per unit |
| `unit_cost` | decimal(10,2) | Purchase cost from the FIFO lot |
| `profit` | decimal(10,2) | `(unit_price − unit_cost) × qty` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### Table: `stock_allocations`

One row per cylinder type per salesman per day.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `salesman_id` | bigint FK | → `users.id` |
| `cylinder_id` | bigint FK | → `cylinders.id` |
| `allocation_date` | date | |
| `qty` | int unsigned | Cylinders dispatched to salesman |
| `sale_price` | decimal(10,2) | Price admin set for selling, default `0` |
| `sold_qty` | int unsigned | Updated in real-time as salesman sells, default `0` |
| `returned_qty` | int unsigned | Empty cylinders returned, default `0` |
| `collected_amount` | decimal(12,2) | Cash reported at reconciliation, default `0` |
| `is_reconciled` | boolean | Locked after EOD reconcile, default `false` |
| `notes` | text | nullable |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### Table: `due_collections`

Payment events — when a customer pays their outstanding balance.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `customer_id` | bigint FK | → `customers.id` |
| `sale_id` | bigint FK nullable | → `sales.id` — which sale this pays off |
| `collected_by` | bigint FK | → `users.id` |
| `amount` | decimal(12,2) | Amount collected |
| `collection_date` | date | |
| `notes` | text | nullable |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### Table: `due_payments`

Payment events — when the business pays a supplier.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `supplier_id` | bigint FK | → `suppliers.id` |
| `purchase_id` | bigint FK nullable | → `purchases.id` |
| `recorded_by` | bigint FK | → `users.id` |
| `amount` | decimal(12,2) | Amount paid |
| `payment_date` | date | |
| `notes` | text | nullable |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### Table: `cylinder_returns`

Empty cylinders handed back from customers or route corrections.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `sale_id` | bigint FK nullable | → `sales.id` |
| `customer_id` | bigint FK nullable | → `customers.id` |
| `cylinder_id` | bigint FK | → `cylinders.id` |
| `recorded_by` | bigint FK | → `users.id` |
| `type` | enum | `empty_return` or `error_correction` |
| `qty` | int unsigned | Number of cylinders returned |
| `return_date` | date | |
| `notes` | text | nullable |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### Table: `expenses`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `recorded_by` | bigint FK | → `users.id` |
| `category` | enum | `transport`, `salary`, `rent`, `utility`, `other` |
| `amount` | decimal(10,2) | |
| `expense_date` | date | |
| `description` | varchar | nullable |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

## 3. API Endpoints — All Roles

> Both `admin` and `salesman` can use these. Salesman data is filtered server-side.

---

### Cylinders (Read)

#### GET `/cylinders`
Returns all cylinder types with current stock and FIFO cost.

**Response `200`:**
```json
[
  {
    "id": 1,
    "name": "Basundhara LPG",
    "size": "35kg",
    "short_code": "BAS35",
    "color1": "#2BB3C0",
    "color2": "#0E7B86",
    "brands": "Basundhara",
    "status": "active",
    "reorder_level": 10,
    "capacity": 100,
    "stock": {
      "filled_qty": 45,
      "empty_qty": 12,
      "capacity": 100
    },
    "fifo_cost": 1200.00
  }
]
```

> `fifo_cost` — the unit cost of the next available FIFO lot for this cylinder. `null` if no stock.

#### GET `/cylinders/{id}`
Returns a single cylinder with stock.

---

### Sales

#### GET `/sales`
**Salesman** sees only their own sales. **Admin** sees all.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default: 1) |
| `today` | bool | `1` = today's sales only |

**Response `200`:**
```json
{
  "data": [
    {
      "id": 42,
      "sale_date": "2026-06-02",
      "total_amount": 4200.00,
      "paid_amount": 2000.00,
      "due_amount": 2200.00,
      "payment_type": "partial",
      "notes": null,
      "customer": {
        "id": 5,
        "name": "Rahim Uddin",
        "phone": "01711000000"
      },
      "salesman": {
        "id": 3,
        "name": "Jamal Mia",
        "avatar_initials": "JM"
      },
      "items": [
        {
          "id": 101,
          "cylinder": {
            "id": 1,
            "name": "Basundhara LPG",
            "size": "35kg",
            "short_code": "BAS35",
            "color1": "#2BB3C0",
            "color2": "#0E7B86"
          },
          "qty": 3,
          "unit_price": 1400.00,
          "unit_cost": 1200.00,
          "profit": 600.00
        }
      ],
      "created_at": "2026-06-02T09:15:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 87
  }
}
```

---

#### POST `/sales`
Record a new sale.

**Request Body:**
```json
{
  "customer_id": 5,
  "sale_date": "2026-06-02",
  "payment_type": "partial",
  "paid_amount": 2000,
  "notes": "Delivered to shop",
  "items": [
    { "cylinder_id": 1, "qty": 3, "unit_price": 1400 },
    { "cylinder_id": 2, "qty": 1, "unit_price": 950 }
  ]
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `customer_id` | No | Must exist in `customers` table |
| `sale_date` | Yes | Valid date |
| `payment_type` | Yes | `cash`, `due`, or `partial` |
| `paid_amount` | No | Numeric ≥ 0. Defaults to full total if omitted |
| `notes` | No | String |
| `items` | Yes | Array, min 1 item |
| `items.*.cylinder_id` | Yes | Must exist in `cylinders` |
| `items.*.qty` | Yes | Integer ≥ 1 |
| `items.*.unit_price` | Yes | Numeric ≥ 0 |

**What happens internally:**
1. For salesman: validates allocation exists and has enough remaining qty
2. FIFO lots consumed oldest-first — `purchase_items.remaining_qty` decremented
3. `cylinder_stocks.filled_qty` decremented
4. `sale_items` rows created with `unit_cost` and `profit` from the FIFO lot
5. `stock_allocations.sold_qty` incremented (real-time tracking)
6. `customers.total_due` incremented if due/partial sale

**Response `201`:** Full sale object (same shape as GET)

---

#### GET `/sales/{id}`
Returns a single sale.

---

#### POST `/sales/{id}/pay`
Collect payment on a due or partial sale.

**Request Body:**
```json
{
  "amount": 2200,
  "date": "2026-06-03",
  "notes": "Cash collected at door"
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `amount` | Yes | Numeric > 0, must not exceed `due_amount` |
| `date` | Yes | Valid date |
| `notes` | No | String |

**What happens internally:**
1. `sales.paid_amount` increased by `amount`
2. `sales.payment_type` updated:
   - If `paid_amount >= total_amount` → `cash` (fully settled)
   - Otherwise → `partial`
3. `due_collections` row created
4. `customers.total_due` decremented

**Response `200`:** Updated sale object

---

### Customers (Read + Create)

#### GET `/customers`
Returns all customers with their running due balance.

**Response `200`:**
```json
{
  "data": [
    {
      "id": 5,
      "name": "Rahim Uddin",
      "phone": "01711000000",
      "address": "Mirpur, Dhaka",
      "total_due": 2200.00,
      "is_active": true
    }
  ]
}
```

#### POST `/customers`
Quick-add a customer (available to salesman during sale).

**Request Body:**
```json
{
  "name": "Karim Mia",
  "phone": "01800000000",
  "address": "Gulshan, Dhaka"
}
```

**Response `201`:** Customer object

---

### Salesman Self-Service

#### GET `/salesmen/{id}`
A salesman can only fetch their own data. Returns today's allocations.

**Response `200`:**
```json
{
  "salesman": {
    "id": 3,
    "name": "Jamal Mia",
    "email": "jamal@example.com",
    "phone": "01933889900",
    "role": "salesman",
    "is_active": true,
    "allocations": [
      {
        "id": 14,
        "cylinder_id": 1,
        "cylinder": {
          "id": 1, "name": "Basundhara LPG", "size": "35kg",
          "short_code": "BAS35", "color1": "#2BB3C0", "color2": "#0E7B86"
        },
        "allocation_date": "2026-06-02",
        "qty": 10,
        "sale_price": 1400.00,
        "sold_qty": 4,
        "returned_qty": 0,
        "collected_amount": "0.00",
        "is_reconciled": false
      }
    ]
  },
  "today_sales": [ /* array of today's sale objects */ ]
}
```

---

#### POST `/allocations/{allocationId}/reconcile`
End-of-day: salesman submits their actual sold/returned count and cash.

**Request Body:**
```json
{
  "sold_qty": 7,
  "returned_qty": 2,
  "collected_amount": 9800
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `sold_qty` | Yes | Integer ≥ 0 |
| `returned_qty` | Yes | Integer ≥ 0 |
| `collected_amount` | Yes | Numeric ≥ 0 |

**Validation:** `sold_qty + returned_qty` must not exceed `qty`

**What happens internally:**
1. `stock_allocations` updated: `sold_qty`, `returned_qty`, `collected_amount`, `is_reconciled = true`
2. Unsold qty = `qty − sold_qty − returned_qty` → returned to `cylinder_stocks.filled_qty`

**Response `200`:** Updated allocation object

---

#### POST `/returns`
Salesman records empty cylinders collected from customers.

**Request Body:**
```json
{
  "cylinder_id": 1,
  "qty": 5,
  "type": "empty_return",
  "return_date": "2026-06-02",
  "notes": "Collected from 3 customers"
}
```

**What happens:** `cylinder_stocks.empty_qty` incremented by `qty`

**Response `201`:** Return record

---

## 4. API Endpoints — Admin Only

> Requires `role = admin`. Returns `403 Forbidden` for salesmen.

---

### Dashboard

#### GET `/dashboard`

**Query Parameters:**
| Param | Values | Description |
|-------|--------|-------------|
| `period` | `today` (default), `week`, `month`, `custom` | Time range |
| `from` | date string | Required if `period=custom` |
| `to` | date string | Required if `period=custom` |

**Response `200`:**
```json
{
  "summary": {
    "today_sales_amount": 125000.00,
    "today_profit": 38400.00,
    "total_filled_stock": 234,
    "customer_due": 45600.00,
    "supplier_due": 82000.00,
    "monthly_expenses": 15000.00,
    "today_sales_count": 42
  },
  "weekly_chart": [
    { "d": "Mon", "amt": 18000.00, "date": "2026-05-27" },
    { "d": "Tue", "amt": 22500.00, "date": "2026-05-28" },
    { "d": "Wed", "amt": 15000.00, "date": "2026-05-29" },
    { "d": "Thu", "amt": 30000.00, "date": "2026-05-30" },
    { "d": "Fri", "amt": 28000.00, "date": "2026-05-31" },
    { "d": "Sat", "amt": 9000.00,  "date": "2026-06-01" },
    { "d": "Sun", "amt": 14000.00, "date": "2026-06-02" }
  ],
  "recent_sales": [ /* last 10 sale objects */ ],
  "live_stock": [
    {
      "cylinder_id": 1,
      "name": "Basundhara LPG",
      "size": "35kg",
      "short_code": "BAS35",
      "color1": "#2BB3C0",
      "color2": "#0E7B86",
      "filled_qty": 45,
      "empty_qty": 12,
      "capacity": 100,
      "reorder_level": 10
    }
  ],
  "period": { "from": "2026-06-02", "to": "2026-06-02" }
}
```

---

### Cylinders (Write)

#### POST `/cylinders`
**Request:**
```json
{
  "name": "Omera",
  "size": "12kg",
  "short_code": "OME12",
  "color1": "#5A8DEE",
  "color2": "#2C5FB8",
  "brands": "Omera",
  "status": "active",
  "reorder_level": 5,
  "capacity": 50
}
```
**Response `201`:** Cylinder object

#### PUT `/cylinders/{id}`
Same fields as POST. **Response `200`:** Updated cylinder.

#### DELETE `/cylinders/{id}`
**Response `200`:** `{ "message": "Cylinder deleted." }`

---

### Purchases

#### GET `/purchases`
Returns all purchase orders with items and supplier.

**Response `200`:**
```json
[
  {
    "id": 7,
    "supplier": { "id": 2, "name": "Padma Gas" },
    "purchase_date": "2026-06-01",
    "total_amount": 120000.00,
    "paid_amount": 80000.00,
    "due_amount": 40000.00,
    "items": [
      {
        "id": 22,
        "cylinder": { "id": 1, "name": "Basundhara LPG", "size": "35kg" },
        "qty": 100,
        "remaining_qty": 63,
        "unit_cost": 1200.00,
        "status": "active"
      }
    ]
  }
]
```

#### POST `/purchases`
**Request:**
```json
{
  "supplier_id": 2,
  "purchase_date": "2026-06-01",
  "paid_amount": 80000,
  "notes": "June batch",
  "items": [
    { "cylinder_id": 1, "qty": 100, "unit_cost": 1200 }
  ]
}
```

**What happens internally:**
1. `purchases` record created
2. `purchase_items` rows created with `remaining_qty = qty`, `status = pending`
3. `cylinder_stocks.filled_qty` incremented for each item
4. `suppliers.total_due` incremented by `total_amount − paid_amount`

**Response `201`:** Full purchase object

#### GET `/purchases/{id}`
Single purchase with full details.

#### POST `/purchases/{id}/pay`
Pay outstanding supplier balance.

**Request:**
```json
{
  "amount": 40000,
  "payment_date": "2026-06-05",
  "notes": "Bank transfer"
}
```
**What happens:** `purchases.paid_amount` increases, `suppliers.total_due` decreases, `due_payments` row created.

#### GET `/purchases/fifo/{cylinderId}`
View the current FIFO queue for a cylinder — shows all available lots oldest-first.

**Response `200`:**
```json
[
  {
    "id": 22,
    "purchase_date": "2026-06-01",
    "unit_cost": 1200.00,
    "qty": 100,
    "remaining_qty": 63,
    "status": "active"
  }
]
```

#### POST `/purchases/simulate`
Simulate a FIFO sale without recording it.

**Request:**
```json
{
  "cylinder_id": 1,
  "qty": 10,
  "unit_price": 1400
}
```

**Response `200`:**
```json
{
  "breakdown": [
    {
      "purchase_item_id": 22,
      "lot_id_label": "Lot #22",
      "qty_taken": 10,
      "unit_cost": 1200.00,
      "unit_price": 1400.00,
      "profit": 2000.00
    }
  ],
  "total_cost": 12000.00,
  "total_revenue": 14000.00,
  "total_profit": 2000.00,
  "remaining_qty_needed": 0
}
```

---

### Sales (Admin)

#### DELETE `/sales/{id}`
Soft-delete a sale. Reverses all effects (stock restored, FIFO lots uncreated, customer due reversed).

**Response `200`:** `{ "message": "Sale deleted and stock restored." }`

---

### Customers (Admin Full CRUD)

#### GET `/customers/{id}`
Single customer with details.

#### PUT `/customers/{id}`
Update customer details.

#### DELETE `/customers/{id}`
Delete a customer.

#### POST `/customers/{id}/collect`
Collect due directly from customer page (not tied to a specific sale).

**Request:**
```json
{
  "amount": 1000,
  "collection_date": "2026-06-02",
  "notes": "Collected at shop"
}
```
**What happens:** `customers.total_due` decremented, `due_collections` row created.

---

### Suppliers

#### GET `/suppliers`
**Response `200`:**
```json
[
  {
    "id": 2,
    "name": "Padma Gas",
    "phone": "01900000000",
    "address": "Tejgaon, Dhaka",
    "total_due": 40000.00,
    "is_active": true
  }
]
```

#### POST `/suppliers`
```json
{ "name": "Padma Gas", "phone": "01900000000", "address": "Tejgaon, Dhaka" }
```

#### PUT `/suppliers/{id}` · DELETE `/suppliers/{id}` · GET `/suppliers/{id}`
Standard CRUD.

#### POST `/suppliers/{id}/pay`
```json
{ "amount": 40000, "payment_date": "2026-06-05", "notes": "Bank transfer" }
```
Reduces `suppliers.total_due`.

---

### Salesman Management (Admin)

#### GET `/salesmen`
Returns all salesmen with today's allocations.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `date` | date string | View a specific day's allocations (default: today) |

**Response `200`:**
```json
[
  {
    "id": 3,
    "name": "Jamal Mia",
    "phone": "01933889900",
    "role": "salesman",
    "is_active": true,
    "avatar_initials": "JM",
    "allocations": [ /* today's allocations */ ]
  }
]
```

#### POST `/salesmen`
Create a new salesman account.

**Request:**
```json
{
  "name": "Rafiq Hossain",
  "email": "rafiq@example.com",
  "password": "secret123",
  "phone": "01822556677"
}
```

#### PUT `/salesmen/{id}`
Update salesman details (password optional — omit to keep current).

#### POST `/salesmen/{id}/toggle-active`
Activate or deactivate a salesman. **Response `200`:** Updated salesman.

#### POST `/salesmen/{id}/allocate`
Dispatch cylinders to a salesman for the day.

**Request:**
```json
{
  "cylinder_id": 1,
  "qty": 10,
  "sale_price": 1400,
  "allocation_date": "2026-06-02"
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `cylinder_id` | Yes | Must exist |
| `qty` | Yes | Integer ≥ 1 |
| `sale_price` | No | Numeric ≥ 0 |
| `allocation_date` | No | Defaults to today |

**Response `201`:** Allocation object with cylinder.

---

### Expenses

#### GET `/expenses`
Returns all expenses ordered by date.

**Response `200`:**
```json
[
  {
    "id": 9,
    "category": "transport",
    "amount": 2500.00,
    "expense_date": "2026-06-02",
    "description": "Fuel for delivery van"
  }
]
```

#### POST `/expenses`
```json
{
  "category": "salary",
  "amount": 8000,
  "expense_date": "2026-06-01",
  "description": "May salary — Jamal"
}
```
Categories: `transport` · `salary` · `rent` · `utility` · `other`

#### GET `/expenses/{id}` · PUT `/expenses/{id}` · DELETE `/expenses/{id}`
Standard CRUD.

---

### Stock

#### GET `/stock`
Returns live stock for all cylinder types.

**Response `200`:**
```json
[
  {
    "cylinder_id": 1,
    "filled_qty": 45,
    "empty_qty": 12,
    "capacity": 100
  }
]
```

#### GET `/returns`
Returns all cylinder return records.

---

## 5. Calculations Reference

### 5.1 Profit Per Sale Item

```
profit = (unit_price − unit_cost) × qty
```

- `unit_price` — what the customer paid per cylinder (set by admin at allocation)
- `unit_cost` — what the business paid per cylinder (from the FIFO lot at time of sale)
- Stored permanently in `sale_items.profit` at the moment of sale

**Example:**
```
unit_price = ৳1,400   unit_cost = ৳1,200   qty = 3
profit = (1400 − 1200) × 3 = ৳600
```

---

### 5.2 FIFO Lot Consumption

When a salesman sells N cylinders, the system takes from the oldest lot first:

```
Sort purchase_items WHERE cylinder_id = X
                    AND status IN ('pending','active')
                    AND remaining_qty > 0
ORDER BY created_at ASC, id ASC

For each lot (oldest first):
  take = min(N_remaining_to_sell, lot.remaining_qty)
  lot.remaining_qty  −= take
  lot.status = 'active' if 0 < remaining_qty < original_qty
  lot.status = 'done'   if remaining_qty = 0
  N_remaining_to_sell −= take
  (stop when N_remaining_to_sell = 0)
```

A single sale can span **multiple lots** if the first lot has fewer cylinders than needed.

---

### 5.3 Sale Payment Logic

```
total_amount = Σ (unit_price × qty) for all items

if paid_amount >= total_amount → payment_type = 'cash'
if 0 < paid_amount < total_amount → payment_type = 'partial'
if paid_amount = 0 → payment_type = 'due'

due_amount = total_amount − paid_amount  (computed, not stored)
```

---

### 5.4 Allocation Available Qty (for salesman sell validation)

```
available = Σ max(0, allocation.qty − allocation.sold_qty − allocation.returned_qty)
            for all unreconciled allocations
            where salesman_id = X AND cylinder_id = Y AND allocation_date = today
```

The salesman **cannot sell more** than this. The system throws a 422 if they try.

---

### 5.5 Allocation Sold Qty Distribution

When a salesman sells N cylinders of type Y, `sold_qty` is distributed across their allocations **oldest-first**, respecting each allocation's capacity:

```
For each allocation (oldest first):
  capacity = allocation.qty − allocation.sold_qty − allocation.returned_qty
  take = min(N_remaining, capacity)
  allocation.sold_qty += take
  N_remaining -= take
```

This prevents a small allocation from showing more sold than it was allocated.

---

### 5.6 End-of-Day Stock Restoration

```
unsold = allocation.qty − sold_qty − returned_qty
cylinder_stocks.filled_qty += unsold
allocation.is_reconciled = true
```

---

### 5.7 Customer Due Balance

```
customer.total_due INCREASES when:
  sale recorded with due_amount > 0
  → customer.total_due += (total_amount − paid_amount)

customer.total_due DECREASES when:
  payment collected via POST /sales/{id}/pay
  → customer.total_due -= amount
  OR
  direct collection via POST /customers/{id}/collect
  → customer.total_due -= amount
```

---

### 5.8 Supplier Due Balance

```
supplier.total_due INCREASES when:
  purchase recorded and not fully paid
  → supplier.total_due += (total_amount − paid_amount)

supplier.total_due DECREASES when:
  payment recorded via POST /purchases/{id}/pay
  → supplier.total_due -= amount
  OR
  POST /suppliers/{id}/pay
  → supplier.total_due -= amount
```

---

### 5.9 Dashboard Summary Calculations

| Metric | Calculation |
|--------|-------------|
| **Sales Amount** | `SUM(sales.total_amount)` for the selected period |
| **Profit** | `SUM(sale_items.profit)` for items in the selected period |
| **Filled Stock** | `SUM(cylinder_stocks.filled_qty)` across all types |
| **Customer Due** | `SUM(customers.total_due)` — all time running balance |
| **Supplier Due** | `SUM(suppliers.total_due)` — all time running balance |
| **Monthly Expenses** | `SUM(expenses.amount)` WHERE month = current month |

---

### 5.10 Salesman Stats Bar

Shown on the salesman's "My Day" page for today's allocations:

| Stat | Formula |
|------|---------|
| **Total Pcs** | `Σ allocation.qty` (all today's allocations) |
| **Sold** | `Σ allocation.sold_qty` (all today's allocations) |
| **Remaining** | `Σ max(0, qty − sold_qty − returned_qty)` (active allocations only) |
| **Cash Collected** | `Σ today_sales.paid_amount` + `Σ reconciled.collected_amount` |

---

## 6. Role Access Matrix

| Endpoint | Admin | Salesman |
|----------|:-----:|:--------:|
| `POST /auth/login` | ✓ | ✓ |
| `GET /auth/me` | ✓ | ✓ |
| `GET /cylinders` | ✓ | ✓ |
| `POST /cylinders` | ✓ | ✗ |
| `PUT/DELETE /cylinders/{id}` | ✓ | ✗ |
| `GET /sales` | ✓ (all) | ✓ (own) |
| `POST /sales` | ✓ | ✓ |
| `POST /sales/{id}/pay` | ✓ | ✓ (own) |
| `DELETE /sales/{id}` | ✓ | ✗ |
| `GET /customers` | ✓ | ✓ |
| `POST /customers` | ✓ | ✓ |
| `PUT/DELETE /customers/{id}` | ✓ | ✗ |
| `POST /customers/{id}/collect` | ✓ | ✗ |
| `GET /salesmen` | ✓ | ✗ |
| `GET /salesmen/{id}` | ✓ | ✓ (own) |
| `POST /salesmen` | ✓ | ✗ |
| `POST /salesmen/{id}/allocate` | ✓ | ✗ |
| `POST /allocations/{id}/reconcile` | ✓ | ✓ (own) |
| `POST /returns` | ✓ | ✓ |
| `GET /purchases` | ✓ | ✗ |
| `POST /purchases` | ✓ | ✗ |
| `POST /purchases/{id}/pay` | ✓ | ✗ |
| `GET /suppliers` | ✓ | ✗ |
| `POST /suppliers/{id}/pay` | ✓ | ✗ |
| `GET /dashboard` | ✓ | ✗ |
| `GET /stock` | ✓ | ✗ |
| `GET /expenses` | ✓ | ✗ |
| `POST /expenses` | ✓ | ✗ |

---

## 7. Error Responses

All errors follow a consistent shape:

```json
{ "message": "Human-readable error description." }
```

| HTTP Code | When |
|-----------|------|
| `401 Unauthorized` | No token or invalid token |
| `403 Forbidden` | Valid token but insufficient role |
| `404 Not Found` | Resource does not exist |
| `422 Unprocessable Entity` | Validation failed or business rule violated |
| `500 Server Error` | Unexpected internal error |

**Common 422 examples:**

```json
{ "message": "Only 3 unit(s) of Basundhara LPG 35kg allocated to you for 2026-06-02. Cannot sell 5." }
{ "message": "Payment of ৳5000.00 exceeds remaining due of ৳3200.00." }
{ "message": "Sold (8) + returned (3) cannot exceed allocated quantity (10)." }
{ "message": "This allocation has already been reconciled." }
{ "message": "Insufficient FIFO stock for cylinder #1. Needed 10, only 7 available." }
```

**Validation error (422) with field details:**
```json
{
  "message": "The items field is required.",
  "errors": {
    "items": ["The items field is required."],
    "sale_date": ["The sale date field is required."]
  }
}
```

---

*CylinderHub API v1 · Laravel 13 · Sanctum Auth · MySQL*
