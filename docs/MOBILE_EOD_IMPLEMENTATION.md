# Mobile App — Salesman EOD Implementation Guide

Complete screen-by-screen specification for building the End of Day reconciliation feature in the CylinderHub salesman mobile app (React Native / Expo).

---

## Table of Contents

1. [Tech Stack & Setup](#1-tech-stack--setup)
2. [API Reference (EOD)](#2-api-reference-eod)
3. [Data Structures](#3-data-structures)
4. [All Calculations Explained](#4-all-calculations-explained)
5. [Navigation Flow](#5-navigation-flow)
6. [Screen: End of Day — Main](#6-screen-end-of-day--main)
7. [Screen: EOD — Reconcile Form (per allocation)](#7-screen-eod--reconcile-form-per-allocation)
8. [Screen: EOD — Confirmation Step](#8-screen-eod--confirmation-step)
9. [Screen: EOD — All Done](#9-screen-eod--all-done)
10. [Screen: Dashboard EOD Banner](#10-screen-dashboard-eod-banner)
11. [Colors & Styles](#11-colors--styles)
12. [Component Breakdown](#12-component-breakdown)
13. [State Management](#13-state-management)
14. [Error Handling](#14-error-handling)

---

## 1. Tech Stack & Setup

### Recommended Stack

```
React Native (Expo)
├── Navigation:    @react-navigation/native + @react-navigation/bottom-tabs + @react-navigation/stack
├── HTTP:          axios
├── Server State:  @tanstack/react-query
├── Storage:       expo-secure-store  (replace localStorage)
└── Icons:         @expo/vector-icons (Feather / Lucide)
```

### API Base Setup

```javascript
// services/api.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: 'https://your-domain.com/api/v1',
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      try {
        const res = await axios.post('/auth/refresh', {}, {
          headers: { Authorization: `Bearer ${refreshToken}` }
        });
        await SecureStore.setItemAsync('access_token', res.data.data.access_token);
        await SecureStore.setItemAsync('refresh_token', res.data.data.refresh_token);
        // Retry original request
        error.config.headers.Authorization = `Bearer ${res.data.data.access_token}`;
        return api.request(error.config);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // navigate to login
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 2. API Reference (EOD)

### Load EOD Data

```
GET /api/v1/salesmen/{userId}
Authorization: Bearer {access_token}
```

This is the **single source of truth** for the EOD screen. It returns allocations, stats, and pending collections in one call.

**Full Response:**
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
          "allocation_date": "2026-06-05",
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
            "color1": "#2BB3C0",
            "color2": "#0E7B86"
          }
        }
      ]
    },
    "stats": {
      "total_allocated": 30,
      "total_sold": 10,
      "total_returned": 0,
      "total_remaining": 20,
      "cash_collected": 14000.00,
      "today_total_sales_amount": 24000.00,
      "today_due_amount": 10000.00,
      "pending_due_collections": 5000.00,
      "total_cash_to_hand_in": 19000.00,
      "total_outstanding_dues": 10000.00,
      "today_profit": 6000.00
    },
    "pending_collections": [
      {
        "id": 3,
        "amount": "5000.00",
        "collection_date": "2026-06-05",
        "customer": { "id": 3, "name": "Rahim", "phone": "01700-111222" },
        "sale": { "id": 10, "sale_date": "2026-06-04", "total_amount": "24000.00" }
      }
    ]
  }
}
```

---

### Submit EOD Reconciliation

```
POST /api/v1/allocations/{allocationId}/reconcile
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "sold_qty": 10,
  "collected_amount": 14000.00
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| `sold_qty` | required · integer · min:0 · max: allocation.qty |
| `collected_amount` | required · decimal · min:0 |

**Success Response 200:**
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

**Error — already reconciled 422:**
```json
{ "success": false, "message": "This allocation has already been reconciled." }
```

**Error — sold_qty exceeds allocated 422:**
```json
{ "success": false, "message": "Sold (35) cannot exceed allocated quantity (30)." }
```

---

## 3. Data Structures

### Allocation Object (from GET /salesmen/{userId})

```typescript
interface Allocation {
  id: number;
  allocation_date: string;           // "YYYY-MM-DD"
  qty: number;                       // Total allocated to salesman
  sale_price: string;                // e.g. "2400.00" — price per unit
  sold_qty: number;                  // System-tracked from sales
  returned_qty: number;              // Returned after reconciliation
  collected_amount: string;          // Cash collected so far
  is_reconciled: boolean;            // false = pending EOD
  with_salesman: number;             // qty - sold_qty - returned_qty
  sold_pct: number;                  // Sell-through %
  cash_collected_actual: number;     // Server-computed actual cash
  due_from_sales: number;            // Credit given to customers
  customer_dues: Array<{
    customer: string;
    due_amount: number;
  }>;
  cylinder: {
    id: number;
    name: string;
    size: string;
    color1: string;
    color2: string;
  };
}
```

### Stats Object

```typescript
interface Stats {
  total_allocated: number;
  total_sold: number;
  total_returned: number;
  total_remaining: number;
  cash_collected: number;            // Sale-time cash only
  today_total_sales_amount: number;
  today_due_amount: number;
  pending_due_collections: number;   // Due payments collected, not yet swept
  total_cash_to_hand_in: number;     // cash_collected + pending_due_collections
  total_outstanding_dues: number;    // All unpaid from your customers
  today_profit: number;
}
```

### Pending Collection Object

```typescript
interface PendingCollection {
  id: number;
  amount: string;
  collection_date: string;
  customer: { id: number; name: string; phone: string };
  sale: { id: number; sale_date: string; total_amount: string };
}
```

---

## 4. All Calculations Explained

These are the EXACT calculations used in the web app. Implement identically.

### A. Auto-Return Calculation (display only)

```
returned_to_warehouse = allocation.qty - entered_sold_qty
```

Never sent to the API. `returned_qty` is calculated server-side. Show this to salesman in the form.

Example:
- Allocated: 30
- Salesman enters sold: 22
- Display: "Return to warehouse: 8"

---

### B. Expected Cash Calculation

```
expected_cash = entered_sold_qty × allocation.sale_price
```

Used as a reference hint only — not enforced. Salesman may have given partial credit.

Example:
- Sold: 22 units
- Price: ৳2,400/pcs
- Expected full cash: ৳52,800

---

### C. Cash Pre-fill Logic (form initial value)

```javascript
const initCash = allocation.collected_amount > 0
  ? parseFloat(allocation.collected_amount)
  : (allocation.cash_collected_actual ?? (allocation.sold_qty * parseFloat(allocation.sale_price)));
```

Priority:
1. Use `collected_amount` if it's > 0 (already tracked from sales)
2. Fallback to `cash_collected_actual` (server-computed actual)
3. Last resort: `sold_qty × sale_price`

---

### D. Cash Auto-update When Salesman Changes Sold Qty

When salesman types a new `sold_qty`, auto-update the `collected_amount` field maintaining the actual collection ratio:

```javascript
const handleSoldQtyChange = (newQty) => {
  const origSold   = allocation.sold_qty ?? 0;
  const origExpected = origSold * parseFloat(allocation.sale_price ?? 0);
  const origActual   = parseFloat(allocation.cash_collected_actual ?? origExpected);

  // Preserve the actual collection ratio (e.g. 74% paid = 74% applies to new qty)
  const ratio = origExpected > 0 ? origActual / origExpected : 1;
  const newCash = Math.round(newQty * parseFloat(allocation.sale_price ?? 0) * ratio * 100) / 100;

  setSoldQty(newQty);
  setCollectedAmount(newCash.toFixed(2));
};
```

---

### E. Cash Shortfall Warning

```javascript
const expectedFullCash = entered_sold_qty * parseFloat(allocation.sale_price);
const shortfall = expectedFullCash - entered_collected_amount;
const hasShortfall = shortfall > 0.01;
```

If `hasShortfall`:
- Show: `"Cash (৳X) is less than expected (৳Y). The difference of ৳Z will remain as customer dues."`
- This is a warning only, not a blocker.

---

### F. Cash Accountability Card Totals (top of EOD screen)

```
From today's sales       = stats.cash_collected
Today's dues             = stats.today_due_amount
Pending due collections  = stats.pending_due_collections
Total cash to hand in    = stats.total_cash_to_hand_in
                         = stats.cash_collected + stats.pending_due_collections
Outstanding (your customers) = stats.total_outstanding_dues
```

**All values come directly from the API `stats` object. Do not recalculate locally.**

---

### G. Per-Allocation Summary Display

```
Allocated       = allocation.qty
Sold (system)   = allocation.sold_qty
Price/pcs       = allocation.sale_price  (formatted as ৳X,XXX)
Customers paid  = allocation.cash_collected_actual  (cash from sales)
Due (credit)    = allocation.due_from_sales
With you now    = allocation.with_salesman = qty - sold_qty - returned_qty
```

---

### H. All Done — Final Totals

After all allocations are reconciled, compute from the fresh API data (re-fetch after last reconcile):

```
Total Sold     = sum of all allocation.sold_qty  (reconciled)
Total Returned = sum of all allocation.returned_qty  (reconciled)
Cash collected = stats.cash_collected
Today's dues   = stats.today_due_amount
Total to hand in = stats.total_cash_to_hand_in
```

---

## 5. Navigation Flow

```
Bottom Tab: "End of Day" (Moon icon)
    │
    └── EodScreen (main list)
         ├── [if no allocations]    → Empty state
         ├── [if all reconciled]    → AllDoneScreen
         └── [per allocation card]
               └── [tap "Reconcile"] → inline expanded form OR modal
                     └── [tap "Review & Submit →"] → ConfirmationStep
                           ├── [tap "← Back"]     → back to form
                           └── [tap "Confirm & Submit"]
                                 ├── success → re-fetch → collapse form
                                 └── error   → show error message
```

**Screen name:** `EndOfDay`
**Nav label:** `End of Day`
**Nav icon:** Moon

---

## 6. Screen: End of Day — Main

**Page title:** `End of Day`
**Sub-title:** `Thursday, June 5, 2026` (dynamic day + date)

---

### 6.1 Warning Banner (always shown)

```
┌─────────────────────────────────────────────────────┐
│ ℹ Reconcile each allocation by confirming sold qty, │
│   empty returns, and cash collected.                │
│   This cannot be undone.                            │
└─────────────────────────────────────────────────────┘
```

Background: `#FFF8E1` · Border-left: 4px amber · Icon: `AlertCircle` amber

---

### 6.2 Overdue Banner (only if unreconciled allocations from previous days exist)

```
┌─────────────────────────────────────────────────────┐
│ ⚠ Overdue: You have unreconciled allocations from  │
│   previous days. Please reconcile them below.      │
└─────────────────────────────────────────────────────┘
```

Background: `#FFF3F3` · Border-left: 4px red · Icon: `AlertCircle` red

Detection: any `allocation.allocation_date < today AND allocation.is_reconciled === false`

---

### 6.3 Cash Accountability Card

```
┌─────────────────────────────────────────────────────┐
│  Today's Cash Accountability                        │
│─────────────────────────────────────────────────────│
│  From today's cylinder sales       ৳14,000         │
│  Today's dues (to collect later)   ৳10,000         │
│  Pending due collections (1)        ৳5,000         │
│  ──────────────────────────────────────────         │
│  Total cash to hand in             ৳19,000  ←bold  │
│                                                     │
│  ⚠ Your outstanding (your customers only) ৳10,000  │
│                                                     │
│  [View 1 pending collection(s) to submit →]         │
└─────────────────────────────────────────────────────┘
```

**Field mapping:**

| UI Label | API Field |
|----------|-----------|
| From today's cylinder sales | `stats.cash_collected` |
| Today's dues (to collect later) | `stats.today_due_amount` |
| Pending due collections (N) | `stats.pending_due_collections` · N = `pending_collections.length` |
| Total cash to hand in | `stats.total_cash_to_hand_in` |
| Your outstanding | `stats.total_outstanding_dues` |

The "View N pending collection(s)" link expands a collapsible list of `pending_collections`:

```
  ┌─────────────────────────────────────────────────────┐
  │ Rahim · Sale #10 · Jun 4        ৳5,000             │
  └─────────────────────────────────────────────────────┘
```

Hide this link if `pending_collections.length === 0`.

---

### 6.4 Allocation Card (one per allocation)

```
┌─────────────────────────────────────────────────────┐
│  [Color bar] Omera 12 kg                            │
│              ⚠ From Jun 3  (if overdue)             │
│  ─────────────────────────────────────────────────  │
│  Allocated   Sold     To Return                     │
│  30 pcs      10 pcs   20 pcs                        │
│  ─────────────────────────────────────────────────  │
│                              [Reconcile]            │
└─────────────────────────────────────────────────────┘
```

**When reconciled:**

```
┌─────────────────────────────────────────────────────┐
│  [Color bar] Omera 12 kg          ✅ Reconciled     │
│  ─────────────────────────────────────────────────  │
│  Allocated   Sold      Returned                     │
│  30 pcs      10 pcs    20 pcs                       │
└─────────────────────────────────────────────────────┘
```

**Field mapping:**

| UI Label | Value | Color |
|----------|-------|-------|
| Allocated | `allocation.qty` | gray |
| Sold | `allocation.sold_qty` | green `#176B3A` |
| To Return (pending) | `allocation.qty - allocation.sold_qty - allocation.returned_qty` | amber |
| Returned (reconciled) | `allocation.returned_qty` | amber |

**Left color bar:** gradient from `allocation.cylinder.color1` to `allocation.cylinder.color2`

**Overdue label:** show `"⚠ From [date]"` if `allocation.allocation_date < today`

**Reconcile button:** teal `#0B6E75`, white text. Hidden when `is_reconciled === true`.

---

### 6.5 No Allocations State

```
     No allocations for today.
```

Center text, gray, shown if `allocations.length === 0`.

---

### 6.6 Loading State

```
     Loading allocations...
```

Spinner centered.

---

## 7. Screen: EOD — Reconcile Form (per allocation)

This form expands inline below the allocation card (or opens as a bottom sheet modal on mobile).

**Form title:** `Reconcile: Omera 12 kg` (cylinder name + size)

---

### 7.1 Summary Row (read-only, top of form)

```
┌───────────────────────────────────────────────────────────┐
│  Allocated    Sold       Price/pcs   Customers paid  Due  │
│  30 pcs       10 pcs     ৳2,400      ৳14,000      ৳10,000 │
└───────────────────────────────────────────────────────────┘
```

**Field mapping:**

| UI Label | API Field |
|----------|-----------|
| Allocated | `allocation.qty` |
| Sold (system) | `allocation.sold_qty` |
| Price/pcs | `allocation.sale_price` formatted as `৳X,XXX` |
| Customers paid | `allocation.cash_collected_actual` |
| Due (credit given) | `allocation.due_from_sales` |

---

### 7.2 Input: How many did you sell?

```
Label:       How many did you sell? *
Hint:        Max: 30 · Price: ৳2,400/pcs
Input type:  numeric (integer)
Pre-fill:    allocation.sold_qty
Min:         0
Max:         allocation.qty
```

**Validation:**
- `sold_qty > allocation.qty` → show inline error: `"Cannot exceed allocated (30)."`
- Show in real-time, not just on submit.

---

### 7.3 Input: Cash submitted

```
Label:       Cash submitted ৳ *
Hint:        Collected: ৳14,000 · Due: ৳10,000
Input type:  numeric (decimal)
Pre-fill:    [see Cash Pre-fill Logic §4.C]
Min:         0
```

**Full cash hint** (show when entered cash = expected cash):
```
✓ Full cash: 22 × ৳2,400 = ৳52,800
```

---

### 7.4 Auto-Calculation Boxes (update live as user types)

```
┌──────────────┐  ┌───────────────────────┐  ┌─────────────────────┐
│  Sold ✓      │  │ Return to warehouse   │  │  22 + 8 = 30 ✓      │
│  22 pcs      │  │       8 pcs           │  │  (or ⚠ Exceeds!)    │
│  (green)     │  │     (amber)           │  │  (teal / red)       │
└──────────────┘  └───────────────────────┘  └─────────────────────┘
```

**Calculations:**

```javascript
const sold       = parseInt(soldQtyInput) || 0;
const returned   = Math.max(0, allocation.qty - sold);
const total      = sold + returned;
const overLimit  = sold > allocation.qty;
```

| Box | Content | Color |
|-----|---------|-------|
| Left | `Sold ✓ · [sold] pcs` | Green `#E8F5E9` border `#176B3A` |
| Middle | `Return to warehouse · [returned] pcs` | Amber `#FFF8E1` border `#A85200` |
| Right | `[sold] + [returned] = [total] ✓` OR `⚠ Exceeds limit!` | Teal / Red |

---

### 7.5 Customer Dues List (collapsible, inside form)

If `allocation.customer_dues.length > 0`, show:

```
  Rahim          ৳10,000
  [another customer]  ৳X,XXX
```

Small text, muted color. Helps salesman cross-check.

---

### 7.6 Form Buttons

```
[Cancel]                          [Review & Submit →]
```

- **Cancel:** collapses/closes form. No data submitted.
- **Review & Submit →:** validates, then moves to Confirmation Step (§8).
  - Disable if `sold > allocation.qty` or if inputs are empty.

---

## 8. Screen: EOD — Confirmation Step

Appears as a second step within the same form/modal.

**Title:** `Please confirm before submitting:`

---

### 8.1 Three Summary Boxes

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Cylinders Sold   │  │ Return to        │  │ Cash to Hand In  │
│     22 pcs       │  │  Warehouse       │  │    ৳52,800       │
│    (green)       │  │    8 pcs         │  │    (teal)        │
│                  │  │   (amber)        │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

| Box | Value | Background | Border |
|-----|-------|-----------|--------|
| Cylinders Sold | entered `sold_qty` | `#E8F5E9` | `#176B3A` |
| Return to Warehouse | `allocation.qty - sold_qty` | `#FFF8E1` | `#A85200` |
| Cash to Hand In | entered `collected_amount` | `#E0F2F1` | `#0B6E75` |

---

### 8.2 Under-Cash Warning (conditional)

Show only if `collected_amount < (sold_qty × sale_price)`:

```
┌─────────────────────────────────────────────────────┐
│ ⚠ Cash (৳48,000) is less than expected (৳52,800).  │
│   The difference of ৳4,800 will remain as          │
│   customer dues.                                    │
└─────────────────────────────────────────────────────┘
```

Background `#FFF8E1`, amber text.

---

### 8.3 Pending Dues Note (conditional)

Show only if `stats.pending_due_collections > 0`:

```
  ৳5,000 in pending due collections will also be
  submitted with this EOD.
```

Muted text, small.

---

### 8.4 Outstanding Warning (conditional)

Show only if `stats.total_outstanding_dues > 0`:

```
  Your total outstanding from your customers: ৳10,000.
  Collect over time — this is only your sales.
```

Muted text, small.

---

### 8.5 Final Warning (always shown)

```
  ⚠ This action cannot be undone by you.
    Only admin can edit after submission.
```

Red text, small.

---

### 8.6 Confirmation Buttons

```
[← Back]                          [Confirm & Submit]
                                    (loading: Submitting...)
```

- **← Back:** returns to the form inputs.
- **Confirm & Submit:** calls `POST /allocations/{id}/reconcile`.
  - Disable button while submitting.
  - Show loading spinner on button.

---

## 9. Screen: EOD — All Done

Replaces the allocation list when **all** allocations have `is_reconciled === true`.

```
        ✅

     All Done!

  All allocations reconciled for today.

  ───────────────────────────────
  Total Sold          22 pcs
  Total Returned       8 pcs
  ───────────────────────────────

  Cash Summary
  ───────────────────────────────
  Cylinder sales collected    ৳52,800
  Today's dues (collect later) ৳10,000   (hide if 0)
  ───────────────────────────────
  Total to hand in            ৳52,800

  ⚠ Your outstanding (your customers only): ৳10,000
    (hide if 0)
```

**Field mapping:**

| UI Label | Source |
|----------|--------|
| Total Sold | sum of `allocation.sold_qty` across reconciled allocations |
| Total Returned | sum of `allocation.returned_qty` across reconciled allocations |
| Cylinder sales collected | `stats.cash_collected` |
| Today's dues | `stats.today_due_amount` (hide row if 0) |
| Total to hand in | `stats.total_cash_to_hand_in` |
| Your outstanding | `stats.total_outstanding_dues` (hide row if 0) |

---

## 10. Screen: Dashboard EOD Banner

On the Dashboard screen, after 7 PM, if any allocation has `is_reconciled === false`:

```
┌─────────────────────────────────────────────────────┐
│ ⚠ Reminder: You have unreconciled allocations.     │
│   Please complete End of Day before midnight.      │
│                              [End of Day →]         │
└─────────────────────────────────────────────────────┘
```

Background: `#FFF8E1` · Border: amber · Full width banner below greeting.

```javascript
const showEodReminder = 
  new Date().getHours() >= 19 &&
  allocations.some(a => !a.is_reconciled);
```

The `[End of Day →]` button navigates to the `EndOfDay` tab.

---

### Dashboard Allocation Card (EOD status indicator)

Each allocation on the Dashboard shows reconciliation state:

**Pending:**
```
┌─────────────────────────────────────────────┐
│ [cyan bar] Omera 12 kg                      │
│  Allocated: 30  Sold: 10  With You: 20      │
│                              [Pending EOD]  │
└─────────────────────────────────────────────┘
```

**Reconciled:**
```
┌─────────────────────────────────────────────┐
│ [cyan bar] Omera 12 kg        ✓ Done        │
│  Allocated: 30  Sold: 10  Returned: 20      │
└─────────────────────────────────────────────┘
```

| State | Badge text | Badge color |
|-------|-----------|-------------|
| Not reconciled | Pending EOD | amber |
| Reconciled | ✓ Done | green |

---

## 11. Colors & Styles

### Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#0B6E75` | Buttons, teal boxes, links |
| Success | `#176B3A` | Sold qty, reconciled badge, cash |
| Warning | `#A85200` | Returned qty, amber warnings |
| Danger | `#B83030` | Overdue banner, error text |
| Background | `#F5F7FA` | Screen background |
| Card | `#FFFFFF` | Card backgrounds |
| Border | `#E5E7EB` | Card borders |
| Text Primary | `#111827` | Main text |
| Text Muted | `#6B7280` | Sub-labels |

### Summary Box Styles

```javascript
const styles = {
  greenBox: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#176B3A',
    borderRadius: 8,
    padding: 12,
  },
  amberBox: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#A85200',
    borderRadius: 8,
    padding: 12,
  },
  tealBox: {
    backgroundColor: '#E0F2F1',
    borderWidth: 1,
    borderColor: '#0B6E75',
    borderRadius: 8,
    padding: 12,
  },
  redBox: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#B83030',
    borderRadius: 8,
    padding: 12,
  },
};
```

### Currency Format

```javascript
const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
// TK(14000)   → "৳14,000"
// TK(14000.5) → "৳14,000.5"
```

### Date Format for Header

```javascript
const headerDate = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
// → "Thursday, June 5, 2026"
```

### Allocation Date (overdue check)

```javascript
const today = new Date().toISOString().split('T')[0]; // "2026-06-05"
const isOverdue = allocation.allocation_date < today && !allocation.is_reconciled;
```

---

## 12. Component Breakdown

### `EodScreen` (main)

**Responsibilities:**
- Fetch `GET /salesmen/{userId}` on mount
- Derive `allocations`, `stats`, `pending_collections` from response
- Render loading / empty / done / list states
- Pass each allocation to `AllocationCard`

**React Query hook:**
```javascript
const { data, isLoading, refetch } = useQuery({
  queryKey: ['eod-data', userId],
  queryFn: () => api.get(`/salesmen/${userId}`).then(r => r.data.data),
  staleTime: 30_000,
});
```

---

### `CashAccountabilityCard`

Props: `stats`, `pendingCollections`

Renders the cash accountability summary box (§6.3). Collapsible pending collections list.

---

### `AllocationCard`

Props: `allocation`, `stats`, `onReconciled`

States:
- `idle` — shows summary + Reconcile button
- `form` — shows ReconcileForm expanded
- `confirming` — shows ConfirmationStep
- `done` — shows reconciled summary

```javascript
const [step, setStep] = useState('idle'); // 'idle' | 'form' | 'confirming' | 'done'
const [formValues, setFormValues] = useState({ sold_qty: '', collected_amount: '' });
```

---

### `ReconcileForm`

Props: `allocation`, `onNext(formValues)`, `onCancel`

Handles:
- Input state for `sold_qty` and `collected_amount`
- Live calculation of `returned` and overflow check
- Pre-fill logic on mount
- Auto-update cash when `sold_qty` changes

---

### `ConfirmationStep`

Props: `allocation`, `formValues`, `stats`, `onBack`, `onSubmit`, `isSubmitting`

Handles:
- Renders three summary boxes
- Conditional warnings (shortfall, pending dues, outstanding)
- Submit button with loading state
- Calls API on submit

---

### `AllDoneScreen`

Props: `allocations`, `stats`

Renders the completion state with totals (§9).

---

## 13. State Management

### Query Keys

```javascript
// EOD data (dashboard + EOD screen share this)
queryKey: ['salesman-data', userId]

// Invalidate after successful reconcile:
queryClient.invalidateQueries({ queryKey: ['salesman-data', userId] })
```

### Mutation

```javascript
const reconcileMutation = useMutation({
  mutationFn: ({ allocationId, data }) =>
    api.post(`/allocations/${allocationId}/reconcile`, data).then(r => r.data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['salesman-data', userId] });
    // collapse the form card
    setStep('done');
  },
  onError: (error) => {
    const msg = error.response?.data?.message || 'Reconciliation failed. Please try again.';
    setErrorMessage(msg);
    setStep('form'); // go back to form
  },
});
```

### Per-allocation form state

Keep form state **inside each `AllocationCard` component** (local `useState`). Do not hoist to screen level. This way each allocation's form is independent.

---

## 14. Error Handling

### API Errors

| HTTP Code | Message shown to user |
|-----------|----------------------|
| 422 | Server message from `error.response.data.message` |
| 401 | Automatically handled by interceptor (token refresh / logout) |
| 403 | `"You are not authorized to reconcile this allocation."` |
| 500 | `"Something went wrong. Please try again."` |

### Input Validation (client-side, before API call)

| Condition | Error Message |
|-----------|---------------|
| `sold_qty` empty | `"Please enter how many you sold."` |
| `sold_qty > allocation.qty` | `"Cannot exceed allocated (N)."` |
| `collected_amount` empty | `"Please enter the cash amount."` |
| `collected_amount < 0` | `"Cash cannot be negative."` |

Show errors inline below each input field, in red.

### Network Error

```
  ⚠ Could not connect. Check your internet and try again.
  [Retry]
```

---

## Quick Implementation Checklist

- [ ] `GET /salesmen/{userId}` fetched on EOD screen mount
- [ ] Cash Accountability card shows all 5 rows with correct field mapping
- [ ] Pending collections expandable list works
- [ ] Overdue banner appears when `allocation_date < today`
- [ ] EOD reminder banner appears on Dashboard after 7 PM
- [ ] Each allocation card shows: Allocated · Sold · With You / Returned
- [ ] Reconcile form: sold qty input pre-fills from `sold_qty`
- [ ] Reconcile form: cash input pre-fills using §4.C logic
- [ ] Live auto-return box updates as sold qty changes
- [ ] Cash auto-updates maintaining ratio when sold qty changes
- [ ] Exceeds limit shown in red when `sold > qty`
- [ ] Confirmation step shows 3 summary boxes correctly
- [ ] Under-cash warning shows when `cash < sold × price`
- [ ] Pending dues note shows when `pending_due_collections > 0`
- [ ] `POST /allocations/{id}/reconcile` sends `{ sold_qty, collected_amount }`
- [ ] `returned_qty` is NOT sent — server computes it
- [ ] After success: invalidate query, collapse card to "done" state
- [ ] All Done screen shows after all allocations reconciled
- [ ] Currency formatted as `৳X,XXX` (Bengali Taka sign)
- [ ] Colors match: green sold / amber returned / teal cash
