# CylinderHub Admin API Reference

> **Base URL:** `http://your-domain.com/api/v1`
> **Auth:** All protected routes require `Authorization: Bearer {access_token}` header
> **Content-Type:** `application/json`
> **Note:** `// type` comments in JSON blocks are documentation annotations — they are NOT part of the actual JSON.

---

## Type Notation Legend

| Notation | Meaning | Example value |
|----------|---------|---------------|
| `integer` | Whole number, never decimal | `1`, `50`, `200` |
| `string` | UTF-8 text | `"John Doe"` |
| `decimal(2)` | Floating-point, always 2 decimal places in response | `5000.00`, `0.00` |
| `boolean` | `true` or `false`, never `0`/`1` or `"true"` | `true`, `false` |
| `date` | ISO 8601 date string `YYYY-MM-DD` | `"2026-06-05"` |
| `datetime` | ISO 8601 datetime with timezone `YYYY-MM-DDTHH:MM:SSZ` | `"2026-06-05T10:30:00Z"` |
| `enum` | Fixed set of allowed string values | `"cash"`, `"due"`, `"partial"` |
| `object` | Nested JSON object | `{ "id": 1, "name": "..." }` |
| `array` | JSON array (can be empty `[]`) | `[{ ... }, { ... }]` |
| `T \| null` | Can be type T or JSON `null` | `"01700000000"` or `null` |
| `[computed]` | Not stored in DB; calculated by the server on every response | `due_amount`, `line_total` |
| `[FK]` | Foreign key — ID pointing to another resource | `customer_id`, `salesman_id` |

### Numeric precision rules
- **Money fields** (`amount`, `total_*`, `paid_*`, `due_*`, `cost`, `price`, `profit`, `revenue`) → always `decimal(2)` — parse as float/double, display with 2 dp
- **Quantity fields** (`qty`, `*_qty`, `count`, `*_count`) → always `integer` — never decimal
- **Percentage fields** (`sold_pct`, `*_pct`, `percent_used`) → `decimal(2)` (e.g. `75.00`, `100.00`)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Dashboard](#2-dashboard)
3. [Cylinders](#3-cylinders)
4. [Stock & Inventory](#4-stock--inventory)
5. [Refill Orders](#5-refill-orders)
6. [Purchases](#6-purchases)
7. [Suppliers](#7-suppliers)
8. [Sales](#8-sales)
9. [Customers](#9-customers)
10. [Salesmen Management](#10-salesmen-management)
11. [Allocations](#11-allocations)
12. [Cylinder Returns](#12-cylinder-returns)
13. [Expenses & Budgets](#13-expenses--budgets)
14. [Reports](#14-reports)
15. [Notifications](#15-notifications)
16. [Audit Logs](#16-audit-logs)
17. [Data Types Reference](#17-data-types-reference)
18. [Common Error Responses](#18-common-error-responses)

---

## 1. Authentication

### 1.1 Login
**POST** `/v1/auth/login`
> Public — no token required

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | `string` | Yes | Valid email format |
| `password` | `string` | Yes | |

```json
{
  "email": "admin@example.com",
  "password": "secret123"
}
```

**Success Response `200`:**
```json
{
  "success": true,                        // boolean
  "message": "Login successful.",         // string
  "data": {
    "user": {
      "id": 1,                            // integer
      "name": "Admin User",              // string
      "email": "admin@example.com",      // string
      "phone": "01700000000",            // string | null
      "role": "admin",                   // enum: "admin" | "salesman"
      "avatar_initials": "AU",           // string (1–2 uppercase letters)
      "is_active": true                  // boolean
    },
    "access_token": "2|AbcXyz...",       // string (Sanctum token)
    "refresh_token": "3|DefUvw...",      // string (Sanctum token)
    "token_type": "Bearer",             // string (always "Bearer")
    "expires_in": 86400                  // integer (seconds until access_token expires)
  }
}
```

**Error Response `401`:**
```json
{
  "success": false,                      // boolean
  "message": "Invalid credentials."     // string
}
```

---

### 1.2 Refresh Token
**POST** `/v1/auth/refresh`
> Requires **refresh_token** in `Authorization: Bearer` header

**Request Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `refresh_token` | `string` | Yes | The refresh token received at login |

**Success Response `200`:**
```json
{
  "success": true,                        // boolean
  "message": "Token refreshed.",          // string
  "data": {
    "access_token": "5|NewToken...",      // string
    "refresh_token": "6|NewRefresh...",   // string (old tokens are revoked)
    "token_type": "Bearer",              // string
    "expires_in": 86400                   // integer (seconds)
  }
}
```

---

### 1.3 Logout
**POST** `/v1/auth/logout`

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "message": "Logged out."      // string
}
```

---

### 1.4 Get Authenticated User
**GET** `/v1/auth/me`

**Success Response `200`:**
```json
{
  "success": true,                  // boolean
  "data": {
    "user": {
      "id": 1,                      // integer
      "name": "Admin User",        // string
      "email": "admin@example.com", // string
      "phone": "01700000000",       // string | null
      "role": "admin",             // enum: "admin" | "salesman"
      "avatar_initials": "AU",     // string
      "is_active": true            // boolean
    },
    "unread_notifications": 3      // integer
  }
}
```

---

## 2. Dashboard

### 2.1 Get Dashboard Summary
**GET** `/v1/dashboard`
> Admin only

**Query Parameters:**
| Param | Type | Default | Allowed values |
|-------|------|---------|----------------|
| `period` | `string` | `today` | `today`, `week`, `month`, `custom` |
| `from` | `date` | — | `YYYY-MM-DD` — required when `period=custom` |
| `to` | `date` | — | `YYYY-MM-DD` — required when `period=custom` |

**Success Response `200`:**
```json
{
  "success": true,                          // boolean
  "message": "OK",                          // string
  "data": {
    "summary": {
      "today_sales_amount": 50000.00,       // decimal(2) — total sales revenue in period
      "today_profit": 5000.00,              // decimal(2) — gross profit in period
      "today_sales_count": 15,              // integer — number of sales in period
      "warehouse_stock": 150,               // integer — total filled cylinders in warehouse
      "total_with_salesman": 80,            // integer — total cylinders currently with salesmen
      "total_filled_stock": 230,            // integer — warehouse + with salesmen combined
      "customer_due": 100000.00,            // decimal(2) — total outstanding from all customers
      "supplier_due": 45000.00,             // decimal(2) — total owed to all suppliers
      "monthly_expenses": 25000.00,         // decimal(2) — expenses recorded this calendar month
      "inventory_value": 500000.00,         // decimal(2) — total stock value at FIFO cost
      "net_position": 555000.00             // decimal(2) — inventory_value + customer_due - supplier_due
    },
    "weekly_chart": [
      {
        "date": "2026-05-30",              // date (YYYY-MM-DD)
        "label": "Fri",                    // string (short day name)
        "total_amount": 35000.00           // decimal(2) — sales amount on that day
      }
    ],
    "recent_sales": [
      {
        "id": 101,                         // integer
        "customer": {
          "id": 5,                         // integer
          "name": "John Doe",             // string
          "phone": "01711..."             // string | null
        },
        "salesman": {
          "id": 2,                         // integer
          "name": "Rahim",               // string
          "avatar_initials": "R"         // string
        },
        "sale_date": "2026-06-05",        // date (YYYY-MM-DD)
        "total_amount": 5000.00,          // decimal(2)
        "paid_amount": 5000.00,           // decimal(2)
        "due_amount": 0.00,              // decimal(2) [computed]
        "payment_type": "cash"           // enum: "cash" | "due" | "partial"
      }
    ],
    "live_stock": [
      {
        "cylinder_id": 1,                 // integer [FK → cylinders.id]
        "cylinder": {
          "id": 1,                        // integer
          "name": "12.5 KG",            // string
          "short_code": "12K",          // string (max 5 chars)
          "color1": "#ff0000",          // string | null (hex color, e.g. "#rrggbb")
          "color2": "#ffffff"           // string | null (hex color)
        },
        "filled_qty": 150,              // integer — cylinders in warehouse
        "empty_qty": 40,               // integer — empties in warehouse
        "with_salesman": 80,           // integer [computed from allocations]
        "reorder_level": 20            // integer | null — alert threshold
      }
    ]
  }
}
```

---

## 3. Cylinders

### 3.1 List All Cylinders
**GET** `/v1/cylinders`
> All roles — returns array (not paginated)

**Success Response `200`:**
```json
{
  "success": true,                         // boolean
  "data": [
    {
      "id": 1,                             // integer
      "name": "12.5 KG",                  // string
      "size": "12.5",                      // string (stored as string, e.g. "5", "12.5", "35")
      "short_code": "12K",                 // string (max 5 chars, used as display label)
      "color1": "#ff0000",                 // string | null (primary hex color)
      "color2": "#ffffff",                 // string | null (secondary hex color)
      "brands": "Jamuna, Bashundhara",     // string | null (comma-separated brand names)
      "status": "active",                  // enum: "active" | "inactive"
      "reorder_level": 20,                 // integer | null (warn if filled_qty drops below this)
      "capacity": 500,                     // integer | null (max units this type can hold)
      "stock": {
        "filled_qty": 150,                 // integer (cylinders ready to sell)
        "empty_qty": 40                    // integer (empties awaiting refill)
      },
      "first_fifo_item": {
        "id": 10,                          // integer | null (null if no stock purchased yet)
        "unit_cost": 800.00,               // decimal(2) | null (oldest lot's cost per unit)
        "remaining_qty": 50                // integer | null
      }
    }
  ]
}
```

---

### 3.2 Get Single Cylinder
**GET** `/v1/cylinders/{cylinder}`
> All roles — `{cylinder}` is an `integer` (cylinder ID)

**Success Response `200`:**
```json
{
  "success": true,                     // boolean
  "data": {
    "id": 1,                           // integer
    "name": "12.5 KG",                // string
    "size": "12.5",                    // string
    "short_code": "12K",               // string (max 5 chars)
    "color1": "#ff0000",               // string | null
    "color2": "#ffffff",               // string | null
    "brands": "Jamuna, Bashundhara",   // string | null
    "status": "active",                // enum: "active" | "inactive"
    "reorder_level": 20,               // integer | null
    "capacity": 500,                   // integer | null
    "stock": {
      "filled_qty": 150,               // integer
      "empty_qty": 40                  // integer
    }
  }
}
```

---

### 3.3 Create Cylinder
**POST** `/v1/cylinders`
> Admin only

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | `string` | Yes | max 100 chars |
| `size` | `string` | Yes | max 50 chars |
| `short_code` | `string` | Yes | max 5 chars |
| `color1` | `string` | No | hex color string e.g. `#ff0000` |
| `color2` | `string` | No | hex color string |
| `brands` | `string` | No | free text |
| `status` | `string` | No | `"active"` or `"inactive"`, defaults to `"active"` |
| `reorder_level` | `integer` | No | min 0 |
| `capacity` | `integer` | No | min 1 |

```json
{
  "name": "5 KG",
  "size": "5",
  "short_code": "5K",
  "color1": "#0000ff",
  "color2": null,
  "brands": null,
  "status": "active",
  "reorder_level": 10,
  "capacity": 200
}
```

**Success Response `201`:**
```json
{
  "success": true,                  // boolean
  "message": "Cylinder created.",   // string
  "data": {
    "id": 5,                        // integer (newly assigned ID)
    "name": "5 KG",                // string
    "size": "5",                    // string
    "short_code": "5K",             // string
    "color1": "#0000ff",            // string | null
    "color2": null,                 // string | null
    "brands": null,                 // string | null
    "status": "active",             // enum: "active" | "inactive"
    "reorder_level": 10,            // integer | null
    "capacity": 200                 // integer | null
  }
}
```

---

### 3.4 Update Cylinder
**PUT** `/v1/cylinders/{cylinder}`
> Admin only — same request body as Create (all fields optional except name/size/short_code)

**Success Response `200`:**
```json
{
  "success": true,                  // boolean
  "message": "Cylinder updated.",   // string
  "data": { "...same shape as Create response data..." }
}
```

---

### 3.5 Delete Cylinder
**DELETE** `/v1/cylinders/{cylinder}`
> Admin only

**Success Response `200`:**
```json
{
  "success": true,                  // boolean
  "message": "Cylinder deleted."    // string
}
```

---

## 4. Stock & Inventory

### 4.1 Get All Stock
**GET** `/v1/stock`
> Admin only — returns array (not paginated)

**Success Response `200`:**
```json
{
  "success": true,                    // boolean
  "data": [
    {
      "cylinder_id": 1,              // integer [FK → cylinders.id]
      "cylinder": {
        "id": 1,                     // integer
        "name": "12.5 KG",          // string
        "short_code": "12K",         // string
        "color1": "#ff0000",         // string | null
        "reorder_level": 20          // integer | null
      },
      "filled_qty": 150,             // integer (warehouse-level filled cylinders)
      "empty_qty": 40,               // integer (warehouse-level empties)
      "capacity": 500                // integer | null (max capacity for this type)
    }
  ]
}
```

---

### 4.2 Get Stock History for Cylinder
**GET** `/v1/stock/{cylinderId}/history`
> Admin only — `{cylinderId}` is an `integer`
> Paginated: 30 per page

**Query Parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | `integer` | `1` | Page number |

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "data": [
      {
        "id": 100,                         // integer
        "cylinder_id": 1,                  // integer [FK → cylinders.id]
        "event_type": "purchase",          // enum — see Event Types below
        "change_qty": 50,                  // integer (positive = stock added, negative = removed)
        "balance_after": 200,              // integer (filled_qty after this event)
        "reference_id": 5,                 // integer | null (ID of related record, e.g. purchase ID)
        "notes": "Purchase batch #5",      // string | null
        "created_at": "2026-06-05T10:30:00Z", // datetime (ISO 8601, UTC)
        "recorded_by_user": {
          "id": 1,                         // integer
          "name": "Admin User"            // string
        }
      }
    ],
    "current_page": 1,         // integer
    "last_page": 3,            // integer
    "per_page": 30,            // integer (fixed at 30)
    "total": 85                // integer (total records across all pages)
  }
}
```

**Event Type enum values:**
| Value | Meaning |
|-------|---------|
| `purchase` | Stock added from a purchase |
| `refill_sent` | Empties sent for refill (empty_qty decreased) |
| `refill_received` | Refilled cylinders received (filled_qty increased) |
| `allocation` | Cylinders allocated to salesman (filled_qty decreased) |
| `allocation_edit` | Allocation qty adjusted |
| `eod_return` | Unsold cylinders auto-returned after EOD reconcile |
| `sale` | Cylinders sold (reduces allocation sold_qty tracking) |
| `sale_delete` | Sale deleted, stock restored |
| `cylinder_return` | Customer/salesman returned empty cylinder |
| `reconcile_adjustment` | Admin manually adjusted a reconciled allocation |

---

## 5. Refill Orders

### 5.1 List Refill Orders
**GET** `/v1/stock/refills`
> Admin only — Paginated: 20 per page

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "data": [
      {
        "id": 10,                            // integer
        "cylinder_id": 1,                    // integer [FK → cylinders.id]
        "supplier_id": 2,                    // integer [FK → suppliers.id]
        "qty_sent": 100,                     // integer (empties sent for refill)
        "qty_received": 80,                  // integer (filled ones received back so far)
        "sent_date": "2026-05-30",           // date (YYYY-MM-DD)
        "received_date": "2026-06-02",       // date | null (null until first receive)
        "status": "partially_received",      // enum: "pending" | "partially_received" | "received"
        "refill_cost": 5000.00,              // decimal(2) | null (optional cost)
        "notes": null,                       // string | null
        "cylinder": {
          "id": 1,                           // integer
          "name": "12.5 KG",               // string
          "short_code": "12K"              // string
        },
        "supplier": {
          "id": 2,                           // integer
          "name": "Jamuna Gas"             // string
        },
        "recorded_by_user": {
          "id": 1,                           // integer
          "name": "Admin"                  // string
        }
      }
    ],
    "current_page": 1,         // integer
    "last_page": 2,            // integer
    "per_page": 20,            // integer (fixed)
    "total": 35                // integer
  }
}
```

---

### 5.2 Create Refill Order
**POST** `/v1/stock/refill`
> Admin only

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `cylinder_id` | `integer` | Yes | must exist in cylinders table |
| `supplier_id` | `integer` | Yes | must exist in suppliers table |
| `qty_sent` | `integer` | Yes | min 1, must not exceed current `empty_qty` |
| `sent_date` | `date` | Yes | `YYYY-MM-DD` |
| `refill_cost` | `decimal` | No | min 0 |
| `notes` | `string` | No | free text |

**Success Response `201`:**
```json
{
  "success": true,                       // boolean
  "message": "Refill order created.",    // string
  "data": {
    "id": 11,                            // integer
    "cylinder_id": 1,                    // integer [FK]
    "supplier_id": 2,                    // integer [FK]
    "qty_sent": 100,                     // integer
    "qty_received": 0,                   // integer (starts at 0)
    "sent_date": "2026-06-05",           // date (YYYY-MM-DD)
    "received_date": null,               // date | null (null on creation)
    "status": "pending",                 // enum: always "pending" on creation
    "refill_cost": 5000.00,              // decimal(2) | null
    "notes": null                        // string | null
  }
}
```

---

### 5.3 Receive Refill Order
**POST** `/v1/stock/refill/{refill}/receive`
> Admin only — `{refill}` is an `integer` (refill order ID)

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `qty_received` | `integer` | Yes | min 1, max = `qty_sent - qty_received` |
| `received_date` | `date` | Yes | `YYYY-MM-DD` |

**Success Response `200`:**
```json
{
  "success": true,                   // boolean
  "message": "Refill received.",     // string
  "data": {
    "id": 11,                        // integer
    "qty_sent": 100,                 // integer (unchanged)
    "qty_received": 80,              // integer (cumulative total received)
    "status": "partially_received",  // enum: "partially_received" | "received"
    "received_date": "2026-06-05"    // date (YYYY-MM-DD)
  }
}
```

---

## 6. Purchases

### 6.1 List Purchases
**GET** `/v1/purchases`
> Admin only — Paginated: 15 per page

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "data": [
      {
        "id": 20,                              // integer
        "supplier_id": 2,                      // integer [FK → suppliers.id]
        "recorded_by": 1,                      // integer [FK → users.id]
        "purchase_date": "2026-06-01",         // date (YYYY-MM-DD)
        "total_amount": 80000.00,              // decimal(2) [computed from items]
        "paid_amount": 50000.00,               // decimal(2)
        "due_amount": 30000.00,                // decimal(2) (total_amount - paid_amount)
        "notes": null,                         // string | null
        "total_qty": 100,                      // integer [computed] — sum of all item qty
        "total_remaining_qty": 60,             // integer [computed] — sum of unsold item qty
        "supplier": {
          "id": 2,                             // integer
          "name": "Jamuna Gas",               // string
          "phone": "01700000001"              // string | null
        },
        "recorded_by_user": {
          "id": 1,                             // integer
          "name": "Admin"                    // string
        },
        "items": [
          {
            "id": 30,                          // integer
            "cylinder_id": 1,                  // integer [FK → cylinders.id]
            "qty": 100,                        // integer (original purchased qty)
            "remaining_qty": 60,               // integer (unsold qty still in FIFO)
            "unit_cost": 800.00,               // decimal(2) — cost per unit
            "status": "active",                // enum: "pending" | "active" | "done"
            "line_total": 80000.00,            // decimal(2) [computed = qty × unit_cost]
            "cylinder": {
              "id": 1,                         // integer
              "name": "12.5 KG",             // string
              "short_code": "12K"            // string
            }
          }
        ]
      }
    ],
    "current_page": 1,         // integer
    "last_page": 4,            // integer
    "per_page": 15,            // integer (fixed)
    "total": 52                // integer
  }
}
```

**PurchaseItem status enum values:**
| Value | Meaning |
|-------|---------|
| `pending` | Not yet used in any sale (FIFO queue position) |
| `active` | Partially consumed — some qty sold |
| `done` | Fully consumed — remaining_qty = 0 |

---

### 6.2 Create Purchase
**POST** `/v1/purchases`
> Admin only

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `supplier_id` | `integer` | Yes | must exist |
| `purchase_date` | `date` | Yes | `YYYY-MM-DD` |
| `paid_amount` | `decimal` | No | min 0, max = computed total |
| `notes` | `string` | No | |
| `items` | `array` | Yes | min 1 item |
| `items[].cylinder_id` | `integer` | Yes | must exist |
| `items[].qty` | `integer` | Yes | min 1 |
| `items[].unit_cost` | `decimal` | Yes | min 0 |

```json
{
  "supplier_id": 2,
  "purchase_date": "2026-06-05",
  "paid_amount": 0,
  "notes": null,
  "items": [
    {
      "cylinder_id": 1,
      "qty": 100,
      "unit_cost": 800.00
    }
  ]
}
```

**Success Response `201`:**
```json
{
  "success": true,                      // boolean
  "message": "Purchase recorded.",      // string
  "data": {
    "id": 21,                           // integer
    "supplier_id": 2,                   // integer [FK]
    "purchase_date": "2026-06-05",      // date (YYYY-MM-DD)
    "total_amount": 80000.00,           // decimal(2) [computed]
    "paid_amount": 0.00,                // decimal(2)
    "due_amount": 80000.00,             // decimal(2)
    "items": [ { "...same shape as list response items..." } ]
  }
}
```

---

### 6.3 Get Single Purchase
**GET** `/v1/purchases/{purchase}`
> Admin only — `{purchase}` is an `integer`

**Success Response `200`:** Same shape as a single item from the list response.

---

### 6.4 Pay Purchase
**POST** `/v1/purchases/{purchase}/pay`
> Admin only

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `amount` | `decimal` | Yes | min 0.01 |
| `payment_date` | `date` | Yes | `YYYY-MM-DD` |
| `notes` | `string` | No | |

**Success Response `200`:**
```json
{
  "success": true,                    // boolean
  "message": "Payment recorded.",     // string
  "data": {
    "purchase_id": 21,                // integer
    "paid_amount": 30000.00,          // decimal(2) — updated cumulative paid
    "due_amount": 50000.00            // decimal(2) — updated remaining due
  }
}
```

---

### 6.5 Get FIFO Queue for Cylinder
**GET** `/v1/purchases/fifo/{cylinderId}`
> Admin only — `{cylinderId}` is an `integer`
> Returns ordered list (oldest first) of unconsumed purchase lots

**Success Response `200`:**
```json
{
  "success": true,            // boolean
  "data": [
    {
      "id": 30,                          // integer
      "purchase_id": 20,                 // integer [FK → purchases.id]
      "cylinder_id": 1,                  // integer [FK → cylinders.id]
      "unit_cost": 800.00,               // decimal(2)
      "qty": 100,                        // integer (original qty in this lot)
      "remaining_qty": 60,               // integer (unconsumed qty — next sale will draw from this)
      "status": "active",                // enum: "pending" | "active" | "done"
      "purchase": {
        "id": 20,                        // integer
        "purchase_date": "2026-06-01",   // date (YYYY-MM-DD)
        "supplier": {
          "id": 2,                       // integer
          "name": "Jamuna Gas"          // string
        }
      }
    }
  ]
}
```

---

### 6.6 Simulate FIFO Consumption
**POST** `/v1/purchases/simulate`
> Admin only — read-only, no stock changes

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `cylinder_id` | `integer` | Yes | must exist |
| `qty` | `integer` | Yes | min 1 |
| `sale_price` | `decimal` | Yes | min 0 — the intended selling price per unit |

**Success Response `200`:**
```json
{
  "success": true,                 // boolean
  "data": {
    "cylinder_id": 1,             // integer [FK]
    "qty_requested": 10,          // integer (echoes request)
    "lots_consumed": [
      {
        "purchase_item_id": 30,   // integer [FK → purchase_items.id]
        "qty_from_lot": 10,       // integer (how many units drawn from this lot)
        "unit_cost": 800.00,      // decimal(2) — cost from this lot
        "unit_price": 1000.00,    // decimal(2) — the sale_price you sent
        "profit_per_unit": 200.00, // decimal(2) [computed = unit_price - unit_cost]
        "line_profit": 2000.00    // decimal(2) [computed = qty_from_lot × profit_per_unit]
      }
    ],
    "total_cost": 8000.00,        // decimal(2) — sum of all lot costs
    "total_revenue": 10000.00,    // decimal(2) — qty × sale_price
    "total_profit": 2000.00       // decimal(2) — total_revenue - total_cost
  }
}
```

---

## 7. Suppliers

### 7.1 List Suppliers
**GET** `/v1/suppliers`
> Admin only — Paginated: 15 per page

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "data": [
      {
        "id": 2,                 // integer
        "name": "Jamuna Gas",   // string
        "type": "dealer",       // enum: "dealer" | "self" | null
        "phone": "01700000001", // string | null
        "address": "Dhaka, BD", // string | null
        "total_due": 30000.00,  // decimal(2) — outstanding amount owed to supplier
        "is_active": true       // boolean
      }
    ],
    "current_page": 1,          // integer
    "last_page": 1,             // integer
    "per_page": 15,             // integer (fixed)
    "total": 3                  // integer
  }
}
```

---

### 7.2 Create Supplier
**POST** `/v1/suppliers`
> Admin only

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | `string` | Yes | max 150 chars |
| `type` | `string` | No | `"dealer"` or `"self"` |
| `phone` | `string` | No | max 20 chars |
| `address` | `string` | No | free text |

**Success Response `201`:**
```json
{
  "success": true,                  // boolean
  "message": "Supplier created.",   // string
  "data": {
    "id": 3,                        // integer
    "name": "Bashundhara Gas",     // string
    "type": "dealer",              // enum: "dealer" | "self" | null
    "phone": "01711000000",        // string | null
    "address": null,               // string | null
    "total_due": 0.00,             // decimal(2) — always 0.00 on creation
    "is_active": true              // boolean — always true on creation
  }
}
```

---

### 7.3 Get Single Supplier
**GET** `/v1/suppliers/{supplier}`
> Admin only — `{supplier}` is an `integer`

**Success Response `200`:**
```json
{
  "success": true,                    // boolean
  "data": {
    "id": 2,                          // integer
    "name": "Jamuna Gas",            // string
    "type": "dealer",                // enum: "dealer" | "self" | null
    "phone": "01700000001",          // string | null
    "address": "Dhaka, BD",          // string | null
    "total_due": 30000.00,           // decimal(2)
    "is_active": true,               // boolean
    "purchases": [
      {
        "id": 20,                    // integer
        "purchase_date": "2026-06-01", // date (YYYY-MM-DD)
        "total_amount": 80000.00,    // decimal(2)
        "due_amount": 30000.00       // decimal(2)
      }
    ],
    "due_payments": [
      {
        "id": 5,                     // integer
        "amount": 50000.00,          // decimal(2)
        "payment_date": "2026-06-03" // date (YYYY-MM-DD)
      }
    ]
  }
}
```

---

### 7.4 Update Supplier
**PUT** `/v1/suppliers/{supplier}`
> Admin only — same request body as Create

**Success Response `200`:**
```json
{
  "success": true,                  // boolean
  "message": "Supplier updated.",   // string
  "data": { "...same shape as Create response data..." }
}
```

---

### 7.5 Delete Supplier
**DELETE** `/v1/suppliers/{supplier}`
> Admin only

**Success Response `200`:**
```json
{
  "success": true,                 // boolean
  "message": "Supplier deleted."   // string
}
```

---

### 7.6 Pay Supplier
**POST** `/v1/suppliers/{supplier}/pay`
> Admin only

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `amount` | `decimal` | Yes | min 0.01, max = current `total_due` |
| `payment_date` | `date` | Yes | `YYYY-MM-DD` |
| `purchase_id` | `integer` | No | links payment to a specific purchase |
| `notes` | `string` | No | |

**Success Response `200`:**
```json
{
  "success": true,                    // boolean
  "message": "Payment recorded.",     // string
  "data": {
    "supplier_id": 2,                 // integer [FK]
    "total_due": 20000.00             // decimal(2) — updated remaining due
  }
}
```

---

## 8. Sales

### 8.1 List Sales
**GET** `/v1/sales`
> Admin sees all; Salesman sees own only — Paginated: 20 per page

**Query Parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `from` | `date` | — | `YYYY-MM-DD` |
| `to` | `date` | — | `YYYY-MM-DD` |
| `payment_type` | `string` | — | `"cash"`, `"due"`, or `"partial"` |
| `search` | `string` | — | Searches customer name and phone |
| `has_due` | `boolean` | — | Send `1` or `true` to filter sales with outstanding due |
| `page` | `integer` | `1` | |

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "data": [
      {
        "id": 101,                           // integer
        "customer_id": 5,                    // integer | null [FK → customers.id] (null = walk-in)
        "salesman_id": 2,                    // integer [FK → users.id]
        "sale_date": "2026-06-05",           // date (YYYY-MM-DD)
        "total_amount": 5000.00,             // decimal(2)
        "paid_amount": 5000.00,              // decimal(2)
        "due_amount": 0.00,                  // decimal(2) [computed = total_amount - paid_amount]
        "payment_type": "cash",              // enum: "cash" | "due" | "partial"
        "notes": null,                       // string | null
        "deleted_at": null,                  // datetime | null (non-null means soft-deleted)
        "customer": {
          "id": 5,                           // integer
          "name": "John Doe",              // string
          "phone": "01711222333",           // string | null
          "address": "Dhaka"               // string | null
        },
        "salesman": {
          "id": 2,                           // integer
          "name": "Rahim",                 // string
          "avatar_initials": "R"           // string
        },
        "items": [
          {
            "id": 200,                       // integer
            "cylinder_id": 1,               // integer [FK → cylinders.id]
            "qty": 5,                        // integer
            "unit_price": 1000.00,           // decimal(2) — selling price per unit
            "unit_cost": 800.00,             // decimal(2) — FIFO cost per unit
            "profit": 200.00,                // decimal(2) — per unit profit (unit_price - unit_cost)
            "line_total": 5000.00,           // decimal(2) [computed = qty × unit_price]
            "cylinder": {
              "id": 1,                       // integer
              "name": "12.5 KG",           // string
              "short_code": "12K"          // string
            }
          }
        ]
      }
    ],
    "current_page": 1,         // integer
    "last_page": 10,           // integer
    "per_page": 20,            // integer (fixed)
    "total": 190               // integer
  }
}
```

---

### 8.2 Create Sale
**POST** `/v1/sales`
> All roles — Salesman can only sell to their own customers

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `customer_id` | `integer` | No | must exist; null = walk-in sale |
| `sale_date` | `date` | Yes | `YYYY-MM-DD` |
| `payment_type` | `string` | Yes | `"cash"`, `"due"`, or `"partial"` |
| `paid_amount` | `decimal` | No | min 0; required when `payment_type=partial` |
| `notes` | `string` | No | |
| `items` | `array` | Yes | min 1 item |
| `items[].cylinder_id` | `integer` | Yes | must exist and have stock |
| `items[].qty` | `integer` | Yes | min 1 |
| `items[].unit_price` | `decimal` | Yes | min 0 |

> **Business rule:** when `payment_type=cash`, `paid_amount` is set to `total_amount` automatically. When `payment_type=due`, `paid_amount` is 0.

**Success Response `201`:**
```json
{
  "success": true,                    // boolean
  "message": "Sale recorded.",        // string
  "data": {
    "id": 102,                        // integer
    "customer_id": 5,                 // integer | null [FK]
    "salesman_id": 2,                 // integer [FK]
    "sale_date": "2026-06-05",        // date (YYYY-MM-DD)
    "total_amount": 5000.00,          // decimal(2)
    "paid_amount": 5000.00,           // decimal(2)
    "due_amount": 0.00,               // decimal(2) [computed]
    "payment_type": "cash",           // enum: "cash" | "due" | "partial"
    "notes": null,                    // string | null
    "customer": { "...CustomerObject..." },
    "salesman": { "...UserObject..." },
    "items": [ { "...SaleItemObject..." } ]
  }
}
```

---

### 8.3 Get Single Sale
**GET** `/v1/sales/{sale}`
> Salesman: own sales only; Admin: all — `{sale}` is an `integer`

**Success Response `200`:** Same shape as list item, plus:
```json
{
  "...all fields from list...",
  "due_collections": [
    {
      "id": 80,                           // integer
      "amount": 2000.00,                  // decimal(2)
      "collection_date": "2026-06-06",    // date (YYYY-MM-DD)
      "collected_by": 1,                  // integer [FK → users.id]
      "notes": null,                      // string | null
      "reconciled_allocation_id": null    // integer | null [FK → stock_allocations.id]
    }
  ]
}
```

---

### 8.4 Collect Payment on Sale
**POST** `/v1/sales/{sale}/pay`
> All roles — `{sale}` is an `integer`

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `amount` | `decimal` | Yes | min 0.01, max = current `due_amount` |
| `collection_date` | `date` | Yes | `YYYY-MM-DD` |
| `notes` | `string` | No | |

**Success Response `200`:**
```json
{
  "success": true,                      // boolean
  "message": "Payment collected.",      // string
  "data": {
    "sale_id": 101,                     // integer
    "paid_amount": 5000.00,             // decimal(2) — updated cumulative paid
    "due_amount": 0.00                  // decimal(2) — updated remaining due
  }
}
```

---

### 8.5 Delete Sale
**DELETE** `/v1/sales/{sale}`
> Admin only — soft-deletes the sale; restores stock and allocation sold_qty

**Success Response `200`:**
```json
{
  "success": true,                                 // boolean
  "message": "Sale deleted and stock restored."    // string
}
```

---

## 9. Customers

### 9.1 List Customers
**GET** `/v1/customers`
> Admin sees all; Salesman sees own — Paginated: 15 per page
> If `search` param is provided: returns up to 20 results, no pagination wrapper

**Query Parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `search` | `string` | — | Searches `name` and `phone` |
| `page` | `integer` | `1` | Ignored when `search` is present |

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "data": [
      {
        "id": 5,                         // integer
        "name": "John Doe",             // string
        "phone": "01711222333",          // string | null
        "address": "Dhaka, BD",          // string | null
        "total_due": 5000.00,            // decimal(2) — current outstanding balance
        "is_active": true,               // boolean
        "added_by": 2,                   // integer [FK → users.id]
        "added_by_user": {
          "id": 2,                       // integer
          "name": "Rahim",             // string
          "avatar_initials": "R"       // string
        }
      }
    ],
    "current_page": 1,         // integer
    "last_page": 3,            // integer
    "per_page": 15,            // integer (fixed)
    "total": 42                // integer
  }
}
```

---

### 9.2 Create Customer
**POST** `/v1/customers`
> All roles — `added_by` is automatically set to the authenticated user

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | `string` | Yes | max 150 chars |
| `phone` | `string` | No | max 20 chars |
| `address` | `string` | No | free text |

**Success Response `201`:**
```json
{
  "success": true,                    // boolean
  "message": "Customer created.",     // string
  "data": {
    "id": 10,                         // integer
    "name": "Jane Smith",            // string
    "phone": "01833000000",           // string | null
    "address": null,                  // string | null
    "total_due": 0.00,                // decimal(2) — always 0.00 on creation
    "is_active": true,                // boolean — always true on creation
    "added_by": 1                     // integer [FK] — the authenticated user's ID
  }
}
```

---

### 9.3 Get Overdue Customers
**GET** `/v1/customers/overdue`
> All roles — Admin sees all, Salesman sees own; returns array (not paginated)

**Query Parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `days` | `integer` | `7` | Only include customers overdue by at least this many days |
| `sort` | `string` | `amount_desc` | `amount_desc`, `amount_asc`, `days_desc`, `days_asc` |

**Success Response `200`:**
```json
{
  "success": true,            // boolean
  "data": [
    {
      "id": 5,                          // integer
      "name": "John Doe",              // string
      "phone": "01711222333",           // string | null
      "total_due": 15000.00,            // decimal(2)
      "days_overdue": 12,               // integer — days since the oldest unpaid sale
      "last_sale_date": "2026-05-24"    // date (YYYY-MM-DD)
    }
  ]
}
```

---

### 9.4 Get Single Customer
**GET** `/v1/customers/{customer}`
> All roles — Salesman restricted to own customers — `{customer}` is an `integer`

**Success Response `200`:**
```json
{
  "success": true,                     // boolean
  "data": {
    "id": 5,                           // integer
    "name": "John Doe",               // string
    "phone": "01711222333",            // string | null
    "address": "Dhaka, BD",            // string | null
    "total_due": 5000.00,              // decimal(2)
    "is_active": true,                 // boolean
    "added_by_user": {
      "id": 2,                         // integer
      "name": "Rahim"                 // string
    },
    "total_revenue": 50000.00,         // decimal(2) [computed] — sum of all sale total_amounts
    "total_paid": 45000.00,            // decimal(2) [computed] — sum of all paid_amounts
    "sales": [ { "...SaleObject array, same shape as list..." } ],
    "due_collections": [ { "...DueCollectionObject array..." } ]
  }
}
```

---

### 9.5 Get Customer Empty Cylinders Owed
**GET** `/v1/customers/{customer}/empties`
> All roles — `{customer}` is an `integer`

**Success Response `200`:**
```json
{
  "success": true,            // boolean
  "data": [
    {
      "cylinder_id": 1,                   // integer [FK → cylinders.id]
      "cylinder": {
        "id": 1,                          // integer
        "name": "12.5 KG",              // string
        "short_code": "12K"             // string
      },
      "sold_qty": 50,                     // integer — total cylinders sold to this customer
      "returned_qty": 45,                 // integer — total empties returned by this customer
      "balance_owed": 5                   // integer [computed = sold_qty - returned_qty]
    }
  ]
}
```

---

### 9.6 Update Customer
**PUT** `/v1/customers/{customer}`
> Admin only

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | `string` | Yes | max 150 chars |
| `phone` | `string` | No | max 20 chars |
| `address` | `string` | No | |
| `is_active` | `boolean` | No | |

**Success Response `200`:**
```json
{
  "success": true,                  // boolean
  "message": "Customer updated.",   // string
  "data": { "...same shape as Create response data..." }
}
```

---

### 9.7 Delete Customer
**DELETE** `/v1/customers/{customer}`
> Admin only

**Success Response `200`:**
```json
{
  "success": true,                   // boolean
  "message": "Customer deleted."     // string
}
```

---

### 9.8 Manually Collect Customer Due
**POST** `/v1/customers/{customer}/collect`
> Admin only

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `amount` | `decimal` | Yes | min 0.01, max = current `total_due` |
| `sale_id` | `integer` | No | links collection to a specific sale |
| `collection_date` | `date` | Yes | `YYYY-MM-DD` |
| `notes` | `string` | No | |

**Success Response `200`:**
```json
{
  "success": true,                  // boolean
  "message": "Due collected.",      // string
  "data": {
    "customer_id": 5,               // integer [FK]
    "total_due": 0.00               // decimal(2) — updated remaining due
  }
}
```

---

## 10. Salesmen Management

### 10.1 List Salesmen
**GET** `/v1/salesmen`
> Admin only

**Query Parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `date` | `date` | today | `YYYY-MM-DD` — which date's allocations to aggregate |

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "salesmen": [
      {
        "id": 2,                           // integer
        "name": "Rahim",                  // string
        "email": "rahim@example.com",     // string
        "phone": "01711000001",           // string | null
        "avatar_initials": "R",           // string
        "is_active": true,                // boolean
        "alloc_stats": {
          "allocated": 50,               // integer — total qty allocated on that date
          "sold": 30,                    // integer — total sold_qty on that date
          "returned": 10,               // integer — total returned_qty on that date
          "with_salesman": 10,          // integer [computed = allocated - sold - returned]
          "collected": 30000.00         // decimal(2) — total collected_amount on that date
        }
      }
    ],
    "summary": {
      "active_count": 5,                 // integer — number of active salesmen
      "total_allocated": 200,            // integer — sum of all allocations on that date
      "total_collected": 150000.00       // decimal(2) — sum of all collections on that date
    }
  }
}
```

---

### 10.2 Get Single Salesman
**GET** `/v1/salesmen/{user}`
> Admin or self — `{user}` is an `integer` (user ID)

**Query Parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `date` | `date` | today | `YYYY-MM-DD` |

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "id": 2,                               // integer
    "name": "Rahim",                      // string
    "email": "rahim@example.com",         // string
    "phone": "01711000001",               // string | null
    "avatar_initials": "R",               // string
    "is_active": true,                    // boolean
    "today_summary": {
      "cash_collected": 30000.00,         // decimal(2) — cash sales + collected dues
      "sales_amount": 35000.00,           // decimal(2) — total_amount of all sales on date
      "due_amount": 5000.00,              // decimal(2) — sum of unpaid dues from date's sales
      "pending_collections": 8000.00     // decimal(2) — dues collected but not yet reconciled
    },
    "allocations": [
      {
        "id": 50,                          // integer
        "cylinder_id": 1,                  // integer [FK → cylinders.id]
        "cylinder": {
          "id": 1,                         // integer
          "name": "12.5 KG",             // string
          "short_code": "12K"            // string
        },
        "allocation_date": "2026-06-05",   // date (YYYY-MM-DD)
        "qty": 50,                         // integer — cylinders allocated
        "sale_price": 1000.00,             // decimal(2) — agreed selling price per unit
        "sold_qty": 30,                    // integer — confirmed sold (updated at EOD)
        "returned_qty": 10,               // integer — returned to warehouse
        "collected_amount": 30000.00,     // decimal(2) — cash collected for this allocation
        "is_reconciled": false,           // boolean — true after EOD submitted
        "with_salesman": 10,              // integer [computed = qty - sold_qty - returned_qty]
        "sold_pct": 60                    // integer [computed = sold_qty / qty × 100]
      }
    ],
    "cash_breakdown": [
      {
        "cylinder_id": 1,                  // integer [FK]
        "cylinder_name": "12.5 KG",       // string
        "sale_price": 1000.00,             // decimal(2)
        "sold_qty": 30,                    // integer
        "expected_cash": 30000.00          // decimal(2) [computed = sold_qty × sale_price]
      }
    ],
    "customer_dues": [
      {
        "customer_id": 5,                  // integer [FK → customers.id]
        "customer_name": "John Doe",       // string
        "due_amount": 5000.00,             // decimal(2)
        "sale_id": 101                     // integer [FK → sales.id]
      }
    ]
  }
}
```

---

### 10.3 Create Salesman
**POST** `/v1/salesmen`
> Admin only

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | `string` | Yes | max 150 chars |
| `email` | `string` | Yes | valid email, unique in users table |
| `password` | `string` | Yes | min 6 chars |
| `phone` | `string` | No | max 20 chars |

**Success Response `201`:**
```json
{
  "success": true,                    // boolean
  "message": "Salesman created.",     // string
  "data": {
    "id": 6,                          // integer
    "name": "Karim",                 // string
    "email": "karim@example.com",    // string
    "phone": "01822000000",           // string | null
    "role": "salesman",              // string (always "salesman")
    "avatar_initials": "K",          // string (auto-generated from name)
    "is_active": true                // boolean (always true on creation)
  }
}
```

---

### 10.4 Update Salesman
**PUT** `/v1/salesmen/{user}`
> Admin only — `{user}` is an `integer`

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | `string` | Yes | max 150 chars |
| `email` | `string` | Yes | valid email, unique excluding this user's own |
| `password` | `string` | No | min 6 chars; omit to keep current password |
| `phone` | `string` | No | max 20 chars |

**Success Response `200`:**
```json
{
  "success": true,                  // boolean
  "message": "Salesman updated.",   // string
  "data": { "...same shape as Create response data..." }
}
```

---

### 10.5 Toggle Salesman Active Status
**POST** `/v1/salesmen/{user}/toggle-active`
> Admin only — flips `is_active` between `true` and `false`

**Success Response `200`:**
```json
{
  "success": true,                                // boolean
  "message": "Salesman activated.",              // string (or "Salesman deactivated.")
  "data": {
    "id": 2,                                      // integer
    "is_active": true                             // boolean — the new state
  }
}
```

---

### 10.6 Get Salesman Report
**GET** `/v1/salesmen/{user}/report`
> Admin or self

**Query Parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `from` | `date` | start of month | `YYYY-MM-DD` |
| `to` | `date` | today | `YYYY-MM-DD` |

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "salesman": {
      "id": 2,                  // integer
      "name": "Rahim"          // string
    },
    "period": {
      "from": "2026-06-01",    // date (YYYY-MM-DD)
      "to": "2026-06-05"       // date (YYYY-MM-DD)
    },
    "summary": {
      "total_sales": 150000.00,    // decimal(2) — sum of total_amount in period
      "total_collected": 140000.00, // decimal(2) — sum of all cash collected
      "total_due": 10000.00,       // decimal(2) — outstanding at end of period
      "total_allocated": 200,       // integer — sum of qty allocated
      "total_sold": 180,            // integer — sum of sold_qty
      "total_returned": 15,         // integer — sum of returned_qty
      "sell_through_rate": 90       // integer [computed = total_sold / total_allocated × 100]
    },
    "daily_breakdown": [
      {
        "date": "2026-06-05",        // date (YYYY-MM-DD)
        "sales_amount": 35000.00,    // decimal(2)
        "collected": 30000.00,       // decimal(2)
        "allocated": 50,             // integer
        "sold": 30                   // integer
      }
    ]
  }
}
```

---

### 10.7 Get All Salesmen Report
**GET** `/v1/salesmen/report`
> Admin only

**Query Parameters:** Same as single salesman report (`from`, `to`)

**Success Response `200`:**
```json
{
  "success": true,            // boolean
  "data": [
    {
      "salesman": {
        "id": 2,              // integer
        "name": "Rahim"      // string
      },
      "summary": { "...same shape as 10.6 summary object..." }
    }
  ]
}
```

---

### 10.8 Get Salesman Cylinder Flow
**GET** `/v1/salesmen/{user}/cylinder-flow`
> Admin or self

**Query Parameters:** `from` (date), `to` (date)

**Success Response `200`:**
```json
{
  "success": true,            // boolean
  "data": [
    {
      "cylinder_id": 1,                // integer [FK → cylinders.id]
      "cylinder": {
        "id": 1,                       // integer
        "name": "12.5 KG",           // string
        "short_code": "12K"          // string
      },
      "allocated": 200,               // integer — total qty allocated in period
      "sold": 180,                    // integer — total sold in period
      "returned": 15,                 // integer — total returned in period
      "with_salesman": 5              // integer [computed = allocated - sold - returned]
    }
  ]
}
```

---

### 10.9 Get Salesman Daily Collections
**GET** `/v1/salesmen/{user}/daily-collections`
> Admin or self

**Query Parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `date` | `date` | today | `YYYY-MM-DD` |

**Success Response `200`:**
```json
{
  "success": true,            // boolean
  "data": [
    {
      "id": 80,                               // integer
      "customer_id": 5,                       // integer [FK → customers.id]
      "sale_id": 101,                         // integer | null [FK → sales.id]
      "amount": 5000.00,                      // decimal(2)
      "collection_date": "2026-06-05",        // date (YYYY-MM-DD)
      "notes": null,                          // string | null
      "reconciled_allocation_id": null,       // integer | null [FK → stock_allocations.id]
      "customer": {
        "id": 5,                              // integer
        "name": "John Doe"                   // string
      },
      "sale": {
        "id": 101,                            // integer
        "total_amount": 10000.00,             // decimal(2)
        "due_amount": 5000.00                 // decimal(2)
      }
    }
  ]
}
```

---

## 11. Allocations

### 11.1 Allocate Stock to Salesman
**POST** `/v1/salesmen/{user}/allocate`
> Admin only — `{user}` is an `integer`

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `cylinder_id` | `integer` | Yes | must exist |
| `qty` | `integer` | Yes | min 1, must not exceed warehouse `filled_qty` |
| `sale_price` | `decimal` | No | min 0 — the agreed price salesman sells at |
| `allocation_date` | `date` | No | `YYYY-MM-DD`, defaults to today |

**Success Response `201`:**
```json
{
  "success": true,                    // boolean
  "message": "Stock allocated.",      // string
  "data": {
    "id": 51,                         // integer
    "salesman_id": 2,                 // integer [FK → users.id]
    "cylinder_id": 1,                 // integer [FK → cylinders.id]
    "allocation_date": "2026-06-05",  // date (YYYY-MM-DD)
    "qty": 50,                        // integer — cylinders allocated
    "sale_price": 1000.00,            // decimal(2) | null
    "sold_qty": 0,                    // integer — always 0 on creation
    "returned_qty": 0,                // integer — always 0 on creation
    "collected_amount": 0.00,         // decimal(2) — always 0.00 on creation
    "is_reconciled": false,           // boolean — always false on creation
    "with_salesman": 50,              // integer [computed = qty - 0 - 0]
    "sold_pct": 0                     // integer [computed = 0]
  }
}
```

---

### 11.2 Update Allocation (Before Reconciliation)
**PUT** `/v1/allocations/{allocation}`
> Admin only — `{allocation}` is an `integer`; only works if `is_reconciled = false`

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `qty` | `integer` | Yes | min = current `sold_qty` (cannot reduce below already-sold) |
| `sale_price` | `decimal` | Yes | min 0 |

**Success Response `200`:**
```json
{
  "success": true,                      // boolean
  "message": "Allocation updated.",     // string
  "data": { "...same shape as 11.1 response data..." }
}
```

---

### 11.3 Update Reconciled Allocation
**PUT** `/v1/allocations/{allocation}/reconcile`
> Admin only — adjusts post-EOD values; only works if `is_reconciled = true`

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `sold_qty` | `integer` | Yes | min 0 |
| `collected_amount` | `decimal` | Yes | min 0 |

**Success Response `200`:**
```json
{
  "success": true,                          // boolean
  "message": "Reconciliation updated.",     // string
  "data": { "...same shape as 11.1 response data..." }
}
```

---

### 11.4 EOD Reconciliation (Salesman Submits)
**POST** `/v1/allocations/{allocation}/reconcile`
> All roles — salesman submits their own EOD; admin can submit for any
> **Irreversible.** Unsold cylinders auto-returned to warehouse.

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `sold_qty` | `integer` | Yes | min 0, max = allocation `qty` |
| `returned_qty` | `integer` | No | min 0; if omitted, auto = `qty - sold_qty` |
| `collected_amount` | `decimal` | Yes | min 0 |
| `notes` | `string` | No | |

**Success Response `200`:**
```json
{
  "success": true,                                              // boolean
  "message": "EOD reconciled. Unsold cylinders returned to warehouse.", // string
  "data": {
    "id": 50,                         // integer
    "is_reconciled": true,            // boolean — now true
    "sold_qty": 30,                   // integer
    "returned_qty": 20,               // integer (salesman's explicit return)
    "collected_amount": 30000.00,     // decimal(2)
    "auto_returned_qty": 20           // integer — cylinders auto-returned to warehouse
  }
}
```

---

## 12. Cylinder Returns

### 12.1 List Returns
**GET** `/v1/returns`
> Admin sees all; Salesman sees own — Paginated: 30 per page

**Query Parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `date` | `date` | — | `YYYY-MM-DD` — exact date filter |
| `from` | `date` | — | `YYYY-MM-DD` — start of range |
| `to` | `date` | — | `YYYY-MM-DD` — end of range |
| `salesman_id` | `integer` | — | Admin only |
| `cylinder_id` | `integer` | — | |
| `allocation_id` | `integer` | — | |
| `is_extra` | `boolean` | — | Send `1`/`true` to filter extra returns |
| `is_verified` | `boolean` | — | Send `1`/`true` to filter verified returns |
| `page` | `integer` | `1` | |

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "data": [
      {
        "id": 30,                            // integer
        "sale_id": 101,                      // integer | null [FK → sales.id]
        "customer_id": 5,                    // integer | null [FK → customers.id]
        "cylinder_id": 1,                    // integer [FK → cylinders.id]
        "salesman_id": 2,                    // integer | null [FK → users.id]
        "allocation_id": 50,                 // integer | null [FK → stock_allocations.id]
        "qty": 5,                            // integer
        "type": "empty_return",              // enum: "empty_return" | "error_correction"
        "return_date": "2026-06-05",         // date (YYYY-MM-DD)
        "notes": null,                       // string | null
        "is_extra": false,                   // boolean — true if return is anomalous
        "extra_reason": null,                // string | null
        "is_verified": false,               // boolean — true after admin verifies extra return
        "cylinder": {
          "id": 1,                           // integer
          "name": "12.5 KG",              // string
          "short_code": "12K"             // string
        },
        "customer": {
          "id": 5,                           // integer
          "name": "John Doe"              // string
        },
        "salesman": {
          "id": 2,                           // integer
          "name": "Rahim"                 // string
        }
      }
    ],
    "current_page": 1,         // integer
    "last_page": 2,            // integer
    "per_page": 30,            // integer (fixed)
    "total": 45                // integer
  }
}
```

**Return type enum values:**
| Value | Meaning |
|-------|---------|
| `empty_return` | Customer/salesman returning an empty cylinder (normal) |
| `error_correction` | Correcting a previously incorrect stock entry |

---

### 12.2 Record Return
**POST** `/v1/returns`
> All roles

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `cylinder_id` | `integer` | Yes | must exist |
| `qty` | `integer` | Yes | min 1 |
| `type` | `string` | Yes | `"empty_return"` or `"error_correction"` |
| `return_date` | `date` | Yes | `YYYY-MM-DD` |
| `customer_id` | `integer` | No | links to customer |
| `sale_id` | `integer` | No | links to originating sale |
| `notes` | `string` | No | |
| `is_extra` | `boolean` | No | flag if this return is anomalous |
| `extra_reason` | `string` | No | required if `is_extra = true` |

**Success Response `201`:**
```json
{
  "success": true,                   // boolean
  "message": "Return recorded.",     // string
  "data": {
    "id": 31,                        // integer
    "cylinder_id": 1,                // integer [FK]
    "qty": 5,                        // integer
    "type": "empty_return",          // enum: "empty_return" | "error_correction"
    "return_date": "2026-06-05",     // date (YYYY-MM-DD)
    "is_extra": false,               // boolean
    "is_verified": false             // boolean — always false on creation
  }
}
```

---

### 12.3 Verify Extra Return
**POST** `/v1/returns/{return}/verify`
> Admin only — `{return}` is an `integer`

**Success Response `200`:**
```json
{
  "success": true,                    // boolean
  "message": "Return verified.",      // string
  "data": {
    "id": 31,                         // integer
    "is_verified": true               // boolean — now true
  }
}
```

---

### 12.4 Reject Extra Return
**POST** `/v1/returns/{return}/reject`
> Admin only — reverses any stock changes this return caused

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| `reason` | `string` | No |

**Success Response `200`:**
```json
{
  "success": true,                                    // boolean
  "message": "Return rejected and stock reversed."    // string
}
```

---

## 13. Expenses & Budgets

### 13.1 List Expenses
**GET** `/v1/expenses`
> Admin only — Paginated: 15 per page

**Query Parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `month` | `integer` | current | 1–12 |
| `year` | `integer` | current | e.g. `2026` |
| `page` | `integer` | `1` | |

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "data": [
      {
        "id": 15,                                    // integer
        "category": "transport",                     // enum: "transport" | "salary" | "rent" | "utility" | "other"
        "amount": 5000.00,                           // decimal(2)
        "expense_date": "2026-06-03",                // date (YYYY-MM-DD)
        "description": "Delivery fuel",              // string | null
        "recorded_by": 1,                            // integer [FK → users.id]
        "recorded_by_user": {
          "id": 1,                                   // integer
          "name": "Admin"                           // string
        }
      }
    ],
    "current_page": 1,         // integer
    "last_page": 2,            // integer
    "per_page": 15,            // integer (fixed)
    "total": 22                // integer
  }
}
```

---

### 13.2 Create Expense
**POST** `/v1/expenses`
> Admin only

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `category` | `string` | Yes | `"transport"`, `"salary"`, `"rent"`, `"utility"`, or `"other"` |
| `amount` | `decimal` | Yes | min 0.01 |
| `expense_date` | `date` | Yes | `YYYY-MM-DD` |
| `description` | `string` | No | free text |

**Success Response `201`:**
```json
{
  "success": true,                     // boolean
  "message": "Expense recorded.",      // string
  "data": {
    "id": 16,                          // integer
    "category": "transport",           // enum
    "amount": 5000.00,                 // decimal(2)
    "expense_date": "2026-06-05",      // date (YYYY-MM-DD)
    "description": "Fuel cost",        // string | null
    "recorded_by": 1                   // integer [FK]
  }
}
```

---

### 13.3 Get Single Expense
**GET** `/v1/expenses/{expense}`
> Admin only — `{expense}` is an `integer`

**Success Response `200`:** Same shape as a single item from list (including `recorded_by_user` object).

---

### 13.4 Update Expense
**PUT** `/v1/expenses/{expense}`
> Admin only — same request body as Create

**Success Response `200`:**
```json
{
  "success": true,                  // boolean
  "message": "Expense updated.",    // string
  "data": { "...same shape as Create response data..." }
}
```

---

### 13.5 Delete Expense
**DELETE** `/v1/expenses/{expense}`
> Admin only

**Success Response `200`:**
```json
{
  "success": true,                 // boolean
  "message": "Expense deleted."    // string
}
```

---

### 13.6 Get Expense Budget Summary
**GET** `/v1/expenses/summary`
> Admin only — returns one entry per expense category

**Query Parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `month` | `integer` | current | 1–12 |
| `year` | `integer` | current | e.g. `2026` |

**Success Response `200`:**
```json
{
  "success": true,            // boolean
  "data": [
    {
      "category": "transport",           // enum: "transport" | "salary" | "rent" | "utility" | "other"
      "monthly_budget": 20000.00,        // decimal(2) | null (null if no budget set)
      "alert_threshold": 80,             // integer (percentage, default 80%)
      "actual_spent": 15000.00,          // decimal(2) — sum of expenses in this category for the month
      "remaining": 5000.00,              // decimal(2) [computed = monthly_budget - actual_spent]
      "percent_used": 75.00,             // decimal(2) [computed = actual_spent / monthly_budget × 100]
      "is_over_budget": false,           // boolean — true when percent_used > 100
      "is_near_limit": false             // boolean — true when percent_used >= alert_threshold
    }
  ]
}
```

---

### 13.7 Create / Update Budget
**POST** `/v1/expenses/budget`
> Admin only — upserts (creates or updates) budget for a category

**Request Body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `category` | `string` | Yes | one of the 5 category enum values |
| `monthly_budget` | `decimal` | Yes | min 0 |
| `alert_threshold` | `integer` | No | 1–100, default 80 |

**Success Response `200`:**
```json
{
  "success": true,                  // boolean
  "message": "Budget saved.",       // string
  "data": {
    "id": 3,                        // integer
    "category": "transport",        // enum
    "monthly_budget": 25000.00,     // decimal(2)
    "alert_threshold": 80           // integer
  }
}
```

---

### 13.8 Update Budget
**PUT** `/v1/expenses/budget/{budget}`
> Admin only — `{budget}` is an `integer` (budget record ID)
> Same request body and response as 13.7.

---

## 14. Reports

### 14.1 Profit & Loss Report
**GET** `/v1/reports/pnl`
> Admin only

**Query Parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `from` | `date` | start of month | `YYYY-MM-DD` |
| `to` | `date` | today | `YYYY-MM-DD` |

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "period": {
      "from": "2026-06-01",     // date (YYYY-MM-DD)
      "to": "2026-06-05"        // date (YYYY-MM-DD)
    },
    "revenue": {
      "total_sales": 500000.00,    // decimal(2) — sum of all sale total_amounts
      "cash_sales": 400000.00,     // decimal(2) — sales where payment_type = "cash"
      "due_collected": 80000.00,   // decimal(2) — due collections received in period
      "total_collected": 480000.00 // decimal(2) [= cash_sales + due_collected]
    },
    "cogs": {
      "total_cost": 400000.00      // decimal(2) — sum of unit_cost × qty from SaleItems
    },
    "gross_profit": 100000.00,     // decimal(2) [= total_sales - cogs.total_cost]
    "gross_margin_pct": 20.00,     // decimal(2) [= gross_profit / total_sales × 100]
    "expenses": {
      "transport": 15000.00,       // decimal(2)
      "salary": 100000.00,         // decimal(2)
      "rent": 20000.00,            // decimal(2)
      "utility": 5000.00,          // decimal(2)
      "other": 2000.00,            // decimal(2)
      "total": 142000.00           // decimal(2) — sum of all categories
    },
    "net_profit": -42000.00,       // decimal(2) [= gross_profit - expenses.total] (negative = loss)
    "net_margin_pct": -8.40        // decimal(2) [= net_profit / total_sales × 100]
  }
}
```

---

### 14.2 Cash Flow Report
**GET** `/v1/reports/cashflow`
> Admin only

**Query Parameters:** `from` (date), `to` (date)

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "period": {
      "from": "2026-06-01",     // date (YYYY-MM-DD)
      "to": "2026-06-05"        // date (YYYY-MM-DD)
    },
    "inflow": {
      "cash_sales": 400000.00,     // decimal(2)
      "due_collected": 80000.00,   // decimal(2)
      "total_inflow": 480000.00    // decimal(2) [= cash_sales + due_collected]
    },
    "outflow": {
      "supplier_payments": 200000.00, // decimal(2) — payments made to suppliers
      "expenses": 142000.00,          // decimal(2) — total expenses recorded
      "total_outflow": 342000.00      // decimal(2)
    },
    "net_cashflow": 138000.00,       // decimal(2) [= total_inflow - total_outflow]
    "daily_breakdown": [
      {
        "date": "2026-06-05",         // date (YYYY-MM-DD)
        "inflow": 50000.00,           // decimal(2)
        "outflow": 30000.00,          // decimal(2)
        "net": 20000.00               // decimal(2) [= inflow - outflow]
      }
    ]
  }
}
```

---

### 14.3 Purchase Report
**GET** `/v1/reports/purchases`
> Admin only

**Query Parameters:** `from` (date), `to` (date)

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "period": {
      "from": "2026-06-01",     // date (YYYY-MM-DD)
      "to": "2026-06-05"        // date (YYYY-MM-DD)
    },
    "by_supplier": [
      {
        "supplier_id": 2,              // integer [FK → suppliers.id]
        "supplier_name": "Jamuna Gas", // string
        "total_amount": 300000.00,     // decimal(2) — total purchase value
        "total_qty": 375,              // integer — total cylinders purchased
        "paid_amount": 200000.00,      // decimal(2)
        "due_amount": 100000.00        // decimal(2)
      }
    ],
    "by_cylinder": [
      {
        "cylinder_id": 1,              // integer [FK → cylinders.id]
        "cylinder_name": "12.5 KG",   // string
        "total_qty": 300,              // integer
        "total_amount": 240000.00,     // decimal(2)
        "avg_unit_cost": 800.00,       // decimal(2) — average cost across all lots
        "min_unit_cost": 750.00,       // decimal(2) — cheapest lot purchased
        "max_unit_cost": 850.00        // decimal(2) — most expensive lot purchased
      }
    ]
  }
}
```

---

### 14.4 Cylinder Flow Report
**GET** `/v1/reports/cylinder-flow`
> Admin only

**Query Parameters:** `from` (date), `to` (date)

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "period": {
      "from": "2026-06-01",     // date (YYYY-MM-DD)
      "to": "2026-06-05"        // date (YYYY-MM-DD)
    },
    "by_salesman": [
      {
        "salesman_id": 2,              // integer [FK → users.id]
        "salesman_name": "Rahim",      // string
        "cylinders": [
          {
            "cylinder_id": 1,          // integer [FK → cylinders.id]
            "cylinder_name": "12.5 KG", // string
            "allocated": 200,          // integer — total qty allocated in period
            "sold": 180,               // integer — total sold_qty in period
            "returned": 15,            // integer — total returned_qty in period
            "with_salesman": 5,        // integer [computed = allocated - sold - returned]
            "empties_collected": 160   // integer — total empty returns from this salesman
          }
        ]
      }
    ],
    "totals": {
      "allocated": 500,                // integer — grand total allocated
      "sold": 450,                     // integer — grand total sold
      "returned": 40,                  // integer — grand total returned
      "with_salesman": 10,             // integer — grand total still out
      "empties_collected": 400         // integer — grand total empties collected
    }
  }
}
```

---

## 15. Notifications

### 15.1 List Notifications
**GET** `/v1/notifications`
> All roles — shows only the authenticated user's notifications — Paginated: 20 per page

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "data": [
      {
        "id": 200,                                                   // integer
        "type": "low_stock",                                         // enum — see type values below
        "title": "Low Stock Alert",                                  // string
        "body": "12.5 KG cylinder is below reorder level (15 remaining).", // string
        "reference_id": 1,                                           // integer | null (ID of related resource)
        "is_read": false,                                            // boolean
        "created_at": "2026-06-05T09:00:00Z"                        // datetime (ISO 8601, UTC)
      }
    ],
    "current_page": 1,         // integer
    "last_page": 1,            // integer
    "per_page": 20,            // integer (fixed)
    "total": 3                 // integer
  }
}
```

**Notification `type` enum values and their `reference_id` targets:**
| Type | Meaning | `reference_id` points to |
|------|---------|--------------------------|
| `low_stock` | Cylinder filled_qty below reorder_level | `cylinders.id` |
| `large_sale` | Sale total exceeded configured threshold | `sales.id` |
| `supplier_due` | Supplier has outstanding due | `suppliers.id` |
| `supplier_payment` | Payment made to supplier | `suppliers.id` |

---

### 15.2 Mark Notification as Read
**POST** `/v1/notifications/{id}/read`
> All roles — `{id}` is an `integer`

**Success Response `200`:**
```json
{
  "success": true,                                // boolean
  "message": "Notification marked as read."       // string
}
```

---

### 15.3 Mark All Notifications as Read
**POST** `/v1/notifications/read-all`
> All roles

**Success Response `200`:**
```json
{
  "success": true,                                    // boolean
  "message": "All notifications marked as read."      // string
}
```

---

## 16. Audit Logs

### 16.1 List Audit Logs
**GET** `/v1/audit-logs`
> Admin only — Paginated: 30 per page

**Query Parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `model` | `string` | — | Filter by model class name, e.g. `Sale`, `Purchase`, `Customer` |
| `model_id` | `integer` | — | Filter by specific record ID (use with `model`) |
| `user_id` | `integer` | — | Filter by user who performed the action |
| `action` | `string` | — | Filter by action type |
| `page` | `integer` | `1` | |

**Success Response `200`:**
```json
{
  "success": true,              // boolean
  "data": {
    "data": [
      {
        "id": 500,                                       // integer
        "user_id": 1,                                    // integer [FK → users.id]
        "action": "create",                              // enum — see action values below
        "model": "Sale",                                 // string (Laravel model class name)
        "model_id": 102,                                 // integer (ID of the affected record)
        "old_value": null,                               // object | null (state before change)
        "new_value": { "total_amount": 5000.00, "payment_type": "cash" }, // object | null
        "ip_address": "192.168.1.1",                    // string
        "description": "Admin created sale #102",        // string (human-readable summary)
        "created_at": "2026-06-05T10:30:00Z",           // datetime (ISO 8601, UTC)
        "user": {
          "id": 1,                                       // integer
          "name": "Admin User"                          // string
        }
      }
    ],
    "current_page": 1,         // integer
    "last_page": 5,            // integer
    "per_page": 30,            // integer (fixed)
    "total": 140               // integer
  }
}
```

**Action enum values:**
| Value | Meaning |
|-------|---------|
| `create` | New record created |
| `update` | Existing record modified |
| `delete` | Record deleted |
| `pay` | Payment recorded |
| `allocate` | Stock allocated to salesman |
| `reconcile` | EOD reconciliation submitted |
| `verify` | Extra return verified |
| `reject` | Extra return rejected |

---

## 17. Data Types Reference

This section is the canonical field-type reference for every object returned by the API.
All monetary fields use `decimal(2)` — always 2 decimal places, parse as float/double in mobile code.

### User Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `name` | `string` | No | Full name |
| `email` | `string` | No | Unique login email |
| `phone` | `string` | Yes | Max 20 chars |
| `role` | `enum` | No | `"admin"` or `"salesman"` |
| `avatar_initials` | `string` | No | 1–2 uppercase letters auto-generated from name |
| `is_active` | `boolean` | No | `false` = account disabled |

---

### Cylinder Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `name` | `string` | No | Display name e.g. `"12.5 KG"` |
| `size` | `string` | No | Size label e.g. `"12.5"` |
| `short_code` | `string` | No | Max 5 chars, used as compact label |
| `color1` | `string` | Yes | Hex color e.g. `"#ff0000"` |
| `color2` | `string` | Yes | Hex color (secondary) |
| `brands` | `string` | Yes | Free text, comma-separated brand names |
| `status` | `enum` | No | `"active"` or `"inactive"` |
| `reorder_level` | `integer` | Yes | Alert when `filled_qty` drops below this |
| `capacity` | `integer` | Yes | Max units this type can hold |

---

### CylinderStock Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `cylinder_id` | `integer` | No | FK → cylinders.id |
| `filled_qty` | `integer` | No | Warehouse-level filled cylinders |
| `empty_qty` | `integer` | No | Warehouse-level empties |
| `capacity` | `integer` | Yes | Mirrors cylinder.capacity |

---

### Sale Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `customer_id` | `integer` | Yes | FK → customers.id; null = walk-in |
| `salesman_id` | `integer` | No | FK → users.id |
| `sale_date` | `date` | No | `YYYY-MM-DD` |
| `total_amount` | `decimal(2)` | No | Sum of all line totals |
| `paid_amount` | `decimal(2)` | No | Amount actually paid |
| `due_amount` | `decimal(2)` | No | `[computed]` = total_amount - paid_amount |
| `payment_type` | `enum` | No | `"cash"`, `"due"`, or `"partial"` |
| `notes` | `string` | Yes | |
| `deleted_at` | `datetime` | Yes | Non-null means soft-deleted |

---

### SaleItem Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `sale_id` | `integer` | No | FK → sales.id |
| `cylinder_id` | `integer` | No | FK → cylinders.id |
| `purchase_item_id` | `integer` | No | FK → purchase_items.id (FIFO lot consumed) |
| `qty` | `integer` | No | Number of cylinders in this line |
| `unit_price` | `decimal(2)` | No | Selling price per unit |
| `unit_cost` | `decimal(2)` | No | FIFO cost per unit |
| `profit` | `decimal(2)` | No | Per-unit profit = unit_price - unit_cost |
| `line_total` | `decimal(2)` | No | `[computed]` = qty × unit_price |

---

### Customer Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `name` | `string` | No | Max 150 chars |
| `phone` | `string` | Yes | Max 20 chars |
| `address` | `string` | Yes | Free text |
| `total_due` | `decimal(2)` | No | Current outstanding balance (denormalized) |
| `is_active` | `boolean` | No | |
| `added_by` | `integer` | No | FK → users.id |

---

### StockAllocation Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `salesman_id` | `integer` | No | FK → users.id |
| `cylinder_id` | `integer` | No | FK → cylinders.id |
| `allocation_date` | `date` | No | `YYYY-MM-DD` |
| `qty` | `integer` | No | Cylinders allocated |
| `sale_price` | `decimal(2)` | Yes | Agreed price per unit |
| `sold_qty` | `integer` | No | Confirmed sold (updated at EOD) |
| `returned_qty` | `integer` | No | Returned to warehouse |
| `collected_amount` | `decimal(2)` | No | Cash collected for this allocation |
| `is_reconciled` | `boolean` | No | `true` after EOD submitted |
| `with_salesman` | `integer` | No | `[computed]` = qty - sold_qty - returned_qty |
| `sold_pct` | `integer` | No | `[computed]` = sold_qty / qty × 100 |
| `notes` | `string` | Yes | |

---

### Purchase Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `supplier_id` | `integer` | No | FK → suppliers.id |
| `recorded_by` | `integer` | No | FK → users.id |
| `purchase_date` | `date` | No | `YYYY-MM-DD` |
| `total_amount` | `decimal(2)` | No | Sum of item line totals |
| `paid_amount` | `decimal(2)` | No | |
| `due_amount` | `decimal(2)` | No | |
| `notes` | `string` | Yes | |
| `total_qty` | `integer` | No | `[computed]` sum of all item qty |
| `total_remaining_qty` | `integer` | No | `[computed]` sum of all item remaining_qty |

---

### PurchaseItem Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `purchase_id` | `integer` | No | FK → purchases.id |
| `cylinder_id` | `integer` | No | FK → cylinders.id |
| `qty` | `integer` | No | Original qty in this lot |
| `remaining_qty` | `integer` | No | Unconsumed qty (starts = qty, decreases as sold) |
| `unit_cost` | `decimal(2)` | No | Cost per unit for this lot |
| `status` | `enum` | No | `"pending"`, `"active"`, or `"done"` |
| `line_total` | `decimal(2)` | No | `[computed]` = qty × unit_cost |

---

### Supplier Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `name` | `string` | No | Max 150 chars |
| `type` | `enum` | Yes | `"dealer"` or `"self"` |
| `phone` | `string` | Yes | Max 20 chars |
| `address` | `string` | Yes | Free text |
| `total_due` | `decimal(2)` | No | Outstanding amount owed to supplier |
| `is_active` | `boolean` | No | |

---

### Expense Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `recorded_by` | `integer` | No | FK → users.id |
| `category` | `enum` | No | `"transport"`, `"salary"`, `"rent"`, `"utility"`, `"other"` |
| `amount` | `decimal(2)` | No | |
| `expense_date` | `date` | No | `YYYY-MM-DD` |
| `description` | `string` | Yes | Free text |

---

### ExpenseBudget Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `category` | `enum` | No | Same 5 values as Expense.category |
| `monthly_budget` | `decimal(2)` | No | Budget cap for the month |
| `alert_threshold` | `integer` | No | Percentage (1–100) at which to warn |

---

### CylinderReturn Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `sale_id` | `integer` | Yes | FK → sales.id |
| `customer_id` | `integer` | Yes | FK → customers.id |
| `cylinder_id` | `integer` | No | FK → cylinders.id |
| `recorded_by` | `integer` | No | FK → users.id |
| `salesman_id` | `integer` | Yes | FK → users.id |
| `allocation_id` | `integer` | Yes | FK → stock_allocations.id |
| `qty` | `integer` | No | Number of cylinders returned |
| `type` | `enum` | No | `"empty_return"` or `"error_correction"` |
| `return_date` | `date` | No | `YYYY-MM-DD` |
| `notes` | `string` | Yes | |
| `is_extra` | `boolean` | No | `true` if flagged as anomalous |
| `extra_reason` | `string` | Yes | Explanation when `is_extra = true` |
| `is_verified` | `boolean` | No | `true` after admin verifies |

---

### DueCollection Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `customer_id` | `integer` | No | FK → customers.id |
| `sale_id` | `integer` | Yes | FK → sales.id |
| `collected_by` | `integer` | No | FK → users.id |
| `amount` | `decimal(2)` | No | Amount collected |
| `collection_date` | `date` | No | `YYYY-MM-DD` |
| `notes` | `string` | Yes | |
| `reconciled_allocation_id` | `integer` | Yes | FK → stock_allocations.id; null = pending EOD |

---

### DuePayment Object (Supplier Payment)
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `supplier_id` | `integer` | No | FK → suppliers.id |
| `purchase_id` | `integer` | Yes | FK → purchases.id (which invoice this pays) |
| `recorded_by` | `integer` | No | FK → users.id |
| `amount` | `decimal(2)` | No | |
| `payment_date` | `date` | No | `YYYY-MM-DD` |
| `notes` | `string` | Yes | |

---

### RefillOrder Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `cylinder_id` | `integer` | No | FK → cylinders.id |
| `supplier_id` | `integer` | No | FK → suppliers.id |
| `recorded_by` | `integer` | No | FK → users.id |
| `qty_sent` | `integer` | No | Empties sent for refill |
| `qty_received` | `integer` | No | Filled ones received back (cumulative) |
| `sent_date` | `date` | No | `YYYY-MM-DD` |
| `received_date` | `date` | Yes | Null until first receive |
| `status` | `enum` | No | `"pending"`, `"partially_received"`, `"received"` |
| `refill_cost` | `decimal(2)` | Yes | Optional refill fee |
| `notes` | `string` | Yes | |

---

### AppNotification Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `type` | `enum` | No | `"low_stock"`, `"large_sale"`, `"supplier_due"`, `"supplier_payment"` |
| `title` | `string` | No | Short title |
| `body` | `string` | No | Full message |
| `reference_id` | `integer` | Yes | ID of related resource (see §15 for mapping) |
| `is_read` | `boolean` | No | `false` = unread |
| `created_at` | `datetime` | No | ISO 8601 UTC |

---

### AuditLog Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `user_id` | `integer` | No | FK → users.id (who did it) |
| `action` | `enum` | No | `"create"`, `"update"`, `"delete"`, `"pay"`, `"allocate"`, `"reconcile"`, `"verify"`, `"reject"` |
| `model` | `string` | No | Laravel model class name e.g. `"Sale"` |
| `model_id` | `integer` | No | ID of the affected record |
| `old_value` | `object` | Yes | State before the change (JSON object) |
| `new_value` | `object` | Yes | State after the change (JSON object) |
| `ip_address` | `string` | No | Client IP |
| `description` | `string` | No | Human-readable summary |
| `created_at` | `datetime` | No | ISO 8601 UTC |

---

### StockMovement Object
| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `integer` | No | Primary key |
| `cylinder_id` | `integer` | No | FK → cylinders.id |
| `event_type` | `enum` | No | See §4.2 event type table |
| `change_qty` | `integer` | No | Positive = stock added, negative = removed |
| `balance_after` | `integer` | No | `filled_qty` in warehouse after this event |
| `reference_id` | `integer` | Yes | ID of related record (purchase, sale, etc.) |
| `notes` | `string` | Yes | |
| `created_at` | `datetime` | No | ISO 8601 UTC (no updated_at on this table) |

---

## 18. Common Error Responses

All error responses follow this envelope:

```json
{
  "success": false,      // boolean — always false for errors
  "message": "..."       // string — human-readable error description
}
```

| HTTP Status | When it occurs |
|-------------|----------------|
| `401` | No token, expired token, or invalid token |
| `403` | Valid token but insufficient role (e.g. salesman accessing admin route) |
| `404` | Record with given ID does not exist |
| `422` | Request body failed validation |
| `500` | Unexpected server error |

### 422 Validation Error (additional `errors` field)
```json
{
  "success": false,                          // boolean
  "message": "The given data was invalid.",  // string
  "errors": {
    "field_name": [                          // object — keys are field names
      "The field_name is required."          // array of string error messages
    ],
    "items.0.qty": [
      "The items.0.qty must be at least 1."  // nested field errors use dot-notation
    ]
  }
}
```
