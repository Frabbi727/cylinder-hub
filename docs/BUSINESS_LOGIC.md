# CylinderHub — Business Logic & Calculations

## Overview

CylinderHub manages the distribution of LPG cylinders from warehouse → salesman → customer.
The system tracks stock, sales, payments, dues, and reconciliation in real time.

---

## Roles

| Role | Access |
|------|--------|
| `admin` | Full access — all salesmen, all customers, all reports |
| `salesman` | Own customers, own sales, own dues, own EOD only |

A salesman **cannot** see another salesman's customers, sales, or dues.

---

## Core Business Flow

```
Admin Purchases Stock → Admin Allocates to Salesman
       ↓
Salesman Sells to Customer (full cash / partial / due later)
       ↓
Customer Pays Due (optional, later)
       ↓
Salesman Reconciles at End of Day (EOD)
       ↓
Admin Reviews & Reports
```

---

## 1. Stock & Inventory

### Cylinder Types
Each cylinder has: `name`, `size`, `sale_price` (set at allocation), `reorder_level`, `capacity`.
Stock is tracked separately per cylinder type.

### Stock Levels
| Field | Meaning |
|-------|---------|
| `filled_qty` | Cylinders filled and ready to sell (warehouse) |
| `empty_qty` | Empty bottles collected back |
| `with_salesman_qty` | Allocated to salesmen, not yet returned or reconciled |
| `total_filled_qty` | `filled_qty + with_salesman_qty` |

### Stock Movement
- **Purchase received** → `filled_qty` increases
- **Allocated to salesman** → `filled_qty` decreases, `with_salesman_qty` increases
- **Salesman makes a sale** → `sold_qty` on allocation increases (warehouse not touched again)
- **Salesman returns unsold** → `returned_qty` on allocation increases, `filled_qty` restores
- **Customer returns empty** → `empty_qty` increases

---

## 2. FIFO Cost Tracking

Every purchase lot is tagged with `unit_cost`. When a sale is made:
- Oldest purchase lot is consumed first (FIFO)
- `unit_cost` stored on each `SaleItem` for exact profit calculation
- `profit = (unit_price − unit_cost) × qty` per lot consumed

**This means:** Profit is always calculated against the actual purchase cost, not an average.

---

## 3. Allocation

Admin allocates cylinders to a salesman before their working day.

### Allocation Fields
| Field | Type | Description |
|-------|------|-------------|
| `qty` | int | Total cylinders allocated |
| `sale_price` | decimal | Selling price per unit for this batch |
| `sold_qty` | int | How many have been sold (auto-updated on each sale) |
| `returned_qty` | int | Unsold cylinders returned at EOD |
| `collected_amount` | decimal | Cash collected from sales (pro-rated at sale time) |
| `is_reconciled` | boolean | Whether EOD has been submitted for this allocation |

### Computed Fields
```
with_salesman = qty − sold_qty − returned_qty   (still in salesman's hands)
sold_pct      = (sold_qty / qty) × 100          (sell-through rate %)
```

### FIFO Allocation Consumption
When a salesman sells, the system consumes allocations **oldest first**:
- If Alloc A (older) has remaining capacity → fill from A first
- Spillover goes to Alloc B (newer)
- `sold_qty` is incremented per allocation

---

## 4. Sales

### Payment Types
| Type | Meaning |
|------|---------|
| `cash` | `paid_amount = total_amount` — fully paid |
| `partial` | `paid_amount > 0` and `paid_amount < total_amount` |
| `due` | `paid_amount = 0` — nothing paid at sale time |

### Due Amount
```
due_amount = total_amount − paid_amount
```
This is a **computed field**, not stored. It is always current.

### Customer Due Tracking
When a partial or due sale is recorded:
```
Customer.total_due += (total_amount − paid_amount)
```
When a payment is collected later (via DueCollection):
```
Customer.total_due −= amount_paid
Sale.paid_amount   += amount_paid
```

### Sale Item Profit
Per sale item (per FIFO lot consumed):
```
profit = (unit_price − unit_cost) × qty
```

### Allocation Cash Attribution
When a sale is created, the cash paid is distributed across allocations proportionally:
```
proportion       = (take_qty × unit_price) / total_sale_amount
cash_for_alloc   = paid_amount × proportion
alloc.collected_amount += cash_for_alloc
```
This ensures each allocation knows exactly how much cash it generated.

---

## 5. Due Collections

A `DueCollection` record is created every time a customer pays a due amount after the original sale.

### Fields
| Field | Description |
|-------|-------------|
| `customer_id` | Which customer paid |
| `sale_id` | Which sale this payment is for |
| `collected_by` | Salesman who collected the cash |
| `amount` | Amount collected |
| `collection_date` | Date of collection |
| `reconciled_allocation_id` | Set when swept into an EOD cycle (null = pending) |

### Pending vs Reconciled
- **Pending** (`reconciled_allocation_id IS NULL`): Cash collected but not yet handed in via EOD
- **Reconciled**: Swept into a past EOD submission

---

## 6. End of Day (EOD) Reconciliation

At end of working day, the salesman submits how many cylinders they sold and how much cash they collected for each allocation.

### What Gets Submitted
```
sold_qty          → actual units sold (may differ from system-recorded if corrections needed)
collected_amount  → total cash being handed in for this allocation
returned_qty      → automatically = qty − sold_qty (unsold go back to warehouse)
```

### Cash Accountability Calculation
```
salesCashToday      = Σ(sale.paid_amount) − Σ(DueCollections on today's sales)
pendingDueCollections = Σ(DueCollection.amount where reconciled_allocation_id IS NULL)

Total Cash to Hand In = salesCashToday + pendingDueCollections
```

### Cash Pool Attribution (for display)
The system shows "Customers paid" per allocation using a pool approach:
1. Build pool per cylinder type = sale-time cash only (excludes "due later" payments)
2. Process allocations oldest-first
3. Reconciled allocations drain by their `collected_amount` (actual, not expected)
4. Unreconciled allocations use `collected_amount` if set, else remaining pool

### After Reconciliation
- `allocation.returned_qty` = `qty − sold_qty`
- `allocation.is_reconciled` = `true`
- Returned cylinders → `warehouse.filled_qty` increases
- Pending due collections → linked to this allocation (`reconciled_allocation_id` set)

---

## 7. Profit & Loss (Admin)

### Gross Profit
```
Revenue       = Σ(Sale.total_amount)
COGS          = Σ(SaleItem.unit_cost × SaleItem.qty)
Gross Profit  = Revenue − COGS
Gross Margin% = (Gross Profit / Revenue) × 100
```

### Net Profit
```
Total Expenses = Σ(Expense.amount) by category (transport, salary, rent, utility, other)
Net Profit     = Gross Profit − Total Expenses
Net Margin%    = (Net Profit / Revenue) × 100
```

### Inventory Value
```
Inventory Value = Σ(PurchaseItem.remaining_qty × PurchaseItem.unit_cost)
                  for all active/pending FIFO lots
```

### Net Business Position
```
Net Position = Customer.total_due (all customers) + Inventory Value − Supplier.total_due
```
This is "if you collected all dues and sold all stock at cost, this is what you'd have."

---

## 8. Cash Flow

```
Cash In  = Sales collected at sale time + Due Collections in period
Cash Out = Supplier payments + Expenses paid
Net Cash = Cash In − Cash Out
```

---

## 9. Salesman Performance Metrics

```
Sell-through Rate    = sold_qty / allocated_qty × 100
Collection Rate %    = total_dues_collected / total_dues_created × 100
Today's Profit       = Σ(SaleItem.profit) for salesman's today sales
Cash in Hand         = salesCashToday + pendingDueCollections
Still Outstanding    = max(0, total_dues_created − total_dues_collected)
```

---

## 10. Empty Cylinder Returns

When a customer returns empty cylinders:
- A `CylinderReturn` record is created with `type = empty_return`
- `warehouse.empty_qty` increases
- If `is_extra = true` → needs admin verification (extra_reason required)

### Extra Return Reasons
| Code | Meaning |
|------|---------|
| `old_stock` | Old stock from customer |
| `neighbour` | Collected from neighbour |
| `competitor` | Competitor's cylinder |
| `salesman_handover` | Transferred from another salesman |
| `other` | Other reason |

### Empty Balance per Customer
```
pending_qty = sold_qty (all time) − returned_qty (verified returns)
```

---

## 11. Overdue Dues

A sale is considered overdue when `DATEDIFF(today, sale_date) >= N days` and `due_amount > 0`.

The overdue list is scoped to the authenticated salesman's customers.

---

## 12. Key Business Rules

1. **Salesman isolation** — A salesman sees only their own customers and data
2. **Admin oversight** — Admin sees all salesmen, all customers, all financials
3. **FIFO strictly enforced** — Cost is calculated against oldest purchase lot first
4. **Allocation capacity** — A salesman cannot sell more than their unreconciled allocation balance
5. **EOD is final** — Once reconciled, only admin can edit
6. **Due collections are separate** — Cash from due payments is tracked separately from sale-time cash to avoid double-counting
7. **Customer dues accumulate** — `Customer.total_due` is a running balance, decremented on each payment
