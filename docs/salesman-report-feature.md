# Salesman — My Report Feature
### Complete Mobile App Implementation Guide

> Flutter/Dart focused. All data types, request details, response shapes, and graph implementation.

---

## Endpoints Used in This Feature

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | GET | `/api/v1/salesmen/{id}/report` | Main performance report |
| 2 | GET | `/api/v1/salesmen/{id}/cylinder-flow` | Cylinder movement breakdown |
| 3 | GET | `/api/v1/salesmen/{id}/daily-collections` | Due collections for a date |

All require: `Authorization: Bearer <access_token>`

---

---

# ENDPOINT 1 — `GET /api/v1/salesmen/{id}/report`

## Request

### URL Parameter
| Param | Type | Description |
|-------|------|-------------|
| `id` | `int` | Salesman user ID |

### Query Parameters
| Param | Type | Required | Default | Example |
|-------|------|----------|---------|---------|
| `from` | `String` Y-m-d | no | start of current month | `2026-06-01` |
| `to` | `String` Y-m-d | no | today | `2026-06-05` |

### Example Request
```
GET /api/v1/salesmen/3/report?from=2026-06-01&to=2026-06-30
Authorization: Bearer eyJ...
```

---

## Full Response

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "salesman": {
      "id":              3,
      "name":            "John Doe",
      "phone":           "01711000000",
      "is_active":       true,
      "avatar_initials": "JD"
    },
    "period": {
      "from": "2026-06-01",
      "to":   "2026-06-30"
    },
    "total_allocated":      200,
    "total_sold":           175,
    "total_returned":       20,
    "total_revenue":        35000.00,
    "total_cash_collected": 30000.00,
    "total_dues_created":   5000.00,
    "total_dues_collected": 4000.00,
    "still_outstanding":    1000.00,
    "collection_rate_pct":  80.00,
    "customers_reached":    28,
    "sell_through_rate":    0.875,
    "pay_breakdown": {
      "cash":    40,
      "due":     5,
      "partial": 8
    },
    "daily_revenue": {
      "2026-06-01": 5000.00,
      "2026-06-02": 7200.00,
      "2026-06-03": 0.0,
      "2026-06-04": 9800.00,
      "2026-06-05": 13000.00
    },
    "sales": [
      {
        "id":           101,
        "sale_date":    "2026-06-05",
        "total_amount": "1300.00",
        "paid_amount":  "1300.00",
        "due_amount":   0.0,
        "payment_type": "cash",
        "notes":        null,
        "created_at":   "2026-06-05T08:30:00.000000Z",
        "customer": {
          "id":    5,
          "name":  "Ahmed Ali",
          "phone": "01712345678"
        },
        "items": [
          {
            "id": 201,
            "cylinder": {
              "id":         1,
              "name":       "12kg Standard",
              "size":       "12kg",
              "short_code": "12S",
              "color1":     "#FF5733",
              "color2":     "#C70039"
            },
            "qty":        2,
            "unit_price": 650.00,
            "unit_cost":  500.00,
            "profit":     300.00
          }
        ]
      }
    ],
    "allocations": [
      {
        "id":                    10,
        "salesman_id":           3,
        "cylinder_id":           1,
        "allocation_date":       "2026-06-05",
        "qty":                   20,
        "sale_price":            "650.00",
        "sold_qty":              18,
        "returned_qty":          2,
        "collected_amount":      "11700.00",
        "is_reconciled":         true,
        "notes":                 null,
        "with_salesman":         0,
        "sold_pct":              90,
        "cash_collected_actual": 11700.00,
        "due_from_sales":        0.0,
        "customer_dues": [
          { "customer": "Ahmed Ali", "due_amount": 650.00 }
        ],
        "cylinder": {
          "id":         1,
          "name":       "12kg Standard",
          "size":       "12kg",
          "short_code": "12S",
          "color1":     "#FF5733",
          "color2":     "#C70039"
        }
      }
    ]
  }
}
```

---

## Field-by-Field Data Types

### Top-Level `data` Fields

| Field | Dart Type | Raw JSON | Notes |
|-------|-----------|----------|-------|
| `total_allocated` | `int` | number | Count of cylinders allocated |
| `total_sold` | `int` | number | Count of cylinders sold |
| `total_returned` | `int` | number | Count returned unsold |
| `total_revenue` | `double` | number | Already a float |
| `total_cash_collected` | `double` | number | Already a float |
| `total_dues_created` | `double` | number | total_revenue - total_cash_collected |
| `total_dues_collected` | `double` | number | Already a float |
| `still_outstanding` | `double` | number | Unpaid dues remaining |
| `collection_rate_pct` | `double` | number | **Already a %** e.g. `80.00` = 80% |
| `customers_reached` | `int` | number | Unique customers with sales |
| `sell_through_rate` | `double` | number | **0.0–1.0** — multiply × 100 for % display |
| `pay_breakdown` | `Map<String, int>` | object | Keys: `cash`, `due`, `partial` |
| `daily_revenue` | `Map<String, double>` | object | Keys: Y-m-d strings, values: revenue |

### `salesman` Object

| Field | Dart Type | Raw JSON | Nullable |
|-------|-----------|----------|---------|
| `id` | `int` | number | no |
| `name` | `String` | string | no |
| `phone` | `String?` | string | yes |
| `is_active` | `bool` | boolean | no |
| `avatar_initials` | `String?` | string | yes |

### `period` Object

| Field | Dart Type | Raw JSON |
|-------|-----------|----------|
| `from` | `String` Y-m-d | string |
| `to` | `String` Y-m-d | string |

### `sales[]` — Each Sale Item

| Field | Dart Type | Raw JSON | Notes |
|-------|-----------|----------|-------|
| `id` | `int` | number | |
| `sale_date` | `String` Y-m-d | string | `DateTime.parse()` safe |
| `total_amount` | `double` | **string** `"1300.00"` | `double.parse(json['total_amount'].toString())` |
| `paid_amount` | `double` | **string** `"1300.00"` | `double.parse(json['paid_amount'].toString())` |
| `due_amount` | `double` | number | Appended, already float |
| `payment_type` | `String` | string | `"cash"` / `"due"` / `"partial"` |
| `notes` | `String?` | string | nullable |
| `created_at` | `String` ISO 8601 | string | |
| `customer` | `CustomerRef?` | object / null | null for walk-in |
| `items` | `List<SaleItem>` | array | |

### `sales[].customer` Object

| Field | Dart Type | Nullable |
|-------|-----------|---------|
| `id` | `int` | no |
| `name` | `String` | no |
| `phone` | `String?` | yes |

### `sales[].items[]` — Each Sale Item Line

| Field | Dart Type | Raw JSON | Notes |
|-------|-----------|----------|-------|
| `id` | `int` | number | |
| `qty` | `int` | number | |
| `unit_price` | `double` | **string** `"650.00"` | `double.parse(...)` |
| `unit_cost` | `double` | **string** `"500.00"` | `double.parse(...)` |
| `profit` | `double` | **string** `"300.00"` | `double.parse(...)` |
| `cylinder` | `CylinderRef?` | object / null | |

### `sales[].items[].cylinder` Object

| Field | Dart Type | Nullable |
|-------|-----------|---------|
| `id` | `int` | no |
| `name` | `String` | no |
| `size` | `String` | no |
| `short_code` | `String` | no |
| `color1` | `String` | no — hex color e.g. `"#FF5733"` |
| `color2` | `String` | no — hex color |

### `allocations[]` — Each Allocation

| Field | Dart Type | Raw JSON | Notes |
|-------|-----------|----------|-------|
| `id` | `int` | number | |
| `salesman_id` | `int` | number | |
| `cylinder_id` | `int` | number | |
| `allocation_date` | `String` Y-m-d | string | |
| `qty` | `int` | number | |
| `sale_price` | `double` | **string** `"650.00"` | `double.parse(...)` |
| `sold_qty` | `int` | number | |
| `returned_qty` | `int` | number | |
| `collected_amount` | `double` | **string** `"11700.00"` | `double.parse(...)` |
| `is_reconciled` | `bool` | boolean | |
| `notes` | `String?` | string | nullable |
| `with_salesman` | `int` | number | Appended: qty - sold - returned |
| `sold_pct` | `int` | number | Appended: 0–100 |
| `cash_collected_actual` | `double` | number | Server-computed float |
| `due_from_sales` | `double` | number | Server-computed float |
| `customer_dues` | `List<CustomerDue>` | array | Can be empty `[]` |
| `cylinder` | `CylinderRef?` | object / null | |

### `allocations[].customer_dues[]` Item

| Field | Dart Type | Raw JSON |
|-------|-----------|----------|
| `customer` | `String` | string |
| `due_amount` | `double` | number (already float) |

---

---

# ENDPOINT 2 — `GET /api/v1/salesmen/{id}/cylinder-flow`

## Request

### Query Parameters (same as report)
| Param | Type | Default |
|-------|------|---------|
| `from` | `String` Y-m-d | start of month |
| `to` | `String` Y-m-d | today |

---

## Full Response

```json
{
  "success": true,
  "data": {
    "period": {
      "from": "2026-06-01",
      "to":   "2026-06-30"
    },
    "summary": {
      "total_allocated":         200,
      "total_sold":              175,
      "total_returned_unsold":   20,
      "total_with_salesman":     5,
      "total_empties_collected": 168,
      "total_empties_extra":     10,
      "total_empties_normal":    158
    },
    "by_salesman": [
      {
        "salesman_id":       3,
        "salesman_name":     "John Doe",
        "allocated":         200,
        "sold":              175,
        "returned_unsold":   20,
        "with_salesman":     5,
        "empties_collected": 168,
        "sell_through_rate": 87.5
      }
    ],
    "by_cylinder": [
      {
        "cylinder_id":       1,
        "cylinder_name":     "12kg Standard",
        "cylinder_size":     "12kg",
        "allocated":         120,
        "sold":              108,
        "returned_unsold":   10,
        "with_salesmen":     2,
        "empties_collected": 105,
        "sell_through_pct":  90.0
      },
      {
        "cylinder_id":       2,
        "cylinder_name":     "5kg Mini",
        "cylinder_size":     "5kg",
        "allocated":         80,
        "sold":              67,
        "returned_unsold":   10,
        "with_salesmen":     3,
        "empties_collected": 63,
        "sell_through_pct":  83.75
      }
    ]
  }
}
```

## Field Types

### `summary` Object — All `int`

| Field | Dart Type | Description |
|-------|-----------|-------------|
| `total_allocated` | `int` | Total cylinders sent out |
| `total_sold` | `int` | Confirmed sold |
| `total_returned_unsold` | `int` | Returned without selling |
| `total_with_salesman` | `int` | Still with salesman (not returned) |
| `total_empties_collected` | `int` | Empty cylinders collected back |
| `total_empties_extra` | `int` | Extra empties (more than sold) |
| `total_empties_normal` | `int` | Normal empties (matching sales) |

### `by_salesman[]` Item

| Field | Dart Type | Notes |
|-------|-----------|-------|
| `salesman_id` | `int` | |
| `salesman_name` | `String` | |
| `allocated` | `int` | |
| `sold` | `int` | |
| `returned_unsold` | `int` | |
| `with_salesman` | `int` | |
| `empties_collected` | `int` | |
| `sell_through_rate` | `double` | **Already a %** e.g. `87.5` = 87.5% |

### `by_cylinder[]` Item

| Field | Dart Type | Nullable | Notes |
|-------|-----------|---------|-------|
| `cylinder_id` | `int` | no | |
| `cylinder_name` | `String?` | yes | |
| `cylinder_size` | `String?` | yes | |
| `allocated` | `int` | no | |
| `sold` | `int` | no | |
| `returned_unsold` | `int` | no | |
| `with_salesmen` | `int` | no | note: `with_salesmen` (plural) here |
| `empties_collected` | `int` | no | |
| `sell_through_pct` | `double` | no | **Already a %** e.g. `90.0` = 90% |

---

---

# ENDPOINT 3 — `GET /api/v1/salesmen/{id}/daily-collections`

## Request

### Query Parameters
| Param | Type | Required | Default |
|-------|------|----------|---------|
| `date` | `String` Y-m-d | no | today |

### Example
```
GET /api/v1/salesmen/3/daily-collections?date=2026-06-05
Authorization: Bearer eyJ...
```

---

## Full Response

```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "id":                       45,
        "customer_id":              5,
        "sale_id":                  88,
        "collected_by":             3,
        "amount":                   "500.00",
        "collection_date":          "2026-06-05",
        "notes":                    null,
        "reconciled_allocation_id": null,
        "created_at":               "2026-06-05T09:15:00.000000Z",
        "updated_at":               "2026-06-05T09:15:00.000000Z",
        "sale": {
          "id":           88,
          "sale_date":    "2026-06-01",
          "total_amount": "1000.00",
          "paid_amount":  "500.00"
        },
        "customer": {
          "id":    5,
          "name":  "Ahmed Ali",
          "phone": "01712345678"
        }
      }
    ],
    "total": 500.00,
    "date":  "2026-06-05"
  }
}
```

## Field Types

### Top-Level

| Field | Dart Type | Notes |
|-------|-----------|-------|
| `total` | `double` | Already parsed float |
| `date` | `String` Y-m-d | The queried date |
| `collections` | `List<DueCollection>` | Can be empty list |

### `collections[]` Item

| Field | Dart Type | Raw JSON | Notes |
|-------|-----------|----------|-------|
| `id` | `int` | number | |
| `customer_id` | `int` | number | |
| `sale_id` | `int?` | number | nullable |
| `collected_by` | `int` | number | salesman user id |
| `amount` | `double` | **string** `"500.00"` | `double.parse(json['amount'].toString())` |
| `collection_date` | `String` Y-m-d | string | `DateTime.parse()` safe |
| `notes` | `String?` | string | nullable |
| `reconciled_allocation_id` | `int?` | number | null = pending/not yet swept into EOD |
| `created_at` | `String` ISO 8601 | string | |
| `updated_at` | `String` ISO 8601 | string | |

### `collections[].sale` Object

| Field | Dart Type | Raw JSON | Notes |
|-------|-----------|----------|-------|
| `id` | `int` | number | |
| `sale_date` | `String` Y-m-d | string | |
| `total_amount` | `double` | **string** `"1000.00"` | `double.parse(...)` |
| `paid_amount` | `double` | **string** `"500.00"` | `double.parse(...)` |

### `collections[].customer` Object

| Field | Dart Type | Nullable |
|-------|-----------|---------|
| `id` | `int` | no |
| `name` | `String` | no |
| `phone` | `String?` | yes |

---

---

# GRAPHS — Implementation Guide

## Graph 1 — Daily Revenue Line Chart
**Source:** `data.daily_revenue` from endpoint 1

### Data Shape
```dart
// daily_revenue comes as Map<String, dynamic>
// keys = date strings "2026-06-01", values = double
Map<String, double> dailyRevenue = {
  "2026-06-01": 5000.00,
  "2026-06-02": 7200.00,
  "2026-06-04": 9800.00,
}
// NOTE: dates with no sales will be MISSING from the map (not 0.0)
// You must fill in missing dates yourself for a continuous line
```

### How to Build Chart Data
```
X-axis → sorted date strings (fill gaps with 0.0)
Y-axis → revenue double value
Chart type → LineChart or BarChart
```

### Step-by-step
1. Get the `from` and `to` dates from `data.period`
2. Generate every date in that range
3. For each date, look up `daily_revenue[date] ?? 0.0`
4. Plot as (index, amount) pairs

### Suggested Flutter Package
- `fl_chart` → `LineChart` with `FlSpot(index.toDouble(), revenue)`
- X-axis labels: show day number e.g. "1", "2", "3"
- Y-axis: format as currency e.g. "৳5K"

---

## Graph 2 — Payment Type Donut/Pie Chart
**Source:** `data.pay_breakdown` from endpoint 1

### Data Shape
```dart
Map<String, int> payBreakdown = {
  "cash":    40,   // count of cash sales
  "due":     5,    // count of fully due sales
  "partial": 8,    // count of partial payment sales
}
// Values are COUNTS not amounts
// A key may be missing if that type had 0 sales (treat as 0)
int cashCount    = payBreakdown['cash']    ?? 0;
int dueCount     = payBreakdown['due']     ?? 0;
int partialCount = payBreakdown['partial'] ?? 0;
```

### Chart Type → Donut/Pie Chart
- 3 segments: Cash / Due / Partial
- Show percentage labels
- Suggested colors: Cash=green, Partial=orange, Due=red

### fl_chart PieChartSectionData
```
sections: [
  PieChartSectionData(value: cashCount.toDouble(),    title: 'Cash'),
  PieChartSectionData(value: dueCount.toDouble(),     title: 'Due'),
  PieChartSectionData(value: partialCount.toDouble(), title: 'Partial'),
]
```

---

## Graph 3 — Cylinder Allocation Bar Chart
**Source:** `data.total_allocated`, `data.total_sold`, `data.total_returned` from endpoint 1

### Data Shape (single values)
```dart
int allocated = data['total_allocated'];   // int
int sold      = data['total_sold'];        // int
int returned  = data['total_returned'];    // int
int remaining = allocated - sold - returned; // compute yourself
```

### Chart Type → Grouped Bar Chart or Horizontal Progress Bars
- 4 bars: Allocated / Sold / Returned / Remaining
- Or use 3 stacked bars: Sold (green) + Returned (orange) + Remaining (red) = Allocated

---

## Graph 4 — Sell-Through Rate Circular Progress
**Source:** `data.sell_through_rate` from endpoint 1

### Data Shape
```dart
double sellThroughRate = data['sell_through_rate']; // 0.0 to 1.0
// e.g. 0.875 = 87.5%
double displayPct = sellThroughRate * 100; // → 87.5
```

### Chart Type → CircularProgressIndicator or Radial Gauge
```
value: sellThroughRate  // use directly for CircularProgressIndicator
label: "${displayPct.toStringAsFixed(1)}%"
```

---

## Graph 5 — Collection Rate Circular Progress
**Source:** `data.collection_rate_pct` from endpoint 1

### Data Shape
```dart
double collectionRatePct = data['collection_rate_pct']; // 0.0 to 100.0 (already %)
// e.g. 80.00 = 80%
double forWidget = collectionRatePct / 100; // → 0.80 for CircularProgressIndicator
```

> **Watch out:** `sell_through_rate` is 0–1, `collection_rate_pct` is 0–100. They are different scales.

---

## Graph 6 — Revenue vs Collection Summary Bar
**Source:** `total_revenue`, `total_cash_collected`, `still_outstanding` from endpoint 1

### Data Shape
```dart
double totalRevenue      = data['total_revenue'];        // double
double cashCollected     = data['total_cash_collected']; // double
double duesCreated       = data['total_dues_created'];   // double
double duesCollected     = data['total_dues_collected']; // double
double stillOutstanding  = data['still_outstanding'];    // double
```

### Chart Type → Stacked Horizontal Bar or Summary Cards
- Revenue = Cash Collected + Dues Created
- Dues Created = Dues Collected + Still Outstanding
- Show as a stacked bar: `cashCollected` (green) + `duesCollected` (orange) + `stillOutstanding` (red) = `totalRevenue`

---

## Graph 7 — Per-Cylinder Flow Bar Chart
**Source:** `data.by_cylinder[]` from endpoint 2 (cylinder-flow)

### Data Shape
```dart
List<Map> byCylinder = data['by_cylinder'];
// Each item:
// cylinder_name:   String?  → bar label
// allocated:       int
// sold:            int
// returned_unsold: int
// with_salesmen:   int      (NOTE: plural, not singular)
// sell_through_pct: double  (already %)
```

### Chart Type → Grouped Bar Chart
- X-axis: cylinder name (short_code or size)
- For each cylinder: 2–3 grouped bars: Allocated / Sold / With Salesman
- Or: single bar with sell_through_pct as a progress indicator

---

## Graph 8 — Cylinder Summary Horizontal Bars
**Source:** `data.summary` from endpoint 2 (cylinder-flow)

### Data Shape
```dart
// All int values
int totalAllocated        = summary['total_allocated'];
int totalSold             = summary['total_sold'];
int totalReturnedUnsold   = summary['total_returned_unsold'];
int totalWithSalesman     = summary['total_with_salesman'];
int totalEmptiesCollected = summary['total_empties_collected'];
```

### Chart Type → Horizontal Progress Bars (LinearProgressIndicator)
- Sold / Allocated = sold progress
- EmptiesCollected / Sold = empty collection rate

---

## Graph 9 — Daily Collections List + Total
**Source:** `data.collections[]` + `data.total` from endpoint 3

### Data Shape
```dart
double totalToday = data['total'];      // double — already parsed
String date       = data['date'];       // String Y-m-d

// Each collection:
double amount     = double.parse(collection['amount'].toString()); // string → double
String date       = collection['collection_date']; // String Y-m-d
bool isPending    = collection['reconciled_allocation_id'] == null;
```

### UI → Timeline/List View + Summary Card
- Top: summary card showing `total` for the day
- Below: scrollable list of collections
- Each item: customer name, amount, sale reference, pending badge if `reconciled_allocation_id == null`

---

---

# Summary Cards Data Mapping

These are the key numbers to show as summary/stat cards on the report screen:

| Card Title | Field | Type | Format |
|-----------|-------|------|--------|
| Total Revenue | `total_revenue` | `double` | `৳35,000.00` |
| Cash Collected | `total_cash_collected` | `double` | `৳30,000.00` |
| Outstanding Dues | `still_outstanding` | `double` | `৳1,000.00` |
| Cylinders Sold | `total_sold` | `int` | `175 pcs` |
| Sell-Through | `sell_through_rate × 100` | `double` | `87.5%` |
| Collection Rate | `collection_rate_pct` | `double` | `80.0%` |
| Customers Reached | `customers_reached` | `int` | `28` |
| Total Allocated | `total_allocated` | `int` | `200 pcs` |

---

# Common Parsing Mistakes to Avoid

| Field | Wrong | Correct |
|-------|-------|---------|
| `total_amount` | `json['total_amount'] as double` | `double.parse(json['total_amount'].toString())` |
| `paid_amount` | `json['paid_amount'] as double` | `double.parse(json['paid_amount'].toString())` |
| `sale_price` | `json['sale_price'] as double` | `double.parse(json['sale_price'].toString())` |
| `collected_amount` | `json['collected_amount'] as double` | `double.parse(json['collected_amount'].toString())` |
| `unit_price` | `json['unit_price'] as double` | `double.parse(json['unit_price'].toString())` |
| `unit_cost` | `json['unit_cost'] as double` | `double.parse(json['unit_cost'].toString())` |
| `profit` | `json['profit'] as double` | `double.parse(json['profit'].toString())` |
| `amount` (DueCollection) | `json['amount'] as double` | `double.parse(json['amount'].toString())` |
| `sell_through_rate` (report) | show directly as % | multiply × 100 first |
| `sell_through_rate` (cylinder-flow) | multiply × 100 | use directly — already % |
| `daily_revenue` missing date | crash/null | use `map[date] ?? 0.0` |
| `pay_breakdown` missing key | crash/null | use `map['cash'] ?? 0` |
| `customer` on sale | `sale['customer']['name']` | null-check first — walk-in sales have `null` customer |
| `cylinder` on item | `item['cylinder']['name']` | null-check first |

---

# Decimal String Fields — Universal Fix

These fields **always come as String** from the API due to Laravel's `decimal:2` cast:

```
sale_price        → "650.00"
collected_amount  → "11700.00"
total_amount      → "1300.00"
paid_amount       → "1300.00"
unit_price        → "650.00"
unit_cost         → "500.00"
profit            → "300.00"
amount            → "500.00"   (DueCollection)
```

Safe parser to use in every `fromJson`:
```dart
static double parseDecimal(dynamic value) {
  if (value == null) return 0.0;
  if (value is double) return value;
  if (value is int) return value.toDouble();
  return double.tryParse(value.toString()) ?? 0.0;
}
```

Fields that are **already proper numbers** (no parsing needed):
```
total_revenue          → double
total_cash_collected   → double
total_dues_created     → double
total_dues_collected   → double
still_outstanding      → double
collection_rate_pct    → double
sell_through_rate      → double
cash_collected_actual  → double
due_from_sales         → double
due_amount             → double   (appended on Sale)
total  (daily-collections) → double
```
