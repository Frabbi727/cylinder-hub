# CylinderHub — API Collection

**Base URL:** `https://your-domain.com/api/v1`  
**Auth:** Bearer token (Sanctum) — send in `Authorization: Bearer {access_token}`  
**Content-Type:** `application/json`

---

## Standard Response Envelope

All responses follow this structure:

```json
{
  "success": true | false,
  "message": "string",
  "data": { } | [ ]
}
```

Paginated responses add:
```json
{
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 100,
    "last_page": 5,
    "from": 1,
    "to": 20
  },
  "links": {
    "first": "url",
    "last": "url",
    "prev": null,
    "next": "url"
  }
}
```

**Error responses:**
```json
{ "success": false, "message": "Descriptive error message." }
```
HTTP codes: `401` Unauthorized · `403` Forbidden · `422` Validation Error · `500` Server Error

---

## Authentication

### POST `/auth/login`
> Public. No token required.

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
  "message": "Login successful.",
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
    "access_token": "1|aBcDeFgHiJ...",
    "refresh_token": "2|xYzAbCdEfG...",
    "token_type": "Bearer",
    "expires_in": 86400
  }
}
```

**Response 401:**
```json
{ "success": false, "message": "Invalid credentials." }
```

---

### POST `/auth/refresh`
> Requires **refresh token** in Authorization header.

**Response 200:** Same as login — new token pair issued. All old tokens revoked.

**Response 401:**
```json
{ "success": false, "message": "Invalid token type. Send your refresh token to this endpoint." }
```

---

### POST `/auth/logout`
> Requires access token.

**Response 200:**
```json
{ "success": true, "message": "Logged out successfully." }
```

---

### GET `/auth/me`
> Requires access token.

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
    "unread_notifications": 3
  }
}
```

---

## Salesman Dashboard & EOD

### GET `/salesmen/{userId}`
> Salesman: own ID only. Admin: any ID.  
> Powers the salesman dashboard and End-of-Day page.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "salesman": {
      "id": 2,
      "name": "Karim Uddin",
      "phone": "01711-203040",
      "role": "salesman",
      "avatar_initials": "KU",
      "is_active": true,
      "allocations": [
        {
          "id": 5,
          "cylinder_id": 1,
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
            { "customer": "Karim Customer 2", "due_amount": 10000.00 }
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
        "due_amount": 10000.0,
        "payment_type": "partial",
        "customer": { "id": 3, "name": "Karim Customer 2", "phone": null },
        "salesman": { "id": 2, "name": "Karim Uddin", "avatar_initials": "KU" },
        "items": [
          {
            "id": 15,
            "cylinder": { "id": 1, "name": "Omera", "size": "12 kg", "short_code": "12", "color1": "#2BB3C0", "color2": "#0E7B86" },
            "qty": 10,
            "unit_price": 2400.00,
            "unit_cost": 1800.00,
            "profit": 6000.00
          }
        ]
      }
    ],
    "stats": {
      "total_allocated": 30,
      "total_sold": 10,
      "total_returned": 0,
      "total_remaining": 20,
      "cash_collected": 14000.00,
      "today_total_sales_amount": 24000.00,
      "today_paid_total": 14000.00,
      "today_due_amount": 10000.00,
      "pending_due_collections": 0.00,
      "total_cash_to_hand_in": 14000.00,
      "total_outstanding_dues": 10000.00,
      "today_profit": 6000.00
    },
    "pending_collections": []
  }
}
```

**Key fields:**
| Field | Description |
|-------|-------------|
| `cash_collected_actual` | Sale-time cash attributed to this specific allocation |
| `due_from_sales` | Revenue not yet collected for this allocation |
| `customer_dues` | Per-customer breakdown of dues for this cylinder type |
| `total_cash_to_hand_in` | Cash salesman physically holds (hand to admin) |
| `today_profit` | FIFO profit from today's sales |
| `pending_collections` | Due payments collected but not yet swept into EOD |

---

### POST `/allocations/{allocationId}/reconcile`
> Salesman submits End-of-Day for one allocation.

**Request:**
```json
{
  "sold_qty": 10,
  "collected_amount": 14000.00
}
```

**Validation:**
- `sold_qty`: required, integer, min 0, max `allocation.qty`
- `collected_amount`: required, numeric, min 0

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
- `returned_qty` = `qty − sold_qty` (unsold automatically returned to warehouse)
- `is_reconciled` = `true`
- Pending due collections linked to this allocation

---

### GET `/salesmen/{userId}/report`
> Query params: `from` (date), `to` (date)  
> Default: current month.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "salesman": { "id": 2, "name": "Karim Uddin", "phone": "01711-203040" },
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
    "pay_breakdown": { "cash": 1, "partial": 3 },
    "daily_revenue": { "2026-06-04": 168000.00 },
    "sales": [ /* full sale objects */ ],
    "allocations": [ /* allocation objects with cash_collected_actual */ ]
  }
}
```

---

### GET `/salesmen/{userId}/daily-collections`
> Query params: `date` (default: today)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "id": 3,
        "amount": "5000.00",
        "collection_date": "2026-06-04",
        "sale": { "id": 10, "sale_date": "2026-06-04", "total_amount": "24000.00", "paid_amount": "19000.00" },
        "customer": { "id": 3, "name": "Karim Customer 2", "phone": null }
      }
    ],
    "total": 5000.00,
    "date": "2026-06-04"
  }
}
```

---

## Sales

### GET `/sales`
> Salesman: own sales only. Admin: all sales.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `today` | boolean | Filter today only |
| `has_due` | boolean | Only sales with `due_amount > 0` |
| `from` | date | Start date filter |
| `to` | date | End date filter |
| `payment_type` | string | `cash` \| `partial` \| `due` |
| `search` | string | Customer name or phone |
| `page` | int | Pagination (20 per page) |

**Response 200 (paginated):**
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "sale_date": "2026-06-04",
      "total_amount": "24000.00",
      "paid_amount": "14000.00",
      "due_amount": 10000.0,
      "payment_type": "partial",
      "notes": null,
      "customer": { "id": 3, "name": "Karim Customer 2", "phone": null },
      "salesman": { "id": 2, "name": "Karim Uddin", "avatar_initials": "KU" },
      "items": [
        {
          "id": 15,
          "cylinder": { "id": 1, "name": "Omera", "size": "12 kg", "short_code": "12", "color1": "#2BB3C0", "color2": "#0E7B86" },
          "qty": 10,
          "unit_price": 2400.00,
          "unit_cost": 1800.00,
          "profit": 6000.00
        }
      ],
      "created_at": "2026-06-04T14:30:00.000000Z"
    }
  ],
  "meta": { "current_page": 1, "per_page": 20, "total": 4, "last_page": 1 }
}
```

---

### POST `/sales`
> Creates a new sale. Salesman: can only sell to own customers.

**Request:**
```json
{
  "customer_id": 3,
  "sale_date": "2026-06-04",
  "payment_type": "partial",
  "paid_amount": 14000,
  "notes": "Optional note",
  "items": [
    { "cylinder_id": 1, "qty": 10, "unit_price": 2400 }
  ]
}
```

**Field rules:**
| Field | Required | Notes |
|-------|----------|-------|
| `customer_id` | No | Null = walk-in sale |
| `sale_date` | Yes | Must be valid date |
| `payment_type` | Yes | `cash` / `partial` / `due` |
| `paid_amount` | No | Defaults to full if omitted for `cash` |
| `items` | Yes | At least 1 item |
| `items[].cylinder_id` | Yes | Must exist |
| `items[].qty` | Yes | Min 1. Must not exceed allocation balance |
| `items[].unit_price` | Yes | Min 0 |

**Response 201:**
```json
{
  "success": true,
  "message": "Sale recorded.",
  "data": { /* SaleResource — same structure as GET /sales item */ }
}
```

**Error 422 (insufficient stock):**
```json
{ "success": false, "message": "Only 5 unit(s) of Omera 12 kg allocated to you for 2026-06-04. Cannot sell 10." }
```

**Error 403 (wrong customer):**
```json
{ "success": false, "message": "You can only sell to your own customers." }
```

---

### GET `/sales/{saleId}`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "sale": { /* full SaleResource */ },
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

### POST `/sales/{saleId}/pay`
> Collect a payment against an existing due/partial sale.

**Request:**
```json
{
  "amount": 5000,
  "date": "2026-06-04",
  "notes": "Collected at shop"
}
```

**Validation:**
- `amount`: required, numeric, min 0.01, must not exceed remaining due
- `date`: required, date
- `notes`: optional

**Response 200:**
```json
{
  "success": true,
  "message": "Payment collected.",
  "data": { /* updated SaleResource */ }
}
```

**What happens:**
- `sale.paid_amount` increases by `amount`
- `sale.payment_type` updates to `cash` if fully paid, else `partial`
- `DueCollection` record created
- `customer.total_due` decreases by `amount`

---

## Customers

### GET `/customers`
> Salesman: own customers only (`added_by = auth user`).  
> Admin: all customers.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by name or phone |
| `page` | int | Pagination (15 per page) |

**Response 200 (paginated):**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "name": "Karim Customer 2",
      "phone": null,
      "address": null,
      "total_due": "10000.00",
      "added_by": 2,
      "is_active": true,
      "created_at": "2026-06-04T10:00:00.000000Z"
    }
  ],
  "meta": { "current_page": 1, "per_page": 15, "total": 5 }
}
```

---

### POST `/customers`

**Request:**
```json
{
  "name": "New Customer",
  "phone": "01700-123456",
  "address": "Dhaka, Bangladesh"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Created successfully.",
  "data": {
    "id": 10,
    "name": "New Customer",
    "phone": "01700-123456",
    "address": "Dhaka, Bangladesh",
    "total_due": "0.00",
    "added_by": 2,
    "is_active": true
  }
}
```

---

### GET `/customers/{customerId}`
> Salesman: own customers only. Returns 403 for others.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Karim Customer 2",
    "phone": null,
    "address": null,
    "total_due": "10000.00",
    "total_revenue": 24000.00,
    "total_paid": 14000.00,
    "is_active": true,
    "sales": [ /* sale objects */ ],
    "due_collections": [ /* DueCollection objects */ ]
  }
}
```

---

### GET `/customers/overdue`
> Outstanding dues — salesman sees own customers only.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `days` | int | 7 | Minimum days overdue |
| `sort` | string | `amount_desc` | `amount_desc` / `amount_asc` / `days_desc` / `days_asc` |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "customer_id": 3,
      "name": "Karim Customer 2",
      "phone": null,
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

### GET `/customers/{customerId}/empties`
> Shows cylinder balance (sold vs returned) for a customer.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "customer": { "id": 3, "name": "Karim Customer 2" },
    "balances": [
      {
        "cylinder_id": 1,
        "cylinder_name": "Omera",
        "cylinder_size": "12 kg",
        "color1": "#2BB3C0",
        "color2": "#0E7B86",
        "sold_qty": 10,
        "returned_qty": 0,
        "pending_qty": 10
      }
    ],
    "total_pending": 10
  }
}
```

---

## Cylinders

### GET `/cylinders`

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
      "brands": "Omera",
      "color1": "#2BB3C0",
      "color2": "#0E7B86",
      "reorder_level": 10,
      "capacity": 100,
      "status": "active",
      "stock": {
        "filled_qty": 120,
        "empty_qty": 0,
        "capacity": 100
      }
    }
  ]
}
```

---

## Empty Cylinder Returns

### GET `/returns`
> Salesman: own returns only.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `date` | date | Exact date filter |
| `from` | date | Start date |
| `to` | date | End date |
| `cylinder_id` | int | Filter by cylinder |
| `is_extra` | boolean | Only extra returns |
| `is_verified` | boolean/`null` | Filter by verification status |

**Response 200 (paginated, 30/page):**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "return_date": "2026-06-04",
      "qty": 5,
      "type": "empty_return",
      "is_extra": false,
      "extra_reason": null,
      "is_verified": null,
      "notes": null,
      "cylinder": { "id": 1, "name": "Omera", "size": "12 kg", "color1": "#2BB3C0", "color2": "#0E7B86" },
      "customer": { "id": 3, "name": "Karim Customer 2" },
      "salesman": { "id": 2, "name": "Karim Uddin" },
      "created_at": "2026-06-04T16:00:00.000000Z"
    }
  ]
}
```

---

### POST `/returns`

**Request:**
```json
{
  "cylinder_id": 1,
  "qty": 5,
  "type": "empty_return",
  "return_date": "2026-06-04",
  "customer_id": 3,
  "sale_id": 10,
  "notes": "Customer returned empties",
  "is_extra": false,
  "extra_reason": null
}
```

**Field rules:**
| Field | Required | Notes |
|-------|----------|-------|
| `cylinder_id` | Yes | Must exist |
| `qty` | Yes | Min 1 |
| `type` | Yes | `empty_return` or `error_correction` |
| `return_date` | Yes | Valid date |
| `customer_id` | No | Optional |
| `sale_id` | No | Optional |
| `is_extra` | No | Default false. True = needs admin verification |
| `extra_reason` | No | Required if `is_extra = true` |

**Response 201:**
```json
{
  "success": true,
  "message": "Return recorded.",
  "data": { /* CylinderReturn object */ }
}
```

**What happens:**
- `warehouse.empty_qty` increases by `qty`
- Linked to today's active allocation automatically if found

---

## Notifications

### GET `/notifications`

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

### POST `/notifications/read-all`
Marks all notifications as read. Returns `{ "success": true }`.

### POST `/notifications/{id}/read`
Marks one notification as read. Returns `{ "success": true }`.

---

## Admin Dashboard

### GET `/dashboard`
> Admin only.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `period` | string | `today` | `today` / `week` / `month` |
| `from` | date | — | Used when `period=custom` |
| `to` | date | — | Used when `period=custom` |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "today_sales_amount": 362800.00,
      "today_profit": 100800.00,
      "warehouse_stock": 237,
      "total_with_salesman": 45,
      "total_filled_stock": 282,
      "customer_due": 195000.46,
      "supplier_due": 0.00,
      "monthly_expenses": 20000.00,
      "today_sales_count": 4,
      "inventory_value": 378000.00,
      "net_position": 573000.46
    },
    "weekly_chart": [
      { "d": "Fri", "amt": 0.00, "date": "2026-05-29" },
      { "d": "Thu", "amt": 362800.00, "date": "2026-06-04" }
    ],
    "recent_sales": [ /* last 10 sales with customer, salesman, items */ ],
    "live_stock": [
      {
        "cylinder_id": 1,
        "name": "Omera",
        "size": "12 kg",
        "short_code": "12",
        "color1": "#2BB3C0",
        "color2": "#0E7B86",
        "filled_qty": 120,
        "with_salesman_qty": 20,
        "total_filled_qty": 140,
        "empty_qty": 0,
        "capacity": 100,
        "reorder_level": 10
      }
    ]
  }
}
```

---

## Reports (Admin Only)

### GET `/reports/pnl`
**Query params:** `period` (`today`/`week`/`month`) or `from`+`to`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-06-04", "to": "2026-06-04" },
    "total_revenue": 362800.00,
    "total_cogs": 262000.00,
    "gross_profit": 100800.00,
    "gross_margin_pct": 27.78,
    "expenses_breakdown": [
      { "category": "transport", "amount": 5000.00 },
      { "category": "salary", "amount": 10000.00 },
      { "category": "rent", "amount": 5000.00 },
      { "category": "utility", "amount": 0.00 },
      { "category": "other", "amount": 0.00 }
    ],
    "total_expenses": 20000.00,
    "net_profit": 80800.00,
    "net_margin_pct": 22.27,
    "inventory_value": 378000.00
  }
}
```

---

### GET `/reports/cashflow`
**Query params:** same as pnl

**Response 200:**
```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-06-04", "to": "2026-06-04" },
    "cash_in": {
      "sales_collected": 282800.00,
      "due_collections": 0.00,
      "total_in": 282800.00
    },
    "cash_out": {
      "supplier_payments": 0.00,
      "expenses_paid": 20000.00,
      "total_out": 20000.00
    },
    "net": { "net_cash": 262800.00 }
  }
}
```

---

### GET `/reports/cylinder-flow`
**Query params:** `period`, `from`, `to`, `salesman_id` (optional)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-06-04", "to": "2026-06-04" },
    "summary": {
      "total_allocated": 230,
      "total_sold": 165,
      "total_returned_unsold": 65,
      "total_with_salesman": 0,
      "total_empties_collected": 0,
      "total_empties_extra": 0,
      "total_empties_normal": 0
    },
    "by_salesman": [
      {
        "salesman_id": 2,
        "salesman_name": "Karim Uddin",
        "allocated": 130,
        "sold": 90,
        "returned_unsold": 40,
        "with_salesman": 0,
        "empties_collected": 0,
        "sell_through_rate": 69.2
      }
    ],
    "by_cylinder": [
      {
        "cylinder_id": 1,
        "cylinder_name": "Omera",
        "cylinder_size": "12 kg",
        "allocated": 120,
        "sold": 90,
        "returned_unsold": 30,
        "with_salesmen": 0,
        "empties_collected": 0,
        "sell_through_pct": 75.0
      }
    ]
  }
}
```

---

## Admin — Salesman Management

### GET `/salesmen`
> Admin only. Query param: `date` (default today), `active` (boolean)

### POST `/salesmen`
**Request:**
```json
{ "name": "New Salesman", "email": "new@cylinderhub.com", "password": "secure123", "phone": "01700-000000" }
```

### POST `/salesmen/{userId}/allocate`
**Request:**
```json
{ "cylinder_id": 1, "qty": 50, "sale_price": 2400, "allocation_date": "2026-06-05" }
```

### POST `/salesmen/{userId}/toggle-active`
Toggles `is_active`. Returns `{ "id": 2, "is_active": false }`.

---

## Error Reference

| HTTP Code | Meaning |
|-----------|---------|
| 200 | Success |
| 201 | Created |
| 401 | Unauthenticated (no token or expired) |
| 403 | Forbidden (wrong role or wrong ownership) |
| 404 | Not found |
| 422 | Validation error — check `errors` field |
| 500 | Server error |

**422 Validation Error format:**
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

## Mobile App Quick Reference

### Salesman App Startup Flow
```
1. POST /auth/login           → get tokens, store securely
2. GET  /auth/me              → get user role + unread count
3. GET  /salesmen/{userId}    → load dashboard: allocations, stats, today's sales
4. GET  /customers            → load customer list (own only)
5. GET  /cylinders            → load cylinder types for new sale form
```

### New Sale Flow
```
1. GET /customers?search=name  → find or select customer
2. GET /salesmen/{userId}      → check allocation balance before selling
3. POST /sales                 → create the sale
4. (if due) POST /sales/{id}/pay  → collect payment later
```

### End of Day Flow
```
1. GET  /salesmen/{userId}                     → load allocations
2. POST /allocations/{allocationId}/reconcile  → submit each allocation
3. Repeat step 2 for all unreconciled allocations
```

### Collect Empty Cylinders
```
POST /returns  →  { cylinder_id, qty, type: "empty_return", return_date, customer_id }
```

### Token Refresh Strategy
- Store both `access_token` and `refresh_token` securely (e.g. SecureStorage)
- On any `401` response → call `POST /auth/refresh` with refresh token
- Store new token pair → retry original request
- If refresh also fails → redirect to login
