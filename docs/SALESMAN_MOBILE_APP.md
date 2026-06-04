# CylinderHub — Salesman Mobile App

> Everything a salesman needs. Nothing more.

**Base URL:** `https://your-domain.com/api/v1`  
**Auth:** `Authorization: Bearer {access_token}`  
**Content-Type:** `application/json`

---

## Standard Response

Every response:
```json
{ "success": true, "message": "OK", "data": { } }
```
On error:
```json
{ "success": false, "message": "What went wrong." }
```
HTTP codes: `401` expired token · `403` not your data · `422` bad input · `500` server error

---

## App Screens & APIs

```
Login
 └── Dashboard          GET /salesmen/{userId}
      ├── New Sale       POST /sales
      ├── Sales History  GET /sales
      ├── Outstanding Dues  GET /customers/overdue
      │    └── Collect   POST /sales/{id}/pay
      ├── Customers      GET /customers  |  POST /customers
      │    └── Detail    GET /customers/{id}
      ├── Empty Cylinders  POST /returns
      ├── End of Day     GET /salesmen/{userId}  →  POST /allocations/{id}/reconcile
      └── My Reports     GET /salesmen/{userId}/report
```

---

## 1. Authentication

### Login — `POST /auth/login`
No token needed.

**Request:**
```json
{
  "email": "karim@cylinderhub.com",
  "password": "12345678"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "name": "Karim Uddin",
      "email": "karim@cylinderhub.com",
      "phone": "01711-203040",
      "role": "salesman",
      "avatar_initials": "KU",
      "is_active": true
    },
    "access_token": "1|aBcDeFgH...",
    "refresh_token": "2|xYzAbCdE...",
    "token_type": "Bearer",
    "expires_in": 86400
  }
}
```

**Response 401:**
```json
{ "success": false, "message": "Invalid credentials." }
```

> **Store both tokens securely** (e.g. Keychain / SecureStorage).  
> Access token expires in 24 hours. Refresh token lasts 30 days.

---

### Refresh Token — `POST /auth/refresh`
Use when you get a `401` on any request.  
Send the **refresh token** in the Authorization header.

```
Authorization: Bearer {refresh_token}
```

**Response 200:** Same as login — new token pair. Store and retry the failed request.  
**Response 401:** Refresh also failed → send user to Login screen.

---

### Logout — `POST /auth/logout`

**Response 200:**
```json
{ "success": true, "message": "Logged out successfully." }
```

---

### My Profile — `GET /auth/me`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Karim Uddin",
    "email": "karim@cylinderhub.com",
    "phone": "01711-203040",
    "role": "salesman",
    "avatar_initials": "KU",
    "is_active": true,
    "unread_notifications": 2
  }
}
```

---

## 2. Dashboard

### Load Dashboard — `GET /salesmen/{userId}`
The main data source. Powers the dashboard, EOD, and allocation display.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "salesman": {
      "id": 2,
      "name": "Karim Uddin",
      "allocations": [
        {
          "id": 5,
          "allocation_date": "2026-06-04",
          "qty": 30,
          "sale_price": "2400.00",
          "sold_qty": 10,
          "returned_qty": 0,
          "collected_amount": "14000.00",
          "is_reconciled": false,
          "with_salesman": 20,
          "sold_pct": 33,
          "cash_collected_actual": 14000.00,
          "due_from_sales": 10000.00,
          "customer_dues": [
            { "customer": "Rahim", "due_amount": 10000.00 }
          ],
          "cylinder": {
            "id": 1,
            "name": "Omera",
            "size": "12 kg",
            "short_code": "12",
            "color1": "#2BB3C0",
            "color2": "#0E7B86"
          }
        }
      ]
    },
    "today_sales": [
      {
        "id": 10,
        "sale_date": "2026-06-04",
        "total_amount": "24000.00",
        "paid_amount": "14000.00",
        "due_amount": 10000.00,
        "payment_type": "partial",
        "customer": { "id": 3, "name": "Rahim", "phone": "01700-111222" },
        "items": [
          {
            "cylinder": { "id": 1, "name": "Omera", "size": "12 kg" },
            "qty": 10,
            "unit_price": 2400.00
          }
        ],
        "created_at": "2026-06-04T14:30:00.000000Z"
      }
    ],
    "stats": {
      "total_allocated": 30,
      "total_sold": 10,
      "total_returned": 0,
      "total_remaining": 20,
      "cash_collected": 14000.00,
      "today_total_sales_amount": 24000.00,
      "today_due_amount": 10000.00,
      "pending_due_collections": 0.00,
      "total_cash_to_hand_in": 14000.00,
      "total_outstanding_dues": 10000.00,
      "today_profit": 6000.00
    },
    "pending_collections": [
      {
        "id": 3,
        "amount": "5000.00",
        "collection_date": "2026-06-04",
        "customer": { "id": 3, "name": "Rahim", "phone": "01700-111222" },
        "sale": { "id": 10, "sale_date": "2026-06-04", "total_amount": "24000.00" }
      }
    ]
  }
}
```

### Key stats fields

| Field | What to show in UI |
|-------|--------------------|
| `total_allocated` | Cylinders allocated today |
| `total_sold` | Cylinders sold today |
| `with_salesman` (on each alloc) | Cylinders still with you |
| `cash_collected` | Cash from today's sales only |
| `pending_due_collections` | Extra cash from due payments collected |
| `total_cash_to_hand_in` | **Total cash to hand to admin** = `cash_collected + pending_due_collections` |
| `today_profit` | Today's profit (FIFO) |
| `total_outstanding_dues` | All unpaid amounts from your customers |

### Allocation fields

| Field | Meaning |
|-------|---------|
| `qty` | Total allocated |
| `sold_qty` | Already sold (system tracks this) |
| `with_salesman` | `qty − sold_qty − returned_qty` — still in your hands |
| `sale_price` | Selling price per unit |
| `cash_collected_actual` | Cash collected for this allocation's sales |
| `due_from_sales` | Revenue not yet collected for this allocation |
| `is_reconciled` | `true` = EOD done, `false` = still active |

---

## 3. New Sale

### Get Cylinders (for sale form) — `GET /cylinders`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Omera",
      "size": "12 kg",
      "short_code": "12",
      "color1": "#2BB3C0",
      "color2": "#0E7B86",
      "status": "active"
    }
  ]
}
```

---

### Create Sale — `POST /sales`

**Request:**
```json
{
  "customer_id": 3,
  "sale_date": "2026-06-04",
  "payment_type": "partial",
  "paid_amount": 14000,
  "notes": "Delivered to shop",
  "items": [
    { "cylinder_id": 1, "qty": 10, "unit_price": 2400 }
  ]
}
```

**All fields:**

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `customer_id` | No | int | Null = walk-in customer |
| `sale_date` | Yes | date `YYYY-MM-DD` | Today's date normally |
| `payment_type` | Yes | string | `cash` / `partial` / `due` |
| `paid_amount` | No | decimal | Required for `partial`. Omit for `cash` (system uses full amount). Set to 0 for `due`. |
| `notes` | No | string | Optional |
| `items` | Yes | array | At least 1 item |
| `items[].cylinder_id` | Yes | int | Must be an active cylinder |
| `items[].qty` | Yes | int | Min 1. Must not exceed your allocation balance |
| `items[].unit_price` | Yes | decimal | Selling price per unit |

**Payment type rules:**

| Type | paid_amount | Meaning |
|------|-------------|---------|
| `cash` | = total | Full payment now |
| `partial` | > 0, < total | Part paid now, rest is due |
| `due` | 0 | Nothing paid now, all is due |

**Response 201:**
```json
{
  "success": true,
  "message": "Sale recorded.",
  "data": {
    "id": 10,
    "sale_date": "2026-06-04",
    "total_amount": "24000.00",
    "paid_amount": "14000.00",
    "due_amount": 10000.00,
    "payment_type": "partial",
    "customer": { "id": 3, "name": "Rahim" },
    "items": [
      { "cylinder": { "id": 1, "name": "Omera", "size": "12 kg" }, "qty": 10, "unit_price": 2400.00 }
    ]
  }
}
```

**Error — not enough stock:**
```json
{ "success": false, "message": "Only 5 unit(s) of Omera 12 kg allocated to you for 2026-06-04. Cannot sell 10." }
```

**Error — wrong customer:**
```json
{ "success": false, "message": "You can only sell to your own customers." }
```

---

## 4. Sales History

### List Sales — `GET /sales`
Returns only **your** sales.

**Query params:**

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `today` | boolean | `true` | Today's sales only |
| `has_due` | boolean | `true` | Only sales with remaining due |
| `from` | date | `2026-06-01` | Date range start |
| `to` | date | `2026-06-04` | Date range end |
| `payment_type` | string | `partial` | Filter by type |
| `search` | string | `Rahim` | Search customer name/phone |
| `page` | int | `1` | 20 per page |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "sale_date": "2026-06-04",
      "total_amount": "24000.00",
      "paid_amount": "14000.00",
      "due_amount": 10000.00,
      "payment_type": "partial",
      "notes": null,
      "customer": { "id": 3, "name": "Rahim", "phone": "01700-111222" },
      "salesman": { "id": 2, "name": "Karim Uddin", "avatar_initials": "KU" },
      "items": [
        {
          "id": 15,
          "cylinder": { "id": 1, "name": "Omera", "size": "12 kg", "color1": "#2BB3C0", "color2": "#0E7B86" },
          "qty": 10,
          "unit_price": 2400.00
        }
      ],
      "created_at": "2026-06-04T14:30:00.000000Z"
    }
  ],
  "meta": { "current_page": 1, "per_page": 20, "total": 12, "last_page": 1 }
}
```

---

### Sale Detail — `GET /sales/{saleId}`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "sale": {
      "id": 10,
      "sale_date": "2026-06-04",
      "total_amount": "24000.00",
      "paid_amount": "14000.00",
      "due_amount": 10000.00,
      "payment_type": "partial",
      "customer": { "id": 3, "name": "Rahim", "phone": "01700-111222" },
      "items": [ /* same as list */ ]
    },
    "payment_history": [
      {
        "id": 3,
        "amount": 5000.00,
        "collection_date": "2026-06-04",
        "collected_by": "Karim Uddin",
        "notes": null
      }
    ]
  }
}
```

---

## 5. Outstanding Dues

### List Overdue — `GET /customers/overdue`
Only **your** customers' dues.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `days` | int | `7` | Min days overdue (use `0` for all) |
| `sort` | string | `amount_desc` | `amount_desc` / `amount_asc` / `days_desc` / `days_asc` |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "customer_id": 3,
      "name": "Rahim",
      "phone": "01700-111222",
      "total_due": 10000.00,
      "oldest_due_date": "2026-06-04",
      "days_overdue": 0,
      "unpaid_sales_count": 1,
      "salesman_name": "Karim Uddin"
    }
  ]
}
```

---

### Collect Payment on a Sale — `POST /sales/{saleId}/pay`

**Request:**
```json
{
  "amount": 5000,
  "date": "2026-06-04",
  "notes": "Paid at customer's shop"
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `amount` | Yes | Must not exceed `due_amount` |
| `date` | Yes | date `YYYY-MM-DD` |
| `notes` | No | string |

**Response 200:**
```json
{
  "success": true,
  "message": "Payment collected.",
  "data": {
    "id": 10,
    "paid_amount": "19000.00",
    "due_amount": 5000.00,
    "payment_type": "partial"
  }
}
```

**What happens after collecting:**
- `sale.paid_amount` increases
- `customer.total_due` decreases
- A `DueCollection` record is created (pending, to be swept at EOD)
- The amount appears in `pending_due_collections` on dashboard

---

## 6. Customers

### List My Customers — `GET /customers`
Only customers **you created**.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by name or phone (returns flat list, no pagination) |
| `page` | int | 15 per page |

**Response 200 (paginated):**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "name": "Rahim",
      "phone": "01700-111222",
      "address": "Mirpur, Dhaka",
      "total_due": "10000.00",
      "added_by": 2,
      "is_active": true
    }
  ],
  "meta": { "current_page": 1, "per_page": 15, "total": 5 }
}
```

**Search response (no pagination):**
```json
{
  "success": true,
  "data": [ /* flat array of matching customers */ ]
}
```

---

### Add Customer — `POST /customers`

**Request:**
```json
{
  "name": "Karim Shop",
  "phone": "01700-999888",
  "address": "Uttara, Dhaka"
}
```

| Field | Required | Max |
|-------|----------|-----|
| `name` | Yes | 150 chars |
| `phone` | No | 20 chars |
| `address` | No | — |

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 11,
    "name": "Karim Shop",
    "phone": "01700-999888",
    "address": "Uttara, Dhaka",
    "total_due": "0.00",
    "added_by": 2,
    "is_active": true
  }
}
```

---

### Customer Detail — `GET /customers/{customerId}`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Rahim",
    "phone": "01700-111222",
    "total_due": "10000.00",
    "total_revenue": 24000.00,
    "total_paid": 14000.00,
    "sales": [ /* sale objects */ ],
    "due_collections": [
      { "id": 3, "amount": "5000.00", "collection_date": "2026-06-04" }
    ]
  }
}
```

---

### Customer Empty Balance — `GET /customers/{customerId}/empties`
How many cylinders the customer still has (hasn't returned).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "customer": { "id": 3, "name": "Rahim" },
    "balances": [
      {
        "cylinder_id": 1,
        "cylinder_name": "Omera",
        "cylinder_size": "12 kg",
        "color1": "#2BB3C0",
        "color2": "#0E7B86",
        "sold_qty": 10,
        "returned_qty": 3,
        "pending_qty": 7
      }
    ],
    "total_pending": 7
  }
}
```

`pending_qty = sold_qty − returned_qty` = cylinders customer still holds.

---

## 7. Empty Cylinder Returns

### Log Empty Return — `POST /returns`

**Request:**
```json
{
  "cylinder_id": 1,
  "qty": 5,
  "type": "empty_return",
  "return_date": "2026-06-04",
  "customer_id": 3,
  "sale_id": 10,
  "notes": "Returned in good condition",
  "is_extra": false
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `cylinder_id` | Yes | Which cylinder type |
| `qty` | Yes | Min 1 |
| `type` | Yes | Always `empty_return` for normal returns. `error_correction` for stock corrections |
| `return_date` | Yes | Date `YYYY-MM-DD` |
| `customer_id` | No | Which customer returned |
| `sale_id` | No | Which sale this empty is from |
| `notes` | No | Optional note |
| `is_extra` | No | `true` = extra/unusual return, needs admin approval |
| `extra_reason` | No | Required only if `is_extra: true` |

**`extra_reason` values:**

| Value | Meaning |
|-------|---------|
| `old_stock` | Old cylinder from customer's storage |
| `neighbour` | Collected from a neighbour |
| `competitor` | Competitor's cylinder |
| `salesman_handover` | Transferred from another salesman |
| `other` | Other reason |

**Response 201:**
```json
{
  "success": true,
  "message": "Return recorded.",
  "data": {
    "id": 5,
    "cylinder_id": 1,
    "qty": 5,
    "type": "empty_return",
    "return_date": "2026-06-04",
    "is_extra": false,
    "is_verified": null,
    "cylinder": { "id": 1, "name": "Omera", "size": "12 kg" },
    "customer": { "id": 3, "name": "Rahim" }
  }
}
```

---

### List My Returns — `GET /returns`
Only your returns.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `date` | date | Exact date |
| `from` | date | Start date |
| `to` | date | End date |
| `cylinder_id` | int | Filter by cylinder |

**Response 200 (30 per page):**
```json
{
  "success": true,
  "data": [ /* CylinderReturn objects */ ]
}
```

---

## 8. End of Day (EOD)

### How it works
1. Load your allocations from **`GET /salesmen/{userId}`** (already fetched for dashboard)
2. For each unreconciled allocation (`is_reconciled: false`):
   - Show the salesman: allocated qty, sold qty, cash collected
   - Let them confirm or adjust
3. Submit each allocation via **`POST /allocations/{id}/reconcile`**

### Reconcile an Allocation — `POST /allocations/{allocationId}/reconcile`

**Request:**
```json
{
  "sold_qty": 10,
  "collected_amount": 14000.00
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `sold_qty` | Yes | int, 0 to `allocation.qty` |
| `collected_amount` | Yes | decimal, min 0 |

**Response 200:**
```json
{
  "success": true,
  "message": "Allocation reconciled.",
  "data": {
    "id": 5,
    "sold_qty": 10,
    "returned_qty": 20,
    "collected_amount": "14000.00",
    "is_reconciled": true
  }
}
```

**What happens:**
- `returned_qty` = `qty − sold_qty` (automatically calculated, unsold go back to warehouse)
- Allocation locked (`is_reconciled = true`)
- Pending due collections swept in

**Error — already reconciled:**
```json
{ "success": false, "message": "This allocation has already been reconciled." }
```

---

### Pre-filled form values (what to show salesman)
From the allocation object in `GET /salesmen/{userId}`:

| Show as | Value from | Description |
|---------|-----------|-------------|
| Allocated | `alloc.qty` | Total cylinders given |
| Sold (system) | `alloc.sold_qty` | Auto-updated from sales |
| Price/pcs | `alloc.sale_price` | Selling price |
| Customers paid | `alloc.cash_collected_actual` | Cash received from customers |
| Credit given | `alloc.due_from_sales` | Cash not yet received |
| Cash submitted | `alloc.collected_amount` if > 0, else `alloc.cash_collected_actual` | Pre-fill for salesman to confirm |

---

## 9. My Reports

### Personal Report — `GET /salesmen/{userId}/report`

**Query params:** `from` (date) and `to` (date). Default: current month.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "salesman": { "id": 2, "name": "Karim Uddin" },
    "period": { "from": "2026-06-01", "to": "2026-06-04" },
    "total_allocated": 130,
    "total_sold": 90,
    "total_returned": 40,
    "total_revenue": 168000.00,
    "total_cash_collected": 128000.00,
    "total_dues_created": 40000.00,
    "total_dues_collected": 0.00,
    "still_outstanding": 40000.00,
    "collection_rate_pct": 0.0,
    "customers_reached": 3,
    "sell_through_rate": 0.6923,
    "pay_breakdown": {
      "cash": 1,
      "partial": 3
    },
    "daily_revenue": {
      "2026-06-04": 168000.00
    }
  }
}
```

**Key metrics:**

| Field | Formula | Meaning |
|-------|---------|---------|
| `sell_through_rate` | sold / allocated | 0.69 = 69% of stock sold |
| `collection_rate_pct` | dues_collected / dues_created × 100 | % of credit sales collected |
| `still_outstanding` | dues_created − dues_collected | Still needs to be collected |
| `customers_reached` | unique customers with sales | How many customers served |

---

## 10. Notifications

### List — `GET /notifications`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "low_stock",
      "title": "Low Stock Alert",
      "body": "Omera 12 kg is below reorder level",
      "is_read": false,
      "created_at": "2026-06-04T10:00:00.000000Z"
    }
  ]
}
```

### Mark one read — `POST /notifications/{id}/read`
### Mark all read — `POST /notifications/read-all`

Both return: `{ "success": true }`

---

## Token Strategy (Important)

```
App starts
 ├─ Has saved access_token?
 │   ├─ Yes → try GET /auth/me
 │   │         ├─ 200 → go to Dashboard
 │   │         └─ 401 → try POST /auth/refresh
 │   │                   ├─ 200 → save new tokens → Dashboard
 │   │                   └─ 401 → show Login
 │   └─ No  → show Login

Any API call returns 401?
 └─ POST /auth/refresh
     ├─ 200 → update stored tokens → retry original call
     └─ 401 → clear all tokens → show Login
```

---

## Business Rules (Salesman)

1. **You see only your customers** — `GET /customers` always scoped to you
2. **You sell only to your customers** — `POST /sales` with someone else's `customer_id` = 403
3. **You cannot sell more than allocated** — system validates allocation balance
4. **FIFO stock** — oldest allocation consumed first automatically
5. **Partial payment creates a due** — tracked on `Customer.total_due`
6. **Collecting a due is separate** — `POST /sales/{id}/pay` creates a pending collection
7. **Pending collections are handed in at EOD** — shown in `pending_due_collections`
8. **EOD is final** — once reconciled, allocation is locked (admin only can edit)

---

## Quick Flow Summary

### Start of Day
```
GET /salesmen/{userId}   →   see your allocations for today
```

### Making a Sale
```
GET /customers?search=name   →   find customer (or create with POST /customers)
GET /salesmen/{userId}       →   check how many cylinders you have left
POST /sales                  →   record the sale
```

### Collecting a Due
```
GET /customers/overdue       →   see who owes you
POST /sales/{saleId}/pay     →   collect the payment
```

### Returning Empties
```
POST /returns   →   log empty cylinders returned by customer
```

### End of Day
```
GET  /salesmen/{userId}                    →   load all unreconciled allocations
POST /allocations/{id}/reconcile           →   submit each one (repeat for each)
```
