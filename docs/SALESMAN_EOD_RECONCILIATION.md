# Salesman End of Day (EOD) Reconciliation

Complete technical reference for the EOD reconciliation system in CylinderHub.

---

## Table of Contents

1. [Business Overview](#1-business-overview)
2. [Full Lifecycle Flow](#2-full-lifecycle-flow)
3. [Database Schema](#3-database-schema)
4. [Models](#4-models)
5. [Service Layer (Business Logic)](#5-service-layer)
6. [API Endpoints](#6-api-endpoints)
7. [Controllers](#7-controllers)
8. [Frontend Components](#8-frontend-components)
9. [Frontend Services & Hooks](#9-frontend-services--hooks)
10. [Console Commands](#10-console-commands)
11. [Business Rules & Edge Cases](#11-business-rules--edge-cases)
12. [File Reference Map](#12-file-reference-map)

---

## 1. Business Overview

The EOD reconciliation system closes out a salesman's day by reconciling:
- How many cylinders were allocated vs. actually sold vs. returned
- How much cash was collected (at sale time + subsequent due payments)
- Which pending due collections are attributed to this day's cycle

### Roles

| Role | Responsibilities |
|------|-----------------|
| **Admin** | Creates allocations, views all salesman data, edits pre/post-EOD allocations |
| **Salesman** | Makes sales during the day, collects dues, submits EOD reconciliation |

### High-Level Lifecycle

```
ADMIN                    SALESMAN                   SYSTEM
  │                          │                         │
  │── Allocate cylinders ───►│                         │
  │   (stock deducted)       │                         │
  │                          │── Make sales ──────────►│
  │                          │   (sold_qty tracked,    │
  │                          │    cash attributed)     │
  │                          │                         │
  │                          │── Collect dues ────────►│
  │                          │   (DueCollection        │
  │                          │    created, pending)    │
  │                          │                         │
  │                          │── Submit EOD ──────────►│
  │                          │   (sold_qty +           │── Return unsold stock
  │                          │    collected_amount)    │── Mark is_reconciled=true
  │                          │                         │── Sweep pending dues
  │                          │                         │── Log audit trail
  │                          │◄── Confirmation ────────│
  │                          │                         │
  │◄── Review / Correct ─────│                         │
  │    (admin only)          │                         │
```

---

## 2. Full Lifecycle Flow

### Step 1 — Admin Allocates Cylinders

- Admin calls `POST /api/v1/salesmen/{user}/allocate`
- `AllocationService::allocate()` creates a `StockAllocation` record with `is_reconciled = false`
- Warehouse `filled_qty` is decremented for that cylinder
- A `stock_movements` record is written with `event_type = 'allocation'`

### Step 2 — Salesman Makes Sales During the Day

- Salesman creates sales via `POST /api/v1/sales`
- `SaleService::createSale()` checks the salesman has sufficient unreconciled allocation qty
- After saving the sale, `updateAllocationSoldQty()` runs:
  - Iterates salesman's unreconciled allocations **FIFO** (oldest `allocation_date` first)
  - Increments `sold_qty` on each allocation consumed
  - Attributes proportional cash: `cashForAlloc = round(paidAmount × (lineRevenue / totalAmount), 2)`
  - Increments `collected_amount` on each allocation accordingly

### Step 3 — Salesman Collects Customer Dues

- Any due payment is recorded via `POST /api/v1/sales/{sale}/pay`
- Creates a `DueCollection` record with `reconciled_allocation_id = null` (pending)
- These pending dues will be swept into the next EOD cycle

### Step 4 — Salesman Submits EOD Reconciliation

- Salesman opens `/eod` page, reviews each allocation, and submits `sold_qty` + `collected_amount`
- Request: `POST /api/v1/allocations/{allocation}/reconcile`
- `AllocationService::reconcile()` executes in a DB transaction:
  1. Calculates `unsold = max(0, qty - soldQty - returnedQty)`
  2. Returns `totalFilledBack = returnedQty + unsold` to warehouse
  3. Writes `stock_movements` record with `event_type = 'eod_return'`
  4. Updates allocation: `is_reconciled = true`, `sold_qty`, `returned_qty`, `collected_amount`
  5. Sweeps all pending `DueCollection` records for this salesman into this cycle:
     ```sql
     UPDATE due_collections
     SET reconciled_allocation_id = {allocation.id}
     WHERE collected_by = {salesman_id}
       AND reconciled_allocation_id IS NULL
     ```
  6. Writes audit log entry with action `'reconciled'`

### Step 5 — Admin Reviews / Corrects (Optional)

- Admin can edit a reconciled allocation via `PUT /api/v1/allocations/{allocation}/reconcile`
- `AllocationService::updateReconciliation()` adjusts `sold_qty` and `collected_amount`
- If sold qty changed, warehouse stock is adjusted and a `reconcile_adjustment` movement is recorded

---

## 3. Database Schema

### `stock_allocations` — Core EOD Table

**Migration:** `database/migrations/2026_05_30_050609_create_stock_allocations_table.php`
**Sale price added:** `database/migrations/2026_06_01_000001_add_sale_price_to_stock_allocations.php`

```sql
CREATE TABLE stock_allocations (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    salesman_id        BIGINT UNSIGNED NOT NULL,        -- FK → users.id
    cylinder_id        BIGINT UNSIGNED NOT NULL,        -- FK → cylinders.id
    allocation_date    DATE            NOT NULL,
    qty                INT UNSIGNED    NOT NULL,         -- total allocated units
    sale_price         DECIMAL(10,2)   NOT NULL,        -- selling price per unit
    sold_qty           INT UNSIGNED    NOT NULL DEFAULT 0,
    returned_qty       INT UNSIGNED    NOT NULL DEFAULT 0,
    collected_amount   DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    is_reconciled      TINYINT(1)      NOT NULL DEFAULT 0,
    notes              TEXT            NULL,
    created_at         TIMESTAMP,
    updated_at         TIMESTAMP,
    INDEX idx_salesman_date (salesman_id, allocation_date)
);
```

| Field | Description |
|-------|-------------|
| `qty` | Total cylinders allocated to the salesman for the day |
| `sold_qty` | Incremented as sales are made (FIFO); confirmed at EOD |
| `returned_qty` | Unsold cylinders explicitly handed back |
| `collected_amount` | Cash attributed from sales (proportional) + updated at EOD |
| `is_reconciled` | Main EOD flag; locked from salesman edits once `true` |
| `sale_price` | Unit price set at allocation time |

---

### `due_collections` — Customer Due Payment Tracking

**Migration:** `database/migrations/2026_05_30_050610_create_due_collections_table.php`
**EOD link added:** `database/migrations/2026_06_04_075436_add_reconciled_allocation_id_to_due_collections.php`

```sql
CREATE TABLE due_collections (
    id                         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id                BIGINT UNSIGNED NOT NULL,       -- FK → customers.id
    sale_id                    BIGINT UNSIGNED NULL,           -- FK → sales.id
    collected_by               BIGINT UNSIGNED NOT NULL,       -- FK → users.id (salesman)
    amount                     DECIMAL(12,2)   NOT NULL,
    collection_date            DATE            NOT NULL,
    reconciled_allocation_id   BIGINT UNSIGNED NULL,           -- FK → stock_allocations.id
    notes                      TEXT            NULL,
    created_at                 TIMESTAMP,
    updated_at                 TIMESTAMP,
    INDEX idx_collection_date (collection_date)
);
```

| Field | Description |
|-------|-------------|
| `reconciled_allocation_id` | `NULL` = pending (not yet swept). Set to allocation ID at EOD |
| `collected_by` | The salesman who collected this payment |
| `sale_id` | The original sale this payment applies to |

---

### `stock_movements` — Stock Audit Trail

**Migration:** `database/migrations/2026_06_02_000001_create_stock_movements_table.php`

```sql
CREATE TABLE stock_movements (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cylinder_id    BIGINT UNSIGNED NOT NULL,
    event_type     ENUM(
                       'purchase', 'sale', 'sale_delete',
                       'allocation', 'allocation_edit',
                       'reconcile_adjustment', 'eod_return',
                       'cylinder_return', 'refill_sent', 'refill_received'
                   ) NOT NULL,
    change_qty     INT             NOT NULL,   -- positive = added, negative = removed
    balance_after  INT UNSIGNED    NOT NULL,   -- warehouse filled_qty after this movement
    reference_id   BIGINT UNSIGNED NULL,       -- ID of related StockAllocation or Sale
    recorded_by    BIGINT UNSIGNED NOT NULL,   -- FK → users.id
    notes          VARCHAR(500)    NULL,
    created_at     TIMESTAMP,
    INDEX idx_cylinder_date (cylinder_id, created_at)
);
```

EOD-specific event types:

| Event Type | Trigger | `change_qty` |
|-----------|---------|-------------|
| `allocation` | Admin creates allocation | negative (stock leaves warehouse) |
| `allocation_edit` | Admin changes qty before EOD | positive or negative |
| `eod_return` | Salesman submits EOD | positive (unsold back to warehouse) |
| `reconcile_adjustment` | Admin edits post-EOD | positive or negative |

---

### Supporting Tables (summary)

| Table | Relevant Fields | EOD Role |
|-------|----------------|----------|
| `sales` | `salesman_id`, `paid_amount`, `total_amount`, `payment_type` | Source of `sold_qty` and `collected_amount` increments |
| `sale_items` | `cylinder_id`, `qty`, `unit_price` | Proportional cash attribution per cylinder |
| `cylinder_stock` | `cylinder_id`, `filled_qty`, `empty_qty` | Warehouse balance updated at allocation & EOD return |
| `audit_logs` | `action`, `model`, `model_id`, `description` | Human-readable change history |

---

## 4. Models

### `StockAllocation`

**File:** `app/Models/StockAllocation.php`

```php
// Key relationships
public function salesman(): BelongsTo   // → User
public function cylinder(): BelongsTo   // → Cylinder
public function dueCollections(): HasMany // → DueCollection (via reconciled_allocation_id)

// Computed attributes (appended)
public function getWithSalesmanAttribute(): int
    // max(0, qty - sold_qty - returned_qty)  — units still with salesman

public function getSoldPctAttribute(): float
    // sold_qty / qty * 100  — sell-through percentage

// Scopes
public function scopeForSalesman($query, int $salesmanId)
public function scopeToday($query)
```

---

### `DueCollection`

**File:** `app/Models/DueCollection.php`

```php
// Key relationships
public function customer(): BelongsTo              // → Customer
public function sale(): BelongsTo                  // → Sale (nullable)
public function collectedBy(): BelongsTo           // → User (salesman)
public function reconciledAllocation(): BelongsTo  // → StockAllocation (nullable)

// Scope
public function scopePending($query)
    // whereNull('reconciled_allocation_id')
    // Returns all collections not yet swept into any EOD cycle
```

---

### `StockMovement`

**File:** `app/Models/StockMovement.php`

```php
public function cylinder(): BelongsTo   // → Cylinder
public function recordedBy(): BelongsTo // → User
```

`event_type` enum values: `purchase`, `sale`, `sale_delete`, `allocation`, `allocation_edit`, `reconcile_adjustment`, `eod_return`, `cylinder_return`, `refill_sent`, `refill_received`

---

### `Sale`

**File:** `app/Models/Sale.php`

```php
public function salesman(): BelongsTo      // → User
public function customer(): BelongsTo      // → Customer
public function items(): HasMany           // → SaleItem
public function dueCollections(): HasMany  // → DueCollection

// Computed attribute
public function getDueAmountAttribute(): float
    // max(0, total_amount - paid_amount)
```

`payment_type`: `'cash'` | `'partial'` | `'due'`

---

### `SaleItem`

**File:** `app/Models/SaleItem.php`

```php
// Computed attribute
public function getLineTotalAttribute(): float
    // qty * unit_price
```

---

## 5. Service Layer

### `AllocationService`

**File:** `app/Services/AllocationService.php`

---

#### `allocate(int $salesmanId, int $cylinderId, int $qty, float $salePrice, string $date): StockAllocation`

Creates a new allocation. Runs in a `DB::transaction`.

1. Locks `cylinder_stock` row for update
2. Validates `$qty ≤ filled_qty` (throws `RuntimeException` otherwise)
3. Calls `StockService::removeFilledStock($cylinderId, $qty)`
4. Creates `StockAllocation` with `is_reconciled = false`
5. Records `stock_movements` entry (`event_type = 'allocation'`, `change_qty = -qty`)
6. Logs audit entry (`action = 'created'`)

---

#### `updateAllocation(StockAllocation $allocation, int $newQty, float $newSalePrice): StockAllocation`

Edits qty/price before reconciliation. Runs in a `DB::transaction`.

- If `newQty > currentQty`: removes extra from warehouse, records `'allocation'` movement
- If `newQty < currentQty`: returns excess to warehouse, records `'allocation_edit'` movement
- Updates `qty` and `sale_price` on the allocation record
- Logs audit entry (`action = 'updated'`)

---

#### `reconcile(StockAllocation $allocation, int $soldQty, int $returnedQty, float $collectedAmount): StockAllocation`

**Main EOD entry point.** Throws `LogicException` if already reconciled. Runs in a `DB::transaction`.

```php
$unsold          = max(0, $allocation->qty - $soldQty - $returnedQty);
$totalFilledBack = $returnedQty + $unsold;

// 1. Return unsold filled cylinders to warehouse
if ($totalFilledBack > 0) {
    $this->stockService->addFilledStock($allocation->cylinder_id, $totalFilledBack);
    $this->movements->record(
        $allocation->cylinder_id, 'eod_return', $totalFilledBack, ...
    );
}

// 2. Mark allocation as reconciled
$allocation->update([
    'sold_qty'         => $soldQty,
    'returned_qty'     => $returnedQty,
    'collected_amount' => $collectedAmount,
    'is_reconciled'    => true,
]);

// 3. Sweep all pending due collections for this salesman into this EOD
DueCollection::where('collected_by', $allocation->salesman_id)
    ->whereNull('reconciled_allocation_id')
    ->update(['reconciled_allocation_id' => $allocation->id]);

// 4. Audit log
$this->audit->log('reconciled', 'Allocation', $allocation->id, ...);
```

---

#### `updateReconciliation(StockAllocation $allocation, int $newSoldQty, float $newCollectedAmount): StockAllocation`

Admin correction after EOD. Runs in a `DB::transaction`.

```php
$oldFilledBack = $allocation->qty - $allocation->sold_qty;
$newFilledBack = $allocation->qty - $newSoldQty;
$netChange     = $newFilledBack - $oldFilledBack;

// Adjust warehouse stock if sold qty changed
if ($netChange > 0) addFilledStock($netChange);
if ($netChange < 0) removeFilledStock(abs($netChange));

// Record 'reconcile_adjustment' movement if stock changed
// Update sold_qty, returned_qty, collected_amount on allocation
```

---

### `SaleService`

**File:** `app/Services/SaleService.php`

---

#### `createSale(array $data): Sale`

For salesman sales:
- Validates sufficient unreconciled allocation qty exists for each cylinder on the sale date
- After saving the sale, calls `updateAllocationSoldQty()`

---

#### `updateAllocationSoldQty(int $salesmanId, array $items, string $saleDate, float $paidAmount, float $totalAmount): void` _(private)_

FIFO allocation consumption and proportional cash attribution:

```php
// For each cylinder in the sale items:
$allocations = StockAllocation::where('salesman_id', $salesmanId)
    ->where('cylinder_id', $cylinderId)
    ->whereDate('allocation_date', '<=', $saleDate)
    ->where('is_reconciled', false)
    ->orderBy('allocation_date', 'asc')
    ->orderBy('created_at', 'asc')
    ->get();

foreach ($allocations as $allocation) {
    $capacity = max(0, $allocation->qty - $allocation->sold_qty - $allocation->returned_qty);
    $take     = min($remaining, $capacity);
    if ($take > 0) {
        $allocation->increment('sold_qty', $take);
        // Proportional cash
        $lineRevenue  = $take * $unitPrice;
        $proportion   = $lineRevenue / $totalAmount;
        $cashForAlloc = round($paidAmount * $proportion, 2);
        $allocation->increment('collected_amount', $cashForAlloc);
    }
}
```

Key invariant: cash attributed to each allocation is **proportional to that line's revenue**, not split equally. This ensures the cash pool is accurate when the salesman has multiple cylinder types in one allocation.

---

### `ReportService`

**File:** `app/Services/ReportService.php`

| Method | Description |
|--------|-------------|
| `cylinderFlow(string $from, string $to, ?int $salesmanId)` | Allocation/return metrics with sell-through rate per salesman and cylinder |
| `salesmanReport(int $salesmanId, string $from, string $to)` | Full salesman EOD history: allocated, sold, returned, cash collected, due created, collection rate % |

---

### `DashboardService`

**File:** `app/Services/DashboardService.php`

`getSummary()` calculates `withSalesmen` = sum of `max(0, qty - sold_qty - returned_qty)` across all unreconciled allocations — representing cylinders currently in the field.

---

### `StockMovementService`

**File:** `app/Services/StockMovementService.php`

```php
public function record(
    int $cylinderId,
    string $eventType,
    int $changeQty,
    int $recordedBy,
    ?int $referenceId,
    ?string $notes
): StockMovement
```

Captures the current `filled_qty` as `balance_after` at the moment of the call.

---

## 6. API Endpoints

All endpoints require `Authorization: Bearer {token}` (Sanctum).

---

### `POST /api/v1/allocations/{allocation}/reconcile`

**Who:** Salesman (own allocations only)
**Action:** Submit EOD — marks allocation reconciled, returns unsold stock, sweeps pending dues

**Request Body:**
```json
{
  "sold_qty":         12,
  "collected_amount": 14400.00
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `sold_qty` | required, integer, min:0, max:allocation.qty |
| `collected_amount` | required, numeric, min:0 |

`returned_qty` is automatically computed as `allocation.qty - sold_qty`.

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Allocation reconciled.",
  "data": {
    "id":               42,
    "salesman_id":      5,
    "cylinder_id":      2,
    "allocation_date":  "2026-06-05",
    "qty":              15,
    "sale_price":       "1200.00",
    "sold_qty":         12,
    "returned_qty":     3,
    "collected_amount": "14400.00",
    "is_reconciled":    true
  }
}
```

**Error Responses:**
| Code | Condition |
|------|-----------|
| `422` | Already reconciled |
| `422` | `sold_qty` exceeds `allocation.qty` |
| `403` | Salesman accessing another salesman's allocation |

---

### `PUT /api/v1/allocations/{allocation}/reconcile`

**Who:** Admin only
**Action:** Correct a previously reconciled allocation's sold qty and collected amount

**Request Body:**
```json
{
  "sold_qty":         10,
  "collected_amount": 12000.00
}
```

**Validation:** Same rules as POST above.

**Success Response `200`:** Updated allocation object (same shape).

**Error Responses:**
| Code | Condition |
|------|-----------|
| `422` | Allocation not yet reconciled |

---

### `GET /api/v1/salesmen/{user}`

**Who:** Admin (any), Salesman (own only)
**Action:** Returns salesman dashboard data including all allocations with EOD cash breakdown

**Response:**
```json
{
  "success": true,
  "data": {
    "salesman": {
      "id":       5,
      "name":     "Rahim",
      "email":    "rahim@example.com",
      "is_active": true,
      "allocations": [
        {
          "id":                  42,
          "cylinder_id":         2,
          "cylinder":            { "id": 2, "name": "12kg LPG", "size": "12kg" },
          "allocation_date":     "2026-06-05",
          "qty":                 15,
          "sale_price":          "1200.00",
          "sold_qty":            12,
          "returned_qty":        0,
          "collected_amount":    "14400.00",
          "cash_collected_actual": 14400.00,
          "due_from_sales":      0.00,
          "is_reconciled":       false,
          "customer_dues": [
            { "customer": "Mr. Karim", "due_amount": 1200.00 }
          ]
        }
      ]
    },
    "stats": {
      "total_allocated":          15,
      "total_sold":               12,
      "total_returned":           0,
      "cash_collected":           14400.00,
      "today_total_sales_amount": 16800.00,
      "today_due_amount":         2400.00,
      "pending_due_collections":  1200.00,
      "total_cash_to_hand_in":    15600.00,
      "total_outstanding_dues":   3600.00
    },
    "pending_collections": [
      {
        "id":              88,
        "sale_id":         201,
        "amount":          "1200.00",
        "collection_date": "2026-06-05",
        "customer":        { "id": 12, "name": "Mr. Karim", "phone": "01700000000" },
        "sale":            { "id": 201, "sale_date": "2026-06-04", "total_amount": "3600.00" }
      }
    ]
  }
}
```

**Stats fields explained:**

| Field | Meaning |
|-------|---------|
| `cash_collected` | Sale-time cash only (excludes subsequent due payments to avoid double-counting) |
| `pending_due_collections` | Sum of `DueCollection` records with `reconciled_allocation_id = null` |
| `total_cash_to_hand_in` | `cash_collected + pending_due_collections` |
| `cash_collected_actual` | Per-allocation server-computed cash (for EOD form pre-fill) |
| `due_from_sales` | `expected_revenue - cash_collected_actual` per allocation |

---

### `POST /api/v1/salesmen/{user}/allocate`

**Who:** Admin only
**Action:** Create new allocation for a salesman

**Request Body:**
```json
{
  "cylinder_id":     2,
  "qty":             15,
  "sale_price":      1200,
  "allocation_date": "2026-06-05"
}
```

**Error Responses:**
| Code | Condition |
|------|-----------|
| `422` | Insufficient warehouse filled stock |

---

### `PUT /api/v1/allocations/{allocation}`

**Who:** Admin only
**Action:** Edit qty and/or sale_price before EOD reconciliation

**Request Body:**
```json
{
  "qty":        20,
  "sale_price": 1250
}
```

---

### `GET /api/v1/salesmen/{user}/daily-collections`

**Who:** Admin (any), Salesman (own only)
**Action:** List due collections for a specific date

**Query Params:**
| Param | Default | Description |
|-------|---------|-------------|
| `date` | today | Date in `YYYY-MM-DD` format |

**Response:**
```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "id":              88,
        "amount":          "1200.00",
        "collection_date": "2026-06-05",
        "sale":            { "id": 201, "sale_date": "2026-06-04", "total_amount": "3600.00" },
        "customer":        { "id": 12, "name": "Mr. Karim", "phone": "01700000000" }
      }
    ],
    "total": 1200.00,
    "date":  "2026-06-05"
  }
}
```

---

### `POST /api/v1/sales/{sale}/pay`

**Who:** Admin or Salesman
**Action:** Record a customer due payment on an existing sale

**Request Body:**
```json
{
  "amount":          1200.00,
  "collection_date": "2026-06-05",
  "notes":           "Collected at market"
}
```

Creates a `DueCollection` record with `reconciled_allocation_id = null` (pending until next EOD).

---

### `GET /api/v1/reports/cylinder-flow`

**Who:** Admin only
**Action:** Cylinder flow report (allocations, returns, sell-through rate)

**Query Params:** `from`, `to` (dates), `salesman_id` (optional)

---

### `GET /api/v1/salesmen/{user}/report`

**Who:** Admin only
**Action:** Detailed salesman EOD report for a date range

**Query Params:** `from`, `to` (dates)

---

## 7. Controllers

### `SalesmanController`

**File:** `app/Http/Controllers/Api/V1/SalesmanController.php`

| Method | Route | Description |
|--------|-------|-------------|
| `show(User $user)` | `GET /salesmen/{user}` | Dashboard with allocations, stats, pending dues |
| `reconcile(Request, StockAllocation)` | `POST /allocations/{allocation}/reconcile` | Salesman EOD submission |
| `updateReconcile(Request, StockAllocation)` | `PUT /allocations/{allocation}/reconcile` | Admin post-EOD correction |
| `dailyCollections(Request, User)` | `GET /salesmen/{user}/daily-collections` | Due collections for a date |
| `allocate(Request, User)` | `POST /salesmen/{user}/allocate` | Admin creates allocation |
| `updateAllocation(Request, StockAllocation)` | `PUT /allocations/{allocation}` | Admin edits allocation |

### `SaleController`

**File:** `app/Http/Controllers/Api/V1/SaleController.php`

| Method | Route | Description |
|--------|-------|-------------|
| `pay(Request, Sale)` | `POST /sales/{sale}/pay` | Record due payment (creates DueCollection) |

### `StockController`

**File:** `app/Http/Controllers/Api/V1/StockController.php`

| Method | Route | Description |
|--------|-------|-------------|
| `returns(Request)` | `GET /stock/returns` | List cylinder returns |
| `storeReturn(Request)` | `POST /stock/returns` | Log cylinder return, auto-links to active allocation |

---

## 8. Frontend Components

### `EndOfDay.jsx` — Salesman EOD Submission Page

**File:** `resources/js/pages/EndOfDay.jsx`
**Route:** `/eod` (salesman-only, wrapped in `<SalesmanRoute>`)

**Features:**
- Fetches salesman data via `queryKey: ['my-allocations', user.id]`
- Lists all allocations — today's and any unreconciled from previous days
- Shows "All Done!" state when all allocations are reconciled
- Displays EOD summary: total cash to hand in, pending dues
- Each allocation shows `ReconcileForm` inline

**`ReconcileForm` sub-component:**
- Pre-fills `sold_qty` from `allocation.sold_qty`
- Pre-fills `collected_amount` from server-computed `allocation.cash_collected_actual`
- Auto-updates cash when `sold_qty` changes (maintains actual collection ratio)
- Auto-computes `returned = allocated - sold` (display only)
- Two-step confirmation: input → review → submit
- On success: invalidates `['my-allocations']` query

---

### `Allocation.jsx` — Admin Allocation Management

**File:** `resources/js/pages/Allocation.jsx`
**Route:** `/allocation` (admin-only)

**Features:**
- Date navigation (previous/next day, historical view)
- Shows all active salesmen with their allocations and reconciliation status
- Quick-edit allocation qty/price before EOD
- Allocate cylinders to salesman modal
- Summary stats: active salesmen count, total allocated, total collected

---

### `SalesmanDetail.jsx` — Admin Salesman Detail View

**File:** `resources/js/pages/SalesmanDetail.jsx`
**Route:** `/salesmen/:id` (admin-only)

**Features:**
- Allocations section with reconciliation status badges
- Pre-EOD: edit allocation qty/price inline
- Post-EOD: admin can open "Edit Reconciliation" modal to correct `sold_qty` / `collected_amount`
- Sales list with due payment collection interface
- Customer dues tracking per allocation
- Period selector (today, week, month, custom)

---

### `SalesmanDashboard.jsx` — Salesman Dashboard

**File:** `resources/js/pages/SalesmanDashboard.jsx`
**Route:** `/dashboard` (salesman-only)

**Features:**
- Shows urgent EOD reminder banner after 7 PM if allocations are unreconciled
- Quick navigation to `/eod` page
- Today's sales summary with allocation status indicators

---

## 9. Frontend Services & Hooks

### `salesmanService.js`

**File:** `resources/js/services/salesmanService.js`

```javascript
salesmanService.getById(id)
// GET /api/v1/salesmen/{id}
// Returns: { salesman, stats, pending_collections }

salesmanService.reconcile(allocId, { sold_qty, collected_amount })
// POST /api/v1/allocations/{allocId}/reconcile

salesmanService.updateReconcile(allocId, { sold_qty, collected_amount })
// PUT /api/v1/allocations/{allocId}/reconcile

salesmanService.allocate(salesmanId, { cylinder_id, qty, sale_price, allocation_date })
// POST /api/v1/salesmen/{salesmanId}/allocate

salesmanService.updateAllocation(allocId, { qty, sale_price })
// PUT /api/v1/allocations/{allocId}
```

---

### `saleService.js`

**File:** `resources/js/services/saleService.js`

```javascript
saleService.payBalance(saleId, { amount, collection_date, notes })
// POST /api/v1/sales/{saleId}/pay
```

---

### `useAllocation.js`

**File:** `resources/js/hooks/useAllocation.js`

```javascript
const {
  salesmen,          // list of salesmen with allocations (admin view)
  cylinders,         // cylinder catalog
  reconcile,         // mutation: POST reconcile
  updateReconcile,   // mutation: PUT reconcile (admin)
} = useAllocation();
```

Query keys:
- `['salesmen', viewDate]` → admin allocation list
- `['cylinders']` → cylinder catalog
- `['my-allocations', user.id]` → salesman EOD page

---

### React Router Routes

**File:** `resources/js/router/index.jsx`

```jsx
<Route path="eod"        element={<SalesmanRoute><EndOfDay /></SalesmanRoute>} />
<Route path="allocation" element={<AdminRoute><Allocation /></AdminRoute>} />
<Route path="salesmen/:id" element={<AdminRoute><SalesmanDetail /></AdminRoute>} />
<Route path="dashboard"  element={<SalesmanRoute><SalesmanDashboard /></SalesmanRoute>} />
```

---

## 10. Console Commands

### `notify:unreconciled`

**File:** `app/Console/Commands/SendUnreconciledNotifications.php`

```bash
php artisan notify:unreconciled
```

**Logic:**
1. Finds all `StockAllocation` records where `allocation_date = today` and `is_reconciled = false`
2. Groups by `salesman_id`
3. For each salesman with unreconciled allocations, notifies all admin users
4. Intended to run via scheduler at end of business day (e.g., `18:00`)

**Schedule (in `app/Console/Kernel.php`):**
```php
$schedule->command('notify:unreconciled')->dailyAt('18:00');
```

---

## 11. Business Rules & Edge Cases

### Validation Rules

| Rule | Where enforced |
|------|---------------|
| `sold_qty ≤ allocation.qty` | `SalesmanController::reconcile()` (422 if violated) |
| Cannot reconcile twice | `AllocationService::reconcile()` throws `LogicException` |
| Cannot edit reconciled allocation (salesman) | `SalesmanController::updateAllocation()` rejects if `is_reconciled = true` |
| Admin can only call `updateReconcile` on an already-reconciled allocation | `SalesmanController::updateReconcile()` (422 if not yet reconciled) |
| Salesman can only access own allocations | `SalesmanController::show()` / `dailyCollections()` — 403 otherwise |

### FIFO Allocation Consumption

When a salesman makes a sale, sold qty is consumed from their **oldest unreconciled allocation first**. This ensures:
- Carry-over stock from previous days is used before today's allocation
- `sold_qty` on each allocation accurately reflects what was actually consumed from it

### Pool-Based Cash Attribution

Cash collected at sale time is split proportionally across allocations consumed in the same sale:

```
cashForAllocation = paidAmount × (lineRevenue / saleTotal)
```

This means if a sale covers two cylinder types, the cash is not split 50/50 — it's split by each line's revenue weight. The EOD form pre-fills with this server-computed value (`cash_collected_actual`).

### Due Collection Sweep

At EOD, **all** `DueCollection` records for the salesman where `reconciled_allocation_id IS NULL` are linked to the current allocation — even if they came from different sales on different days. This creates a clean per-cycle accountability record.

### Unsold Cylinder Auto-Return

The controller computes `returnedQty = allocation.qty - sold_qty` automatically. The service further calculates `unsold = max(0, qty - sold_qty - returnedQty)` as a safety net for any rounding edge cases. Both are returned to warehouse as filled stock.

### Empty Shells from Customers

`CylinderReturn` records (empty shells returned by customers) are tracked separately and are **not** double-counted in the `eod_return` movement. They add to `empty_qty` independently.

### Admin Post-EOD Correction

When admin changes `sold_qty` after reconciliation:
- Warehouse `filled_qty` is adjusted by the delta
- A `reconcile_adjustment` movement is recorded for audit trail
- `returned_qty` is recalculated as `allocation.qty - new_sold_qty`
- `collected_amount` is updated to the admin-provided value

---

## 12. File Reference Map

| Type | File Path |
|------|-----------|
| **Routes** | `routes/api.php` |
| **Controller** | `app/Http/Controllers/Api/V1/SalesmanController.php` |
| **Controller** | `app/Http/Controllers/Api/V1/SaleController.php` |
| **Controller** | `app/Http/Controllers/Api/V1/StockController.php` |
| **Service** | `app/Services/AllocationService.php` |
| **Service** | `app/Services/SaleService.php` |
| **Service** | `app/Services/ReportService.php` |
| **Service** | `app/Services/DashboardService.php` |
| **Service** | `app/Services/StockMovementService.php` |
| **Service** | `app/Services/StockService.php` |
| **Model** | `app/Models/StockAllocation.php` |
| **Model** | `app/Models/DueCollection.php` |
| **Model** | `app/Models/StockMovement.php` |
| **Model** | `app/Models/Sale.php` |
| **Model** | `app/Models/SaleItem.php` |
| **Model** | `app/Models/CylinderStock.php` |
| **Model** | `app/Models/AuditLog.php` |
| **Console Command** | `app/Console/Commands/SendUnreconciledNotifications.php` |
| **Migration** | `database/migrations/2026_05_30_050609_create_stock_allocations_table.php` |
| **Migration** | `database/migrations/2026_05_30_050610_create_due_collections_table.php` |
| **Migration** | `database/migrations/2026_06_02_000001_create_stock_movements_table.php` |
| **Migration** | `database/migrations/2026_06_04_075436_add_reconciled_allocation_id_to_due_collections.php` |
| **Frontend Page** | `resources/js/pages/EndOfDay.jsx` |
| **Frontend Page** | `resources/js/pages/Allocation.jsx` |
| **Frontend Page** | `resources/js/pages/SalesmanDetail.jsx` |
| **Frontend Page** | `resources/js/pages/SalesmanDashboard.jsx` |
| **Frontend Service** | `resources/js/services/salesmanService.js` |
| **Frontend Service** | `resources/js/services/saleService.js` |
| **Frontend Hook** | `resources/js/hooks/useAllocation.js` |
| **Router** | `resources/js/router/index.jsx` |
