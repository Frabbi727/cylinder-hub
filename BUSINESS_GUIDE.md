# CylinderHub — Complete Business Guide

> **LPG Cylinder Distribution Management System**
> For owners, admins, and salesmen — how the business works, step by step.

---

## Table of Contents

1. [What is CylinderHub?](#1-what-is-cylinderhub)
2. [Who Uses It?](#2-who-uses-it)
3. [The Business Flow (Big Picture)](#3-the-business-flow-big-picture)
4. [Admin Guide — Every Feature Explained](#4-admin-guide)
   - [Dashboard](#41-dashboard)
   - [Inventory & Stock](#42-inventory--stock)
   - [Purchases & Lots (FIFO)](#43-purchases--lots-fifo)
   - [Sales](#44-sales)
   - [Salesman Stock (Allocation)](#45-salesman-stock-allocation)
   - [Customers](#46-customers)
   - [Suppliers](#47-suppliers)
   - [Expenses](#48-expenses)
5. [Salesman Guide — Every Feature Explained](#5-salesman-guide)
   - [My Day Page](#51-my-day-page)
   - [Recording a New Sale](#52-recording-a-new-sale)
   - [Collecting Payment (Due / Partial)](#53-collecting-payment-due--partial)
   - [End-of-Day Reconciliation](#54-end-of-day-reconciliation)
6. [Financial Calculations — How the Numbers Work](#6-financial-calculations)
   - [Profit Calculation (FIFO)](#61-profit-calculation-fifo)
   - [Due & Credit Tracking](#62-due--credit-tracking)
   - [Admin vs Salesman Totals](#63-admin-vs-salesman-totals)
7. [Key Business Rules](#7-key-business-rules)
8. [Glossary](#8-glossary)

---

## 1. What is CylinderHub?

CylinderHub is a management system for an **LPG cylinder distribution business**. The business buys filled LPG cylinders from suppliers and sells them to customers through salesmen who go door-to-door or sell from a depot.

The system tracks:
- Every cylinder type in stock (filled and empty)
- Every purchase from every supplier with exact cost per unit
- Every sale made by every salesman with profit per unit
- Money owed by customers (receivables / debtors)
- Money owed to suppliers (payables / creditors)
- All business expenses
- Daily allocation of cylinders to salesmen and end-of-day reconciliation

---

## 2. Who Uses It?

| Role | Access | Responsibility |
|------|--------|----------------|
| **Admin / Owner** | Full access to all pages | Manages everything — purchases, inventory, salesmen, customers, finances |
| **Salesman** | Only their own sales data | Takes cylinders out to sell, records sales, collects payment, returns unsold cylinders |

---

## 3. The Business Flow (Big Picture)

```
SUPPLIER
   │
   │  Buy cylinders at cost price (e.g. ৳1,200/pcs)
   ▼
WAREHOUSE STOCK  ←── Filled cylinders tracked here
   │
   │  Admin allocates cylinders to salesmen with a sale price (e.g. ৳1,400/pcs)
   ▼
SALESMAN (takes cylinders out)
   │
   ├──▶ Sells to CUSTOMER
   │       Cash sale      → customer pays now → money collected
   │       Partial sale   → customer pays some now, rest later
   │       Due sale       → customer pays later (creates a debt)
   │
   └──▶ Returns unsold cylinders at End of Day
            Unsold cylinders → back to WAREHOUSE STOCK
            Collected cash   → reported to admin
```

**The profit on each cylinder = Sale Price − Purchase Cost (FIFO)**

---

## 4. Admin Guide

### 4.1 Dashboard

The dashboard is the admin's **control room** — a real-time snapshot of the business.

**Four summary cards (filterable by Today / This Week / This Month / Custom):**

| Card | What It Shows |
|------|--------------|
| **Sales Amount** | Total revenue from all sales in the selected period |
| **Profit** | Net profit = sum of (sale price − purchase cost) for every item sold |
| **Filled Stock** | How many filled cylinders are currently in the warehouse |
| **Customer Due** | Total money customers still owe across all time |

**Weekly Sales Chart** — bar chart of the last 7 days' sales revenue, so you can spot trends.

**Live Stock** — shows every cylinder type with filled qty, empty qty, and whether it's below the reorder level (shown in red as a warning).

**Recent Sales** — the last 10 sales across all salesmen.

**Money Snapshot** — shows:
- Total customer receivables (money customers owe you)
- Total supplier payables (money you owe suppliers)
- This month's expenses

---

### 4.2 Inventory & Stock

This is where you define your **cylinder types** and monitor stock levels.

**What is a Cylinder Type?**
A cylinder type is a product category — e.g., "Basundhara LPG 35kg" or "Omera 12kg". Each type has:
- Name, size, short code
- Color theme (for visual identification)
- Capacity and reorder level
- Brand/s it carries

**Stock Levels (per cylinder type):**
- **Filled Qty** — cylinders ready to sell
- **Empty Qty** — empty cylinders in the warehouse (returned from customers)
- Stock goes up when you purchase filled cylinders, goes down when you sell them

**Reorder Alert** — if filled stock drops below the reorder level, the dashboard shows a warning so you know to buy more.

---

### 4.3 Purchases & Lots (FIFO)

This is how cylinders enter the business.

**Recording a Purchase:**
1. Select the supplier
2. Enter purchase date
3. Add line items: cylinder type + quantity + unit cost (price you paid per cylinder)
4. Enter how much you paid now (rest becomes supplier due)

**What Happens:**
- A **Purchase Lot** is created for each line item
- Filled stock increases by the purchased quantity
- If you didn't pay in full, the difference is added to the supplier's outstanding balance

**FIFO (First In, First Out):**
FIFO is the stock costing method. When cylinders are sold, the system automatically uses the **oldest purchase lot first**. This means:
- If you bought 10 cylinders at ৳1,200 in January and 10 more at ৳1,300 in February
- When you sell 5, the system uses the January lot (৳1,200 cost) to calculate profit
- When those run out, it moves to the February lot (৳1,300 cost)

This ensures accurate profit calculation and fair stock valuation.

**FIFO Simulator:**
Before making a sale, you can simulate it — enter a cylinder type, quantity, and sale price, and the system shows you exactly which lots will be consumed and what the profit will be. Useful for pricing decisions.

**Lot Status:**
| Status | Meaning |
|--------|---------|
| **Pending** | Not yet touched — full qty still available |
| **Active** | Partially consumed — some qty has been sold |
| **Done** | Fully consumed — no stock left in this lot |

**Paying Suppliers:**
Click "Pay" on any purchase to record a payment to the supplier. The supplier's due balance decreases.

---

### 4.4 Sales

The admin sees **all sales** from all salesmen in one table.

**Each sale record shows:**
- Sale date
- Customer name (or "Walk-in" if no customer)
- Items sold (cylinder type × quantity)
- Total amount
- Paid amount (green)
- Due amount (red, if any)
- Payment type: Cash / Partial / Due
- Which salesman made the sale

**Payment Types:**
| Type | Meaning |
|------|---------|
| **Cash** | Full amount collected at time of sale |
| **Partial** | Part of the money collected now, rest is due |
| **Due** | Nothing collected yet — customer owes full amount |

**Collecting Balance:**
Any sale with a due amount has a "Collect" button. Clicking it opens a payment modal:
- Enter the amount received
- "Pay in Full" shortcut fills the entire due amount
- Enter the date and any notes
- After collection, the sale status updates automatically

**Deleting a Sale (Admin only):**
Deleting a sale reverses all effects:
- Stock is restored (FIFO lots are reversed)
- Customer due is reduced
- Allocation sold count is corrected

---

### 4.5 Salesman Stock (Allocation)

This is the daily **dispatch system** — how cylinders go from the warehouse to the salesman.

**Daily Flow:**
1. Admin opens the Salesman Stock page
2. For each active salesman, clicks **"Allocate"**
3. Selects cylinder type, quantity, and sets the **sale price**
4. The salesman now has those cylinders assigned to them for that day

**Sale Price Warning:**
When setting the sale price, the system shows the FIFO purchase cost of that cylinder. If you set a sale price below cost:
- 🔴 **Red warning** — "Selling below cost! Loss of ৳100 per unit"
- 🟡 **Amber warning** — "Selling at cost — no profit"
- 🟢 **Green hint** — shows expected profit per unit

**Allocation Card (per salesman):**
Shows for each allocation:
- Cylinder type and sale price
- Allocated qty | Sold qty | Returned qty | Still with salesman
- Reconciliation status

**Navigating Dates:**
You can view any past date to see what was allocated and how reconciliation went. Past dates are read-only.

**End-of-Day Reconcile (Admin view):**
At the end of the day, admin can reconcile each allocation:
- Confirm actual sold quantity
- Confirm empty cylinders returned
- Record cash collected from salesman
- Any unsold cylinders are automatically returned to warehouse stock

---

### 4.6 Customers

The customer list tracks everyone the business sells to on credit.

**Customer Record:**
- Name, phone, address
- **Total Due** — running balance of all unpaid amounts across all sales

**Collecting Due:**
Admin can collect due from a customer directly from the customer page (separate from collecting on individual sales). This records a `DueCollection` entry and reduces the customer's outstanding balance.

**Why Track Customers?**
- Know who owes you money
- See total receivables at a glance on the dashboard
- Build a relationship — repeat customers can be found quickly when recording a new sale

---

### 4.7 Suppliers

Suppliers are the companies you buy cylinders from.

**Supplier Record:**
- Name, phone, type (Dealer/Agent or Self)
- **Total Due** — money you still owe them for cylinders already received

**Recording a Payment:**
Use the "Pay" button to record a payment to a supplier. This reduces their outstanding balance.

**Why This Matters:**
- Know your payables — how much you owe and to whom
- Dashboard shows total supplier due so you know your cash obligations

---

### 4.8 Expenses

Track all business running costs.

**Expense Categories:**
- Transport
- Salary
- Rent
- Utility
- Other

**Each Expense:**
- Category, amount, date, description

**Dashboard Integration:**
The dashboard's "Money Snapshot" shows **this month's total expenses**, so you can quickly see how much the business is spending.

---

## 5. Salesman Guide

The salesman has a simple, focused interface. They can only see their own data.

### 5.1 My Day Page

The salesman's home page — everything they need to know for the current day.

**Stats Bar (top of page):**
| Stat | Meaning |
|------|---------|
| **Total Pcs** | Total cylinders allocated to you today |
| **Sold** | How many you've sold so far |
| **Remaining** | Still with you (Allocated − Sold − Returned) |
| **Cash Collected** | Total money received from customers today |

**My Allocations — Cards:**
For each cylinder type allocated to you, one card shows:
- Cylinder name, size, and your assigned sale price
- **Progress bar** — teal = sold, amber = returned
- 4 numbers: Allocated / Sold / Returned / With You
- **"End of Day"** button to close out that allocation

**Allocation Cards explain your day at a glance:**
- Green "0 remaining" = all sold or returned ✓
- High "with you" count = you still have unsold stock

**Tabs — Sales History:**
- **Today (N)** — all sales you recorded today
- **All Sales** — your full sales history
- **Outstanding Dues** — all customers who still owe you money

---

### 5.2 Recording a New Sale

Click **"New Sale"** in the sidebar or the top button to open the full-page sale form.

**Step 1 — Customer (optional)**
- Search for an existing customer by name or phone
- Or select "Walk-in" for a one-time buyer
- Or quick-add a new customer inline (enter name + phone)

**Step 2 — Items**
- Select a cylinder type (only shows types allocated to you today, with remaining qty shown)
- Enter quantity — the system caps it at your remaining allocation
- Price is automatically filled from what admin set — you cannot change it
- **Line total updates instantly** as you change the quantity

**Add as many items as needed** (tap "+ Add Item" for another row).

**Step 3 — Payment**
Choose one of three options:

| Option | When to Use | What Happens |
|--------|-------------|--------------|
| **Cash** | Customer pays full amount now | Total = Paid, Due = 0 |
| **Partial** | Customer pays some now | Enter amount received, system shows remaining due |
| **Due Later** | Customer pays nothing now | Total = Due, Paid = 0 |

**Right side — Live Summary panel:**
- Shows each line item with its total
- Running **Total**, **Paid** (green), **Due** (red)
- Updates in real time as you fill in the form
- "Record Sale" button — submits the sale

**After recording:**
- Your allocation's "sold" count increases immediately
- The sale appears in your Today's Sales tab
- If there's a due amount, it appears in Outstanding Dues

---

### 5.3 Collecting Payment (Due / Partial)

Any sale with an outstanding due amount shows a **"Collect ৳X"** button on the sale card.

**How to Collect:**
1. Tap "Collect ৳X" on any sale card in Today / All Sales / Outstanding Dues tabs
2. A payment modal opens showing:
   - Customer name and original sale date
   - Remaining due amount (large, prominent)
   - Already paid so far
3. Enter the amount being collected
4. Tap **"Pay in Full"** to fill the entire due automatically
5. Set the collection date
6. Add notes if needed
7. Confirm

**After collecting:**
- Sale's paid amount increases
- Sale's due amount decreases
- If fully paid, payment type changes to "Cash"
- Customer's running balance decreases
- The sale disappears from Outstanding Dues once fully settled

**Outstanding Dues tab** shows every sale that still has money owed — from today and all past dates. This is your collection to-do list.

---

### 5.4 End-of-Day Reconciliation

At the end of the day, you must **close out each allocation** by clicking "End of Day" on the allocation card.

**What you report:**
1. **Actual Sold Qty** — how many cylinders you actually sold (system already shows a real-time count from your sales)
2. **Empty Cylinders Returned** — how many empty cylinders you're handing back
3. **Cash Collected** — total cash you're submitting

**What happens automatically:**
- Unsold cylinders = Allocated − Sold − Returned → restored back to warehouse stock
- Allocation is marked as reconciled (locked, shows ✓ Reconciled)

**Important:**
- You must reconcile before the end of the day
- Admin can also reconcile on your behalf from the Salesman Stock page
- Once reconciled, the allocation cannot be changed

---

## 6. Financial Calculations

### 6.1 Profit Calculation (FIFO)

Every cylinder sold has a precise profit calculated:

```
Profit per unit = Sale Price − Purchase Cost (FIFO lot)
```

**Example:**
- You bought 10 cylinders at ৳1,200 (Lot A)
- You bought 10 more at ৳1,350 (Lot B)
- Admin sets sale price at ৳1,500
- Salesman sells 12 cylinders

FIFO breaks it down:
- 10 units from Lot A: profit = (১,৫০০ − ১,২০০) × 10 = **৳3,000**
- 2 units from Lot B: profit = (১,৫০০ − ১,৩৫০) × 2 = **৳300**
- **Total profit on this sale = ৳3,300**

This is tracked per sale item and aggregated on the dashboard.

### 6.2 Due & Credit Tracking

**Customer Due (Receivables):**
```
Customer.total_due increases when:  a due or partial sale is recorded
Customer.total_due decreases when:  payment is collected on any sale
```

**Supplier Due (Payables):**
```
Supplier.total_due increases when:  you buy cylinders and don't pay in full
Supplier.total_due decreases when:  you record a payment to the supplier
```

Both are live running totals — always accurate, always up to date.

### 6.3 Admin vs Salesman Totals — How They Match

The admin's dashboard and the salesman's "My Day" page show consistent numbers because they read from the same database.

| What | Admin Sees | Salesman Sees |
|------|-----------|---------------|
| Sales revenue | All salesmen combined | Only their own |
| Profit | All salesmen combined | Not shown (admin-only) |
| Sold qty | All allocations | Only their allocations |
| Cash collected | All sales + reconciliations | Their sales + reconciled amounts |
| Outstanding dues | All customers | Only their customers |

**Why might a number look different?**
- Admin sees **all-time totals**; salesman sees **today only** in the stats bar
- Cash Collected for salesman = today's paid sales + reconciled collected amounts
- The Outstanding Dues tab for salesman shows **all-time** unpaid sales, not just today

---

## 7. Key Business Rules

1. **A salesman can only sell what was allocated to them today** — the system enforces this and blocks overselling.

2. **Sale price is set by admin at allocation time** — the salesman cannot change it.

3. **FIFO is automatic** — the system always consumes the oldest purchase lot first. You don't need to do anything manually.

4. **Stock only decreases when a sale is made** — allocation itself does not reduce warehouse stock. Stock reduces when the salesman records a sale.

5. **Unsold stock returns automatically on reconciliation** — if a salesman had 10 and sold 7, the 3 unsold go back to warehouse stock after End-of-Day.

6. **Deleting a sale reverses everything** — stock is restored, FIFO lots are uncreated, customer due is reduced. Admin-only action.

7. **A past allocation is read-only** — you can view it but not change it. Only today's allocations can be modified.

8. **Partial payments are tracked** — every payment recorded is linked to the specific sale, so you always know exactly how much is owed on each sale.

9. **Profit is calculated at point of sale** — the purchase cost is locked into each sale item at the moment of sale, so even if you buy more at a different price later, old sales are unaffected.

10. **Language support** — the entire system works in both English and Bengali (বাংলা). Toggle in the top-right corner.

---

## 8. Glossary

| Term | Meaning |
|------|---------|
| **Allocation** | Cylinders dispatched to a salesman for a specific day |
| **FIFO** | First In, First Out — oldest stock is sold first |
| **Lot** | A batch of cylinders from one purchase, tracked separately for cost |
| **Unit Cost** | What you paid per cylinder when buying |
| **Sale Price** | What you charge the customer per cylinder |
| **Profit** | Sale Price − Unit Cost, per cylinder |
| **Due** | Money owed but not yet collected |
| **Partial** | A sale where only some money was collected upfront |
| **Reconcile** | End-of-day process where salesman reports sold, returned, and cash |
| **Receivables** | Total money customers owe you (Customer Due) |
| **Payables** | Total money you owe suppliers (Supplier Due) |
| **Filled Qty** | Cylinders filled with gas, ready to sell |
| **Empty Qty** | Cylinders returned empty — need to be refilled |
| **Reorder Level** | Minimum stock level — below this, system alerts you to buy more |
| **Walk-in** | A sale to a customer not registered in the system |
| **DueCollection** | A record of a payment collected against a specific sale |
| **Salesman Stock** | The page where admin allocates cylinders to salesmen |

---

*CylinderHub — Built for LPG distribution businesses.*
*Admin: full control. Salesman: simple, fast, accurate.*
