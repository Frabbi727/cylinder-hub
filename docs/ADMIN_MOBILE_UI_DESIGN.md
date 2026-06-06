# CylinderHub Admin Mobile App — UI/UX Design Guide

> This document describes every screen, component, and user flow for the admin mobile app.
> Use this alongside `ADMIN_API_REFERENCE.md` which defines all the data and endpoints.

---

## Table of Contents

1. [App Overview & Design Principles](#1-app-overview--design-principles)
2. [Navigation Architecture](#2-navigation-architecture)
3. [Authentication Screens](#3-authentication-screens)
4. [Dashboard Screen](#4-dashboard-screen)
5. [Cylinder Management](#5-cylinder-management)
6. [Stock & Inventory Screens](#6-stock--inventory-screens)
7. [Refill Order Screens](#7-refill-order-screens)
8. [Purchase Management Screens](#8-purchase-management-screens)
9. [Supplier Management Screens](#9-supplier-management-screens)
10. [Sales Screens](#10-sales-screens)
11. [Customer Management Screens](#11-customer-management-screens)
12. [Salesman Management Screens](#12-salesman-management-screens)
13. [Allocation Management Screens](#13-allocation-management-screens)
14. [Cylinder Returns Screens](#14-cylinder-returns-screens)
15. [Expense & Budget Screens](#15-expense--budget-screens)
16. [Reports Screens](#16-reports-screens)
17. [Notification Screen](#17-notification-screen)
18. [Audit Log Screen](#18-audit-log-screen)
19. [Settings & Profile](#19-settings--profile)
20. [Shared Components](#20-shared-components)
21. [Color Palette & Typography](#21-color-palette--typography)

---

## 1. App Overview & Design Principles

### Business Context
CylinderHub is an LPG cylinder distribution business. The admin:
- Manages warehouse stock (buys from suppliers, sends for refill, allocates to salesmen)
- Tracks salesmen performance (allocations, EOD reconciliation, due collections)
- Manages customer relationships and outstanding dues
- Runs financial reports (P&L, cash flow, purchases)
- Records and monitors all expenses

### Design Principles
- **Data-dense but scannable** — this is a business ops tool, not a consumer app. Show numbers prominently.
- **Color-coded status** — green = good/paid/active, orange = partial/pending/warning, red = due/low stock/inactive
- **Bangladeshi context** — amounts in BDT (৳ symbol), phone numbers in BD format, Bangla names are common
- **Offline resilience** — show cached data with a "stale" indicator when offline
- **One-handed use** — bottom nav + FAB for the most common actions

### Key Colors
| Meaning | Color |
|---------|-------|
| Success / Paid | `#22c55e` (green-500) |
| Warning / Partial | `#f59e0b` (amber-500) |
| Danger / Due / Low | `#ef4444` (red-500) |
| Info / Primary | `#3b82f6` (blue-500) |
| Neutral | `#6b7280` (gray-500) |

---

## 2. Navigation Architecture

### Bottom Navigation (5 tabs — always visible)
```
[ Dashboard ] [ Sales ] [ Stock ] [ Salesmen ] [ More ]
```

| Tab | Icon | Destination |
|-----|------|-------------|
| Dashboard | Home icon | Main KPI overview |
| Sales | Receipt icon | Sales list + create |
| Stock | Warehouse icon | Stock levels + refills |
| Salesmen | Users icon | Salesman list |
| More | Grid icon | Opens "More Menu" drawer |

### More Menu (opens as bottom sheet or drawer)
Grouped list of all other sections:
- **Customers** — list + create + overdue
- **Purchases** — supplier purchases list
- **Suppliers** — supplier CRUD
- **Expenses** — expense recording + budgets
- **Reports** — P&L, cashflow, cylinder flow, purchase report
- **Cylinders** — cylinder CRUD
- **Returns** — cylinder return log
- **Audit Logs** — system audit trail
- **Notifications** — with unread badge
- **Profile / Settings**

### Stack Navigation (within each tab)
Each tab has its own navigation stack. Deep links go back to the tab's root on back press.

---

## 3. Authentication Screens

### 3.1 Splash Screen
- Full screen with company logo centered
- Brand background color
- Auto-redirects to Login (if no token) or Dashboard (if valid token stored)
- Duration: ~1.5 seconds, then checks token validity via `GET /auth/me`

---

### 3.2 Login Screen
**Route:** `/login`
**API:** `POST /v1/auth/login`

**Layout:**
```
┌─────────────────────────────┐
│                             │
│      [Company Logo]         │
│      CylinderHub Admin      │
│                             │
│  ┌─────────────────────┐    │
│  │ Email               │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ Password         👁 │    │
│  └─────────────────────┘    │
│                             │
│  [      LOGIN BUTTON     ]  │
│                             │
│  (loading spinner shown     │
│   during API call)          │
│                             │
└─────────────────────────────┘
```

**Behavior:**
- Email field: keyboard type = email, auto-lowercase
- Password field: hidden by default, toggle visibility icon
- LOGIN button: disabled while loading
- On success: store `access_token` + `refresh_token` in secure storage, navigate to Dashboard
- On error: show inline error message below the button ("Invalid credentials")
- Show error if `role !== 'admin'` — "This app is for admins only"

---

## 4. Dashboard Screen

**Route:** `/dashboard`
**API:** `GET /v1/dashboard?period=today`

### Header
- App name left + avatar initials right (tappable → Profile screen)
- Unread notification bell icon with red badge count (tappable → Notifications)
- Period selector pills below header: `Today | Week | Month | Custom`

### Summary Cards Row (horizontal scroll, 2 rows of 2 cards each)

**Row 1:**
| Card | Value | Color |
|------|-------|-------|
| Today's Sales | `৳ today_sales_amount` | Blue |
| Today's Profit | `৳ today_profit` | Green |
| Customer Due | `৳ customer_due` | Red |
| Supplier Due | `৳ supplier_due` | Orange |

**Row 2:**
| Card | Value | Label |
|------|-------|-------|
| Warehouse Stock | `warehouse_stock units` | Filled cylinders in warehouse |
| With Salesmen | `total_with_salesman units` | Units currently out |
| Monthly Expenses | `৳ monthly_expenses` | This month |
| Net Position | `৳ net_position` | Inventory - dues |

Each card:
```
┌──────────────────┐
│  [Icon]          │
│  ৳ 50,000        │
│  Today's Sales   │
└──────────────────┘
```
- Tappable — navigates to the relevant detail screen
- `customer_due` → Customers Overdue screen
- `supplier_due` → Suppliers list with dues filter
- `warehouse_stock` → Stock screen
- `monthly_expenses` → Expenses screen (current month)

---

### Weekly Chart Section
- Title: "Last 7 Days Sales"
- Bar chart — X-axis: day labels (Mon, Tue...), Y-axis: BDT amounts
- Bars colored `#3b82f6`
- Tap a bar → shows exact amount in tooltip
- Data from `weekly_chart` array

---

### Live Stock Section
- Title: "Current Stock" with "View All →" link
- Horizontal scroll list of cylinder stock cards

Each card:
```
┌────────────────────────┐
│ [color swatch] 12.5 KG │
│ Filled: 150  Empty: 40 │
│ ████████░░ 75%         │
│ [⚠ Low Stock] if below │
│ reorder_level          │
└────────────────────────┘
```
- Red "Low Stock" badge if `filled_qty < reorder_level`
- Capacity bar = `filled_qty / capacity * 100`

---

### Recent Sales Section
- Title: "Recent Sales" with "View All →" link
- List of last 5 sales

Each row:
```
[Customer Avatar] John Doe         ৳ 5,000
                  Rahim • cash     Today 2:30pm
```
- Payment type badge: green=cash, red=due, orange=partial
- Tappable → Sale Detail screen

---

## 5. Cylinder Management

### 5.1 Cylinder List Screen
**Route:** `/cylinders`
**API:** `GET /v1/cylinders`

**Header:** "Cylinders" + FAB (+) to create

**List item:**
```
[Color swatch] 12.5 KG (12K)         Active
               Filled: 150 | Empty: 40
               Reorder at: 20 | FIFO cost: ৳800
```
- Color swatch is a small circle using `color1` (fill) + `color2` (border)
- Status badge: green=active, gray=inactive

---

### 5.2 Cylinder Detail Screen
**Route:** `/cylinders/{id}`
**API:** `GET /v1/cylinders/{cylinder}`

**Sections:**
1. **Header card** — Name, short code, colors, brands, status badge
2. **Stock card** — Filled qty, Empty qty, With Salesmen (derived from allocations), Capacity bar
3. **FIFO Info card** — Current oldest lot unit_cost, remaining qty in that lot
4. **Quick actions** — Edit button, View Stock History button
5. **Stock History preview** (last 5 movements)

---

### 5.3 Create / Edit Cylinder Screen
**Route:** `/cylinders/create` or `/cylinders/{id}/edit`
**API:** `POST /v1/cylinders` or `PUT /v1/cylinders/{id}`

**Form fields:**
| Field | Input Type | Validation |
|-------|-----------|------------|
| Name | Text | Required |
| Size | Text | Required |
| Short Code | Text | Required, max 5 chars |
| Color 1 | Color picker | Optional, hex |
| Color 2 | Color picker | Optional, hex |
| Brands | Text area | Optional |
| Status | Toggle / Dropdown | active / inactive |
| Reorder Level | Number | Optional, min 0 |
| Capacity | Number | Optional, min 1 |

- Color picker: can be a simple grid of preset colors OR hex text field
- Live preview of color swatch as user picks colors
- Save button at bottom

---

## 6. Stock & Inventory Screens

### 6.1 Stock Overview Screen
**Route:** `/stock`
**API:** `GET /v1/stock`

**Layout:**
- Summary bar at top: Total filled, Total empty, Total types
- List of all cylinders with stock

Each row:
```
┌────────────────────────────────────┐
│ [swatch] 12.5 KG                   │
│  Filled ████████░░ 150 / 200       │
│  Empty  ████░░░░░░ 40              │
│  [⚠ Low] if below reorder level    │
└────────────────────────────────────┘
```

- Tap row → Cylinder Detail
- "View History" icon on each row → Stock History

---

### 6.2 Stock History Screen
**Route:** `/stock/{cylinderId}/history`
**API:** `GET /v1/stock/{cylinderId}/history`

**Header:** Cylinder name + "Stock History"

**Filter bar:** event_type filter chips (All, Purchase, Allocation, Sale, Return...)

Each row:
```
[Icon] purchase          +50        Balance: 200
       Admin • 5 Jun     10:30am
```
- `+` prefix green for additions, `-` prefix red for removals
- Icon per event_type (shopping cart = purchase, user = allocation, arrow = return...)
- Infinite scroll / paginated

---

## 7. Refill Order Screens

### 7.1 Refill Orders List
**Route:** `/stock/refills`
**API:** `GET /v1/stock/refills`

**Status filter tabs:** All | Pending | Partial | Received

Each row:
```
12.5 KG → Jamuna Gas        [Pending]
Sent: 100 pcs • 30 May
Received: 0 / 100
```
- Status badge: gray=pending, orange=partially_received, green=received
- Tap → Refill Detail / Receive screen

---

### 7.2 Create Refill Order Screen
**Route:** `/stock/refills/create`
**API:** `POST /v1/stock/refill`

**Form fields:**
| Field | Input Type | Note |
|-------|-----------|------|
| Cylinder | Dropdown (active cylinders) | Shows current empty_qty |
| Supplier | Dropdown (active suppliers) | |
| Qty to Send | Number | Must be ≤ empty_qty |
| Send Date | Date picker | |
| Refill Cost | Number | Optional |
| Notes | Text area | Optional |

- Below cylinder picker: show current `empty_qty` in stock so admin knows how many can be sent
- Save button → creates order and deducts empty stock

---

### 7.3 Receive Refill Screen
**Route:** `/stock/refills/{id}/receive`
**API:** `POST /v1/stock/refill/{refill}/receive`

**Shows current order info:**
- Cylinder, Supplier, Qty Sent, Qty Already Received, Status

**Form:**
| Field | Input Type | Note |
|-------|-----------|------|
| Qty Received | Number | Max = qty_sent - qty_received |
| Received Date | Date picker | |

- Confirm button → receive stock, updates filled_qty

---

## 8. Purchase Management Screens

### 8.1 Purchase List Screen
**Route:** `/purchases`
**API:** `GET /v1/purchases`

**Header:** "Purchases" + FAB (+)

Each row:
```
Jamuna Gas                          ৳ 80,000
5 Jun 2026 • 100 units     Due: ৳ 30,000 [orange]
```
- If `due_amount == 0`: green "Paid" badge
- If `due_amount > 0`: orange "Due ৳X" badge
- Tap → Purchase Detail

---

### 8.2 Purchase Detail Screen
**Route:** `/purchases/{id}`
**API:** `GET /v1/purchases/{purchase}`

**Sections:**
1. **Header card** — Supplier name, purchase date, recorded_by
2. **Amount card** — Total ৳X | Paid ৳X | Due ৳X (color coded)
3. **Items table** — Cylinder | Qty | Unit Cost | Remaining | Status | Line Total
4. **Pay button** (visible if `due_amount > 0`)
5. **Payment history** list (DuePayments)

---

### 8.3 Create Purchase Screen
**Route:** `/purchases/create`
**API:** `POST /v1/purchases`

**Form:**
| Field | Input Type | Note |
|-------|-----------|------|
| Supplier | Dropdown | Active suppliers |
| Purchase Date | Date picker | |
| Paid Amount | Number | Optional upfront payment |
| Notes | Text area | |

**Items section** (dynamic list, add/remove rows):
| Field | Input Type |
|-------|-----------|
| Cylinder | Dropdown |
| Qty | Number |
| Unit Cost | Number |

- "+ Add Item" button to add more cylinder rows
- Running total shown as items are added: "Total: ৳ 80,000"
- Save creates purchase and updates stock filled_qty

---

### 8.4 Pay Purchase Screen
**Route:** `/purchases/{id}/pay`
**API:** `POST /v1/purchases/{purchase}/pay`

**Shows:** Purchase ID, Supplier, Current Due

**Form:**
| Field | Input Type |
|-------|-----------|
| Amount | Number (max = due_amount) |
| Payment Date | Date picker |
| Notes | Text area |

---

### 8.5 FIFO Queue Screen
**Route:** `/purchases/fifo/{cylinderId}`
**API:** `GET /v1/purchases/fifo/{cylinderId}`

**Purpose:** Show admin the cost basis of current stock in FIFO order

**Layout:**
- Cylinder name in header
- Ordered list of purchase lots: Lot # | Purchase Date | Unit Cost | Remaining Qty

Each row:
```
Lot #30 — Jamuna Gas (1 Jun 2026)   ৳800/unit
           Remaining: 60 pcs     [Active]
```
- Status color: green=active, gray=pending, dark=done

---

### 8.6 FIFO Simulate Screen
**Route:** `/purchases/simulate`
**API:** `POST /v1/purchases/simulate`

**Purpose:** Admin can preview what profit a sale would make before committing

**Form:**
| Field | Input Type |
|-------|-----------|
| Cylinder | Dropdown |
| Qty | Number |
| Sale Price | Number |

**Result card (after submit):**
```
Lots Consumed:
  Lot #30: 10 units @ cost ৳800 → price ৳1000 → profit ৳200
  ...
─────────────────────────────
Total Cost:     ৳ 8,000
Total Revenue:  ৳ 10,000
Total Profit:   ৳ 2,000 (20%)
```

---

## 9. Supplier Management Screens

### 9.1 Supplier List Screen
**Route:** `/suppliers`
**API:** `GET /v1/suppliers`

**Header:** "Suppliers" + FAB (+)

Each row:
```
Jamuna Gas [Dealer]              Due: ৳ 30,000
📞 01700000001
```
- If no due: green "Clear" badge
- If due: orange/red "Due ৳X" badge
- Tap → Supplier Detail

---

### 9.2 Supplier Detail Screen
**Route:** `/suppliers/{id}`
**API:** `GET /v1/suppliers/{supplier}`

**Sections:**
1. **Profile card** — Name, type badge, phone, address, active status
2. **Due card** — Total Due with "Pay" button if `total_due > 0`
3. **Recent Purchases** — Last 5 purchases list
4. **Payment History** — Recent due payments

**Actions:** Edit button (top right), Delete (⋮ menu)

---

### 9.3 Create / Edit Supplier Screen
**Form fields:**
| Field | Input | Note |
|-------|-------|------|
| Name | Text | Required |
| Type | Toggle | Dealer / Self |
| Phone | Phone number | Optional |
| Address | Text area | Optional |

---

### 9.4 Pay Supplier Screen
**API:** `POST /v1/suppliers/{supplier}/pay`

**Shows:** Supplier name, Current Due: ৳X

**Form:**
| Field | Input |
|-------|-------|
| Amount | Number (max = total_due) |
| Payment Date | Date picker |
| Link to Purchase | Optional dropdown of supplier's purchases |
| Notes | Text |

---

## 10. Sales Screens

### 10.1 Sales List Screen
**Route:** `/sales`
**API:** `GET /v1/sales`

**Filter bar:**
- Date range picker
- Payment type chips: All | Cash | Due | Partial
- "Has Due" toggle
- Search bar (customer name/phone)

Each row:
```
John Doe                         ৳ 5,000
Rahim • 5 Jun 2026     [cash]
```
- Payment badge color: green=cash, red=due, orange=partial
- Tap → Sale Detail

**Total bar at bottom:** "Showing X sales | Total: ৳ Y"

---

### 10.2 Sale Detail Screen
**Route:** `/sales/{id}`
**API:** `GET /v1/sales/{sale}`

**Sections:**
1. **Customer card** — Name, phone (tappable to call)
2. **Salesman card** — Avatar initials, name
3. **Amount card** — Total ৳X | Paid ৳X | Due ৳X
4. **Items table** — Cylinder | Qty | Unit Price | Profit | Line Total
5. **Payment History** — DueCollections list
6. **Collect Payment button** (if `due_amount > 0`)
7. **Delete Sale** (⋮ menu, admin only) — with confirmation dialog

---

### 10.3 Create Sale Screen
**Route:** `/sales/create`
**API:** `POST /v1/sales`

**Form:**
| Field | Input | Note |
|-------|-------|------|
| Customer | Search + select | Searchable dropdown, can create new |
| Sale Date | Date picker | Default today |
| Payment Type | Toggle | Cash / Due / Partial |
| Paid Amount | Number | Shown only if Partial |

**Items section** (dynamic):
| Field | Input |
|-------|-------|
| Cylinder | Dropdown (active) |
| Qty | Number |
| Unit Price | Number |

- Running total updates as items added
- If payment_type=partial: show "Remaining Due: ৳X" below paid amount
- Submit → `POST /v1/sales`

---

### 10.4 Collect Sale Payment Screen
**Route:** `/sales/{id}/collect`
**API:** `POST /v1/sales/{sale}/pay`

**Shows:** Customer name, Sale date, Total, Paid, Due

**Form:**
| Field | Input |
|-------|-------|
| Amount | Number (max = due_amount) |
| Collection Date | Date picker |
| Notes | Text |

---

## 11. Customer Management Screens

### 11.1 Customer List Screen
**Route:** `/customers`
**API:** `GET /v1/customers`

**Search bar** at top (searches name/phone, calls overdue version if "overdue" tab selected)

**Tabs:** All | With Due | Overdue

Each row:
```
[Avatar] John Doe                    Due: ৳ 5,000
         📞 01711222333 • Added by Rahim
```
- No due: clean row
- Has due: orange/red due amount on right
- Tap → Customer Detail

**FAB:** + Create Customer

---

### 11.2 Overdue Customers Screen
**Route:** `/customers/overdue`
**API:** `GET /v1/customers/overdue`

**Filter bar:**
- Days overdue: slider or pills (7, 14, 30, 60+)
- Sort: Amount ↑↓ | Days ↑↓

Each row:
```
[Avatar] John Doe              ৳ 15,000
         12 days overdue • Last sale: 24 May
```
- Color intensity increases with days overdue
- Tap → Customer Detail

---

### 11.3 Customer Detail Screen
**Route:** `/customers/{id}`
**API:** `GET /v1/customers/{customer}`

**Sections:**
1. **Profile card** — Name, phone (call icon), address, added_by salesman, active status
2. **Financial summary** — Total Revenue | Total Paid | Total Due
3. **Empty Cylinders Owed** — Per cylinder: sold - returned = balance
4. **Sales history** — Paginated list of this customer's sales
5. **Payment History** — Due collections

**Actions:** Edit, Collect Due (if `total_due > 0`), Deactivate

---

### 11.4 Create / Edit Customer Screen
**Form:**
| Field | Input |
|-------|-------|
| Name | Text (required) |
| Phone | Phone number |
| Address | Text area |

---

### 11.5 Collect Customer Due Screen
**API:** `POST /v1/customers/{customer}/collect`

**Form:**
| Field | Input |
|-------|-------|
| Amount | Number (max = total_due) |
| Link to Sale | Optional sale picker |
| Collection Date | Date picker |
| Notes | Text |

---

## 12. Salesman Management Screens

### 12.1 Salesman List Screen
**Route:** `/salesmen`
**API:** `GET /v1/salesmen?date=today`

**Date picker** at top (changes which allocations are shown per salesman)

Each card (larger cards, not simple rows):
```
┌─────────────────────────────────────┐
│ [R] Rahim             [Active]      │
│     📞 01711000001                  │
│  Allocated: 50 | Sold: 30 | Left: 10│
│  Collected: ৳ 30,000                │
│  Sell-through: ████████░░ 60%       │
└─────────────────────────────────────┘
```
- Avatar: colored circle with `avatar_initials`
- Red "Inactive" badge if `is_active = false`
- Tap → Salesman Detail

**FAB:** + Add Salesman

---

### 12.2 Salesman Detail Screen
**Route:** `/salesmen/{id}`
**API:** `GET /v1/salesmen/{user}?date=today`

**Header:**
- Large avatar circle, name, phone, role badge, active toggle (admin action)

**Date picker** — select which day to view

**Today's Summary cards:**
```
Cash Collected   Sales Amount   Due Amount   Pending Coll.
৳ 30,000         ৳ 35,000       ৳ 5,000      ৳ 8,000
```

**Allocations section:**
- List of today's allocations per cylinder type

Each allocation row:
```
12.5 KG                               [Not Reconciled]
Allocated: 50 | Sold: 30 | With: 10
Sale Price: ৳1,000 | Collected: ৳30,000
[Reconcile EOD]  [Edit Allocation]
```
- "Reconcile EOD" button → EOD screen
- "Edit Allocation" → Update allocation qty/price

**Cash Breakdown section:**
- Table: Cylinder | Qty Sold | Sale Price | Expected Cash
- Total Expected vs. Collected comparison

**Customer Dues section:**
- List of customers with outstanding dues from this salesman's sales

**Actions:** Allocate Stock (FAB), Edit Profile, Toggle Active

---

### 12.3 Create / Edit Salesman Screen
**Form:**
| Field | Input | Note |
|-------|-------|------|
| Name | Text | Required |
| Email | Email | Required, unique |
| Password | Password | Required on create, optional on edit |
| Phone | Phone | Optional |

---

### 12.4 Salesman Report Screen
**Route:** `/salesmen/{id}/report`
**API:** `GET /v1/salesmen/{user}/report`

**Date range picker** (default: current month)

**KPI Cards:**
```
Total Sales    Collected    Due         Sold Through
৳ 150,000     ৳ 140,000   ৳ 10,000    90%
```

**Daily Breakdown table:**
| Date | Sales | Collected | Allocated | Sold |
|------|-------|-----------|-----------|------|

**Cylinder Flow section:**
- Per cylinder: Allocated → Sold → Returned → Left With Salesman

---

### 12.5 All Salesmen Report Screen
**Route:** `/salesmen/report`
**API:** `GET /v1/salesmen/report`

- Date range picker
- Table comparing all salesmen side by side:

| Salesman | Sales | Collected | Sell-through |
|----------|-------|-----------|-------------|
| Rahim | ৳150k | ৳140k | 90% |
| Karim | ৳80k | ৳75k | 85% |

- Sort by any column
- Tap row → that salesman's individual report

---

## 13. Allocation Management Screens

### 13.1 Allocate Stock Screen
**Route:** `/salesmen/{id}/allocate`
**API:** `POST /v1/salesmen/{user}/allocate`

**Shows:** Salesman name, today's existing allocations

**Form:**
| Field | Input | Note |
|-------|-------|------|
| Cylinder | Dropdown | Shows available filled_qty |
| Qty | Number | Max = filled_qty in warehouse |
| Sale Price | Number | Suggested price |
| Date | Date picker | Default today |

- Below cylinder picker: "Available in warehouse: X pcs"
- Validate qty ≤ warehouse filled_qty before submit

---

### 13.2 Edit Allocation Screen
**Route:** `/allocations/{id}/edit`
**API:** `PUT /v1/allocations/{allocation}`

**Shows:** Current allocation details (read-only)

**Editable:**
| Field | Input | Constraint |
|-------|-------|------------|
| Qty | Number | Min = sold_qty |
| Sale Price | Number | Min 0 |

---

### 13.3 EOD Reconciliation Screen
**Route:** `/allocations/{id}/reconcile`
**API:** `POST /v1/allocations/{allocation}/reconcile`

**Shows:** Allocation details — Cylinder, Date, Allocated Qty

**Form:**
| Field | Input | Constraint |
|-------|-------|------------|
| Qty Sold | Number | 0 to allocation.qty |
| Qty Returned | Number | auto = qty - sold |
| Cash Collected | Number | |
| Notes | Text | |

- Live: "Unsold = qty - sold_qty = X will auto-return to warehouse"
- Warning if collected_amount doesn't match expected (qty_sold * sale_price)
- Confirmation dialog before submit: "EOD cannot be undone. Confirm?"

---

## 14. Cylinder Returns Screens

### 14.1 Returns List Screen
**Route:** `/returns`
**API:** `GET /v1/returns`

**Filter chips:** All | Empty Return | Error Correction | Extra Returns | Pending Verify

**Date range filter**

Each row:
```
[Customer] John Doe — 12.5 KG           5 pcs
           Rahim • 5 Jun • empty_return  [Verified]
```
- Badge: gray=unverified, green=verified, red=rejected
- "Extra" badge shown if `is_extra=true`
- Admin can tap "Extra" returns → see verify/reject options

---

### 14.2 Record Return Screen
**Route:** `/returns/create`
**API:** `POST /v1/returns`

**Form:**
| Field | Input | Note |
|-------|-------|------|
| Customer | Search + select | Optional |
| Cylinder | Dropdown | |
| Qty | Number | |
| Type | Toggle | Empty Return / Error Correction |
| Return Date | Date picker | |
| Is Extra | Toggle | Appears if anomalous |
| Extra Reason | Text | Required if is_extra = true |
| Notes | Text | |

---

### 14.3 Verify / Reject Return
- On Returns List, tap an "extra" return item
- Bottom sheet appears with:
  - Return details
  - [VERIFY] green button → `POST /v1/returns/{id}/verify`
  - [REJECT] red button → `POST /v1/returns/{id}/reject` (with reason text field)

---

## 15. Expense & Budget Screens

### 15.1 Expense List Screen
**Route:** `/expenses`
**API:** `GET /v1/expenses`

**Month/Year picker** at top

**Category filter chips:** All | Transport | Salary | Rent | Utility | Other

**Budget overview bar** (from summary endpoint):
```
Transport  ████████░░  ৳15k / ৳20k (75%)
Salary     ██████████  ৳100k / ৳100k (100%) ⚠
```

Each expense row:
```
[Transport icon]  Delivery fuel               ৳ 5,000
                  3 Jun 2026 • Admin
```

**FAB:** + Add Expense

---

### 15.2 Create / Edit Expense Screen
**Form:**
| Field | Input | Note |
|-------|-------|------|
| Category | Dropdown / Pills | transport/salary/rent/utility/other |
| Amount | Number (৳) | Required |
| Date | Date picker | |
| Description | Text | Optional |

---

### 15.3 Budget Management Screen
**Route:** `/expenses/budget`
**API:** `GET /v1/expenses/summary`, `POST /v1/expenses/budget`

**Layout:**
- List of all 5 categories
- Each category shows current budget, actual spent, % used, alert threshold

Each row:
```
Transport
Budget: ৳ 20,000   Spent: ৳ 15,000   Alert at: 80%
████████░░  75%
[Edit Budget]
```

- Edit Budget → inline form or modal:
  - Monthly Budget (number)
  - Alert Threshold % (number, default 80)

---

## 16. Reports Screens

### 16.1 Reports Hub Screen
**Route:** `/reports`

**Grid of 4 report cards:**
```
┌───────────────┐  ┌───────────────┐
│ 📊 P&L        │  │ 💰 Cash Flow  │
│ Profit & Loss │  │ Money In/Out  │
└───────────────┘  └───────────────┘
┌───────────────┐  ┌───────────────┐
│ 🛒 Purchases  │  │ 🔄 Cylinder   │
│ By Supplier   │  │ Flow          │
└───────────────┘  └───────────────┘
```

Each card tappable → navigates to that report screen

---

### 16.2 P&L Report Screen
**Route:** `/reports/pnl`
**API:** `GET /v1/reports/pnl`

**Date range picker** (default: current month)

**Revenue section:**
```
Total Sales:       ৳ 500,000
Due Collected:     ৳  80,000
─────────────────────────────
Total Collected:   ৳ 580,000
```

**COGS:**
```
Cost of Goods:     ৳ 400,000
Gross Profit:      ৳ 100,000  (20%)
```

**Expenses breakdown** (per category):
```
Transport:  ৳ 15,000
Salary:     ৳ 100,000
Rent:       ৳ 20,000
Utility:    ৳ 5,000
Other:      ৳ 2,000
─────────────
Total Exp:  ৳ 142,000
```

**Net Profit:**
```
Net Profit:  ৳ -42,000  (-8.4%)  [Red if negative, Green if positive]
```

---

### 16.3 Cash Flow Report Screen
**Route:** `/reports/cashflow`
**API:** `GET /v1/reports/cashflow`

**Date range picker**

**Inflow / Outflow summary:**
```
┌─────────────────┐  ┌─────────────────┐
│  INFLOW         │  │  OUTFLOW        │
│  ৳ 480,000      │  │  ৳ 342,000      │
│  Cash sales     │  │  Supplier pay.  │
│  Due collected  │  │  Expenses       │
└─────────────────┘  └─────────────────┘
       NET CASHFLOW: ৳ 138,000
```

**Daily Breakdown chart:** Line or bar chart — inflow vs outflow per day

---

### 16.4 Purchase Report Screen
**Route:** `/reports/purchases`
**API:** `GET /v1/reports/purchases`

**Date range picker**

**By Supplier table:**
| Supplier | Total Qty | Total ৳ | Paid | Due |
|----------|-----------|---------|------|-----|

**By Cylinder table:**
| Cylinder | Total Qty | Avg Cost | Min | Max | Total ৳ |
|----------|-----------|---------|-----|-----|---------|

---

### 16.5 Cylinder Flow Report Screen
**Route:** `/reports/cylinder-flow`
**API:** `GET /v1/reports/cylinder-flow`

**Date range picker**

**Per Salesman section:**
- Expandable card per salesman
- Inside: per-cylinder breakdown table

| Cylinder | Allocated | Sold | Returned | With Salesman | Empties Back |
|----------|-----------|------|----------|---------------|--------------|

**Totals row** at bottom

---

## 17. Notification Screen

**Route:** `/notifications`
**API:** `GET /v1/notifications`

**Mark all read** button in header

Each row:
```
[🔔] Low Stock Alert                        2m ago
     12.5 KG cylinder below reorder level
     [●] (unread dot)
```
- Unread: slightly different background
- Tap → navigate to relevant screen (based on `type` and `reference_id`):
  - `low_stock` → Cylinder detail
  - `large_sale` → Sale detail
  - `supplier_due` → Supplier detail
- Tap read icon → mark as read
- Swipe right → mark as read gesture

---

## 18. Audit Log Screen

**Route:** `/audit-logs`
**API:** `GET /v1/audit-logs`

**Filter bar:**
- Model dropdown (Sale, Purchase, Customer, Expense...)
- User dropdown (All users)
- Action chips: create | update | delete | pay | allocate...

Each row:
```
[User Avatar] Admin                    5 Jun 10:30
              Created Sale #102
              Customer: John Doe • ৳5,000
```
- Tap → expandable to show `old_value` / `new_value` JSON
- Color coded by action: green=create, blue=update, red=delete

---

## 19. Settings & Profile

### 19.1 Profile Screen
**API:** `GET /v1/auth/me`

**Layout:**
- Large avatar circle (initials)
- Name, email, role badge, phone
- Edit Profile button

---

### 19.2 Edit Profile Screen
- Name text field
- Phone text field
- Change Password section (old password, new password, confirm)

---

### 19.3 Settings Screen
- **App Theme:** Light / Dark (local only)
- **Notifications:** toggle push notifications
- **Low Stock Alert Threshold:** global setting
- **Currency Display:** ৳ BDT (informational)
- **About:** App version

---

### 19.4 Logout
- Calls `POST /v1/auth/logout`
- Clears all stored tokens from secure storage
- Navigates to Login screen

---

## 20. Shared Components

### 20.1 StatCard
```
┌──────────────────┐
│  [Icon]    [%]   │
│  ৳ 50,000        │
│  Label text      │
└──────────────────┘
```
Props: `icon`, `value`, `label`, `color`, `change_pct` (optional)

---

### 20.2 SectionHeader
```
Recent Sales                View All →
```
Props: `title`, `onViewAll` (optional action)

---

### 20.3 PaymentTypeBadge
- `cash` → Green badge
- `due` → Red badge
- `partial` → Orange badge

---

### 20.4 StatusBadge
General purpose. Props: `label`, `variant` (success/warning/danger/neutral)

---

### 20.5 AmountRow
```
Total Amount:          ৳ 5,000
Paid:                  ৳ 3,000 (green)
Due:                   ৳ 2,000 (red)
```

---

### 20.6 ProgressBar
```
████████░░  80%
```
Props: `value`, `max`, `color`, `showLabel`
- Auto-red if value/max < 0.2 (near reorder level)

---

### 20.7 SalesmanAvatar
- Circle with `avatar_initials` text
- Background color derived from name hash (consistent per salesman)

---

### 20.8 DateRangePicker
- Bottom sheet with:
  - Quick presets: Today | This Week | This Month | Last Month
  - Custom: from/to calendar pickers

---

### 20.9 ConfirmDialog
Standard confirmation modal for destructive actions:
- Title
- Message
- Cancel (gray) + Confirm (red for destructive, blue for positive)

---

### 20.10 SearchableDropdown
- Text input with search
- Filtered dropdown list below
- Used for Customer picker, Cylinder picker, Supplier picker

---

### 20.11 EmptyState
```
     [Icon]
     No records found.
  [Create first record]
```

---

### 20.12 ErrorBanner
```
⚠ Could not load data. Tap to retry.
```
Shown at top of screen when API call fails.

---

### 20.13 LoadingOverlay
- Full screen semi-transparent overlay with spinner
- Used during form submission

---

### 20.14 PullToRefresh
Standard pull-to-refresh on all list screens.

---

### 20.15 FAB (Floating Action Button)
- Bottom-right of list screens
- Primary create action for that section
- Disappears on scroll down, reappears on scroll up

---

## 21. Color Palette & Typography

### Colors
```
Primary:    #3b82f6  (blue-500)
Success:    #22c55e  (green-500)
Warning:    #f59e0b  (amber-500)
Danger:     #ef4444  (red-500)
Neutral:    #6b7280  (gray-500)
Background: #f9fafb  (gray-50)   [Light mode]
Card:       #ffffff
Border:     #e5e7eb  (gray-200)
Text:       #111827  (gray-900)
Subtext:    #6b7280  (gray-500)
```

### Typography
| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| Page Title | 20px | Bold | Screen headers |
| Section Title | 16px | SemiBold | Section headers |
| Card Amount | 22px | Bold | Primary KPI numbers |
| Body | 14px | Regular | Standard list text |
| Caption | 12px | Regular | Timestamps, subtitles |
| Badge | 11px | SemiBold | Status badges |

### Spacing
- Screen padding: 16px horizontal
- Card padding: 16px
- Item spacing in lists: 12px gap
- Section spacing: 24px gap

### Currency Formatting
- Always show BDT Taka symbol: `৳`
- Format: `৳ 50,000` (space after symbol, comma separator)
- For large amounts: `৳ 1,50,000` (BD comma style) or `৳ 150K` in compact mode

---

## 22. Key User Flows (Step-by-Step)

### Flow 1: Morning Stock Allocation
1. Open app → Dashboard
2. Check "With Salesmen" count and "Warehouse Stock"
3. Navigate to Salesmen → select a salesman
4. Tap "Allocate Stock" FAB
5. Select cylinder type, enter qty, set sale price
6. Submit → stock moves from warehouse to salesman

### Flow 2: Record a New Purchase
1. More → Purchases → FAB (+)
2. Select supplier, set date
3. Add items (cylinder, qty, unit cost)
4. Enter paid amount (or leave 0 for full credit)
5. Submit → stock added, supplier due updated

### Flow 3: Evening EOD Check
1. Dashboard → check "With Salesmen" vs "Warehouse Stock"
2. Salesmen tab → check each salesman's reconciliation status
3. Tap unreconciled salesman → view allocations
4. "Reconcile EOD" → enter sold/returned/collected
5. Submit → stock returned, collections recorded

### Flow 4: Generate P&L for the Month
1. More → Reports → P&L
2. Set date range (first to last of month)
3. View revenue, COGS, expenses, net profit
4. Export or screenshot for records

### Flow 5: Collect Customer Due
1. Dashboard → tap "Customer Due" card
2. Overdue customers list → tap a customer
3. Customer Detail → "Collect Due" button
4. Enter amount, date
5. Submit → customer due reduced

---

*End of UI/UX Design Guide*

> For all API details, data types, and request/response formats, refer to `ADMIN_API_REFERENCE.md`
