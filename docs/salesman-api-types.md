# Salesman API — Data Type Reference

> All endpoints require `Authorization: Bearer <token>` header.
> Base URL: `/api/v1`

---

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/salesmen` | Admin | List all salesmen with alloc stats |
| POST | `/salesmen` | Admin | Create salesman |
| PUT | `/salesmen/{id}` | Admin | Update salesman |
| POST | `/salesmen/{id}/toggle-active` | Admin | Toggle active status |
| POST | `/salesmen/{id}/allocate` | Admin | Allocate stock |
| GET | `/salesmen/{id}` | Self/Admin | Salesman dashboard data |
| GET | `/salesmen/{id}/report` | Self/Admin | Performance report |
| GET | `/salesmen/{id}/cylinder-flow` | Self/Admin | Cylinder flow metrics |
| GET | `/salesmen/{id}/daily-collections` | Self/Admin | Due collections for a date |
| PUT | `/allocations/{id}` | Admin | Edit allocation (pre-reconcile) |
| POST | `/allocations/{id}/reconcile` | Self/Admin | Submit EOD reconciliation |
| PUT | `/allocations/{id}/reconcile` | Admin | Edit reconciliation (post-reconcile) |

---

## 1. `GET /salesmen` *(Admin only)*

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `date` | `string` (Y-m-d) | today | Filter allocations for this date |
| `active` | `boolean` | — | If `1`, only active salesmen |

### Response

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id":              1,
      "name":            "John Doe",
      "email":           "john@example.com",
      "phone":           "01711000000",
      "avatar_initials": "JD",
      "role":            "salesman",
      "is_active":       true,
      "created_at":      "2026-06-01T10:00:00.000000Z",
      "updated_at":      "2026-06-01T10:00:00.000000Z",
      "allocations": [ ],
      "alloc_stats": {
        "total_allocated":  50,
        "total_sold":       40,
        "total_returned":   8,
        "with_salesman":    2,
        "collected_amount": 8000.00
      }
    }
  ],
  "summary": {
    "active_count":    3,
    "total_allocated": 150,
    "total_collected": 24000.00
  }
}
```

### Field Types

| Field | Type | Notes |
|-------|------|-------|
| `id` | `int` | |
| `name` | `string` | |
| `email` | `string` | |
| `phone` | `string \| null` | |
| `avatar_initials` | `string \| null` | Max 2 chars |
| `role` | `"salesman"` | Always `"salesman"` here |
| `is_active` | `boolean` | NOT `0`/`1` |
| `created_at` | `string` (ISO 8601) | |
| `updated_at` | `string` (ISO 8601) | |
| `alloc_stats.total_allocated` | `int` | |
| `alloc_stats.total_sold` | `int` | |
| `alloc_stats.total_returned` | `int` | |
| `alloc_stats.with_salesman` | `int` | allocated - sold - returned |
| `alloc_stats.collected_amount` | `float` | Already parsed (not a decimal string) |
| `summary.active_count` | `int` | |
| `summary.total_allocated` | `int` | |
| `summary.total_collected` | `float` | |

---

## 2. `GET /salesmen/{id}` *(Self or Admin)*

### Response

```json
{
  "success": true,
  "data": {
    "salesman": {
      "id":              1,
      "name":            "John Doe",
      "email":           "john@example.com",
      "phone":           "01711000000",
      "avatar_initials": "JD",
      "role":            "salesman",
      "is_active":       true,
      "allocations": [ ]
    },
    "today_sales": [ ],
    "stats": {
      "total_allocated":          50,
      "total_sold":               40,
      "total_returned":           8,
      "total_remaining":          2,
      "cash_collected":           7500.00,
      "today_total_sales_amount": 8000.00,
      "today_paid_total":         7500.00,
      "today_due_amount":         500.00,
      "pending_due_collections":  200.00,
      "total_cash_to_hand_in":    7700.00,
      "total_outstanding_dues":   1200.00,
      "today_profit":             960.00
    },
    "pending_collections": [ ]
  }
}
```

### `stats` Field Types

| Field | Type | Description |
|-------|------|-------------|
| `total_allocated` | `int` | Sum of qty across active allocations |
| `total_sold` | `int` | Sum of sold_qty |
| `total_returned` | `int` | Sum of returned_qty |
| `total_remaining` | `int` | with_salesman (appended) |
| `cash_collected` | `float` | Sale-time cash only (excludes due collections) |
| `today_total_sales_amount` | `float` | Sum of total_amount for today's sales |
| `today_paid_total` | `float` | Sum of paid_amount for today's sales |
| `today_due_amount` | `float` | today_total_sales_amount - today_paid_total |
| `pending_due_collections` | `float` | Due collections not yet reconciled |
| `total_cash_to_hand_in` | `float` | cash_collected + pending_due_collections |
| `total_outstanding_dues` | `float` | All-time unpaid dues for this salesman |
| `today_profit` | `float` | Rounded to 2 decimal places |

### `allocations` Array Item (inside `salesman`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `int` | |
| `salesman_id` | `int` | |
| `cylinder_id` | `int` | |
| `allocation_date` | `string` (Y-m-d) | No time component |
| `qty` | `int` | |
| `sale_price` | `string` (decimal) | e.g. `"150.00"` — **cast to float before math** |
| `sold_qty` | `int` | |
| `returned_qty` | `int` | |
| `collected_amount` | `string` (decimal) | e.g. `"7500.00"` — **cast to float before math** |
| `is_reconciled` | `boolean` | NOT `0`/`1` |
| `notes` | `string \| null` | |
| `with_salesman` | `int` | Appended: qty - sold_qty - returned_qty |
| `sold_pct` | `int` | Appended: 0–100 |
| `cash_collected_actual` | `float` | Server-computed, already parsed |
| `due_from_sales` | `float` | Server-computed, already parsed |
| `customer_dues` | `array` | See below |
| `cylinder` | `object` | Loaded relation |

**`customer_dues` item:**

```json
{ "customer": "Ahmed Ali", "due_amount": 250.00 }
```

---

## 3. `POST /salesmen` *(Admin only)*

### Request Body

| Field | Type | Required | Constraint |
|-------|------|----------|-----------|
| `name` | `string` | yes | max 150 chars |
| `email` | `string` | yes | valid email, unique |
| `password` | `string` | yes | min 6 chars |
| `phone` | `string` | no | max 20 chars |

### Response

```json
{ "success": true, "data": { ...User }, "message": "Salesman created." }
```

---

## 4. `PUT /salesmen/{id}` *(Admin only)*

### Request Body

| Field | Type | Required | Constraint |
|-------|------|----------|-----------|
| `name` | `string` | yes | max 150 |
| `email` | `string` | yes | unique (excluding self) |
| `password` | `string` | no | nullable, min 6 chars |
| `phone` | `string` | no | nullable, max 20 |

---

## 5. `POST /salesmen/{id}/toggle-active` *(Admin only)*

### Response

```json
{
  "success": true,
  "data": { "id": 1, "is_active": false },
  "message": "Salesman deactivated."
}
```

| Field | Type |
|-------|------|
| `id` | `int` |
| `is_active` | `boolean` |

---

## 6. `POST /salesmen/{id}/allocate` *(Admin only)*

### Request Body

| Field | Type | Required | Constraint |
|-------|------|----------|-----------|
| `cylinder_id` | `int` | yes | must exist in `cylinders` |
| `qty` | `int` | yes | min 1 |
| `sale_price` | `float` | no | min 0 |
| `allocation_date` | `string` (Y-m-d) | no | defaults to today |

### Response

```json
{
  "success": true,
  "data": { ...StockAllocation with cylinder },
  "message": "Allocation created."
}
```

---

## 7. `PUT /allocations/{id}` *(Admin only — before reconcile)*

### Request Body

| Field | Type | Required | Constraint |
|-------|------|----------|-----------|
| `qty` | `int` | yes | min 1, must be ≥ `sold_qty` |
| `sale_price` | `float` | yes | min 0 |

> Returns 422 if allocation is already reconciled.

---

## 8. `POST /allocations/{id}/reconcile` *(Salesman or Admin)*

### Request Body

| Field | Type | Required | Constraint |
|-------|------|----------|-----------|
| `sold_qty` | `int` | yes | min 0, max `qty` |
| `collected_amount` | `float` | yes | min 0 |

> Unsold cylinders (`qty - sold_qty`) automatically return to warehouse.
> Returns 422 if already reconciled.

### Response

```json
{ "success": true, "data": { ...StockAllocation }, "message": "Allocation reconciled." }
```

---

## 9. `PUT /allocations/{id}/reconcile` *(Admin only — after reconcile)*

### Request Body

| Field | Type | Required | Constraint |
|-------|------|----------|-----------|
| `sold_qty` | `int` | yes | min 0, max `qty` |
| `collected_amount` | `float` | yes | min 0 |

> Returns 422 if allocation has NOT been reconciled yet.

---

## 10. `GET /salesmen/{id}/report`

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `from` | `string` (Y-m-d) | start of current month | Period start |
| `to` | `string` (Y-m-d) | today | Period end |

### Response

```json
{
  "success": true,
  "data": {
    "salesman": {
      "id":              1,
      "name":            "John Doe",
      "phone":           "01711000000",
      "is_active":       true,
      "avatar_initials": "JD"
    },
    "period":               { "from": "2026-06-01", "to": "2026-06-05" },
    "total_allocated":      200,
    "total_sold":           180,
    "total_returned":       15,
    "total_revenue":        36000.00,
    "total_cash_collected": 32000.00,
    "total_dues_created":   4000.00,
    "total_dues_collected": 3200.00,
    "still_outstanding":    800.00,
    "collection_rate_pct":  80.00,
    "customers_reached":    25,
    "sell_through_rate":    0.9,
    "pay_breakdown": {
      "cash":    40,
      "due":     5,
      "partial": 3
    },
    "daily_revenue": {
      "2026-06-01": 7200.00,
      "2026-06-02": 8400.00
    },
    "sales":       [ ],
    "allocations": [ ]
  }
}
```

### Field Types

| Field | Type | Notes |
|-------|------|-------|
| `total_allocated` | `int` | |
| `total_sold` | `int` | |
| `total_returned` | `int` | |
| `total_revenue` | `float` | |
| `total_cash_collected` | `float` | |
| `total_dues_created` | `float` | |
| `total_dues_collected` | `float` | |
| `still_outstanding` | `float` | |
| `collection_rate_pct` | `float` | e.g. `80.00` = 80% |
| `customers_reached` | `int` | |
| `sell_through_rate` | `float` | **0.0–1.0** (e.g. `0.9` = 90%) — multiply by 100 for % |
| `pay_breakdown` | `object` | keys: `"cash"`, `"due"`, `"partial"` — values: `int` |
| `daily_revenue` | `object` | keys: Y-m-d strings — values: `float` |

---

## 11. `GET /salesmen/{id}/cylinder-flow`

### Query Parameters — same as report (`from`, `to`)

### Response

```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-06-01", "to": "2026-06-05" },
    "summary": {
      "total_allocated":         200,
      "total_sold":              175,
      "total_returned_unsold":   20,
      "total_with_salesman":     5,
      "total_empties_collected": 170,
      "total_empties_extra":     10,
      "total_empties_normal":    160
    },
    "by_salesman": [
      {
        "salesman_id":       1,
        "salesman_name":     "John Doe",
        "allocated":         100,
        "sold":              90,
        "returned_unsold":   8,
        "with_salesman":     2,
        "empties_collected": 88,
        "sell_through_rate": 90.0
      }
    ],
    "by_cylinder": [
      {
        "cylinder_id":       1,
        "cylinder_name":     "12kg Standard",
        "cylinder_size":     "12kg",
        "allocated":         100,
        "sold":              90,
        "returned_unsold":   8,
        "with_salesmen":     2,
        "empties_collected": 88,
        "sell_through_pct":  90.0
      }
    ]
  }
}
```

### Field Types

| Field | Type | Notes |
|-------|------|-------|
| `summary.*` | `int` | All summary fields are integers |
| `by_salesman.sell_through_rate` | `float` | **Already a percentage** (0.0–100.0) |
| `by_cylinder.sell_through_pct` | `float` | **Already a percentage** (0.0–100.0) |
| `cylinder_name` | `string \| null` | |
| `cylinder_size` | `string \| null` | |

---

## 12. `GET /salesmen/{id}/daily-collections`

### Query Parameters

| Param | Type | Default |
|-------|------|---------|
| `date` | `string` (Y-m-d) | today |

### Response

```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "id":                       1,
        "customer_id":              5,
        "sale_id":                  12,
        "collected_by":             1,
        "amount":                   "500.00",
        "collection_date":          "2026-06-05",
        "notes":                    null,
        "reconciled_allocation_id": null,
        "created_at":               "2026-06-05T09:00:00.000000Z",
        "updated_at":               "2026-06-05T09:00:00.000000Z",
        "sale": {
          "id":           12,
          "sale_date":    "2026-06-04",
          "total_amount": "1000.00",
          "paid_amount":  "500.00"
        },
        "customer": {
          "id":    5,
          "name":  "Ahmed Ali",
          "phone": "01711222333"
        }
      }
    ],
    "total": 500.00,
    "date":  "2026-06-05"
  }
}
```

### `DueCollection` Field Types

| Field | Type | Notes |
|-------|------|-------|
| `id` | `int` | |
| `customer_id` | `int` | |
| `sale_id` | `int \| null` | |
| `collected_by` | `int` | user id of salesman |
| `amount` | `string` (decimal) | e.g. `"500.00"` — **cast to float before math** |
| `collection_date` | `string` (Y-m-d) | No time component |
| `notes` | `string \| null` | |
| `reconciled_allocation_id` | `int \| null` | null = pending (not yet swept into EOD) |
| `total` | `float` | Already parsed |

---

## Shared Object Shapes

### `Sale` (in `today_sales` / report)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `int` | |
| `sale_date` | `string` (Y-m-d) | |
| `total_amount` | `float` | Cast by SaleResource |
| `paid_amount` | `float` | Cast by SaleResource |
| `due_amount` | `float` | Appended: total - paid |
| `payment_type` | `"cash" \| "due" \| "partial"` | |
| `notes` | `string \| null` | |
| `customer` | `object \| null` | When loaded: `{id, name, phone}` |
| `salesman` | `object` | When loaded: `{id, name, avatar_initials}` |
| `items` | `array` | When loaded — see below |
| `created_at` | `string` (ISO 8601) | |

### `SaleItem` (inside `sale.items`)

| Field | Type |
|-------|------|
| `id` | `int` |
| `cylinder` | `object \| null` |
| `qty` | `int` |
| `unit_price` | `float` |
| `unit_cost` | `float` |
| `profit` | `float` |

### `Cylinder` (inside `sale.items.cylinder`)

| Field | Type |
|-------|------|
| `id` | `int` |
| `name` | `string` |
| `size` | `string` |
| `short_code` | `string` |
| `color1` | `string` |
| `color2` | `string` |

---

## Common Gotchas — Type Mismatch Cheatsheet

| Field | JSON type from API | Issue | Fix |
|-------|--------------------|-------|-----|
| `sale_price` | `string` `"150.00"` | Laravel `decimal:2` cast serializes as string | `parseFloat(sale_price)` |
| `collected_amount` | `string` `"7500.00"` | Same as above | `parseFloat(collected_amount)` |
| `total_amount` | `string` `"1000.00"` | Same as above (raw model) | `parseFloat(total_amount)` |
| `paid_amount` | `string` `"500.00"` | Same as above (raw model) | `parseFloat(paid_amount)` |
| `amount` (DueCollection) | `string` `"500.00"` | Same as above | `parseFloat(amount)` |
| `is_active` | `boolean` | Correct — but Sanctum token responses may differ | Never compare to `1`/`0` |
| `is_reconciled` | `boolean` | Correct | Never compare to `1`/`0` |
| `sell_through_rate` (report) | `float` 0.0–1.0 | Different scale than cylinder-flow | Multiply × 100 to show % |
| `sell_through_rate` (cylinder-flow) | `float` 0.0–100.0 | Already a percentage | Use directly |
| `allocation_date` | `string` Y-m-d | No time, no timezone | Don't use `new Date()` directly on Safari |
| `sale_date` | `string` Y-m-d | Same as above | Parse as UTC date |
| `collection_date` | `string` Y-m-d | Same as above | Parse as UTC date |
| `with_salesman` | `int` | Model appended attribute | Always present on StockAllocation |
| `sold_pct` | `int` | Model appended attribute | 0–100, not a float |
| `cash_collected_actual` | `float` | Server-computed on show/report only | Not stored in DB |
| `due_from_sales` | `float` | Server-computed on show/report only | Not stored in DB |

---

## Error Responses

```json
{ "message": "Access denied." }           // 403
{ "message": "Cannot edit a reconciled allocation." }  // 422
{ "message": "Sold (5) cannot exceed allocated quantity (4)." } // 422
{ "errors": { "field": ["Validation message"] } }  // 422 (validation)
{ "message": "Unauthenticated." }         // 401
```
