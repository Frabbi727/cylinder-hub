# CylinderHub — Salesman Mobile App Design Guide

> Exact screen names, titles, labels, and button text — same as the web app.

---

## App Name
**CylinderHub**  
Sub-title: **Salesman Portal**

---

## Navigation Menu (Bottom Tabs / Side Drawer)

| Screen | Nav Label | Icon |
|--------|-----------|------|
| Dashboard | **Dashboard** | Home |
| New Sale | **New Sale** | Plus |
| Sales History | **Sales** | ShoppingCart |
| Outstanding Dues | **Outstanding Dues** | CircleDollarSign |
| Customers | **Customers** | Users |
| Empty Cylinders | **Empty Cylinders** | RotateCcw |
| End of Day | **End of Day** | Moon |
| My Reports | **My Reports** | BarChart |

---

## Screen 1 — Login

**Page title:** *(none — full screen form)*

| Element | Exact Text |
|---------|-----------|
| App name | **CylinderHub** |
| Sub-label | **Salesman Portal** |
| Email field label | **Email address** |
| Password field label | **Password** |
| Login button | **Sign In** |
| Loading button | **Signing in...** |
| Error message | **Invalid credentials. Please check your email and password.** |
| Hint text | `admin@cylinderhub.com / password · karim@cylinderhub.com / password` |

---

## Screen 2 — Dashboard

**Page title:** **Dashboard**  
**Sub-title:** `Today · June 4, 2026` *(date changes daily)*

### Greeting (time-based)
| Time | Greeting |
|------|----------|
| Before 12pm | **Good morning, [Name] 👋** |
| 12pm–5pm | **Good afternoon, [Name] 👋** |
| After 5pm | **Good evening, [Name] 👋** |

Sub-line: **"Here's what's happening"**

### Alert Banner (shows when unreconciled allocations exist after 7pm)
> ⚠ **Reminder:** You have unreconciled allocations. Please complete End of Day before midnight.  
> Button: **End of Day**

### Stat Cards (6 cards)

| Card Label | Sub-label |
|------------|-----------|
| **Total Allocated** | Cylinders with you |
| **Total Sold** | Sold so far today |
| **Cash Collected** | Today's payments received |
| **Outstanding Dues** | `{N} sales due` |
| **Cash in Hand** | Sales + collected dues |
| **Today's Profit** | FIFO basis |

### Allocation Section Title
**Today's Allocations** | Link: **End of Day →**

### Each Allocation Card shows
| Label | Value |
|-------|-------|
| **Allocated** | number |
| **Sold** | number (green) |
| **Returned** | number (amber) — after reconcile |
| **With You** | number + sub-label `can sell` |
| Reconciled badge | **✓ Done** |

### Today's Sales Section Title
**Today's Sales** | Link: **See All →**

Table headers: **Time · Customer · Items · Amount · Status**

Walk-in customer label: **Walk-in**

### No Sales State
**"No sales recorded yet today."** + link: **Record one →**

### Quick Actions Section Title
**Quick Actions**

| Button | Label |
|--------|-------|
| Primary | **+ New Sale** |
| Secondary | **Log Empty Return** |
| Secondary | **End of Day** |

### No Allocations State
**"No cylinders allocated today. Contact your admin."**

---

## Screen 3 — New Sale

**Page title:** **New Sale**  
**Sub-title:** **Record a new cylinder sale**

### Back button
**← My Day** *(for salesman)* | **← Sales** *(from sales list)*

### Customer Field
| Element | Text |
|---------|------|
| Label | **Customers** |
| Placeholder | **Select customer (optional)** |
| Search placeholder | **Search customer name...** |
| Walk-in option | **✕ Walk-in** |
| Add new button | **+ Add new customer "**[typed name]**"** |

### Inline Add Customer Form
| Field | Placeholder |
|-------|-------------|
| Name | **Customer name** * |
| Phone | **Phone (optional)** |
| Add button | **Add** |
| Loading | **Saving...** |

### Items Section
| Element | Text |
|---------|------|
| Section label | **Cylinder Types** |
| Qty label | **Qty** |
| Price label | **Price ৳** |
| Add item button | **+ Add Item** |
| Remove button | **Remove** |

### No stock warning
**"No stock allocated for today. Ask admin to allocate cylinders."**

### Payment Type Label
**Payment Type**

| Option | Label | Description |
|--------|-------|-------------|
| Cash | **Cash** | Full amount now |
| Partial | **Partial** | Some now, rest later |
| Due | **Due Later** | Collect later |

### Partial amount field
**Amount Collected Now ৳**  
Placeholder hint: **Enter how much you collected**

### Order Summary section title
**Order Summary**

| Row | Label |
|-----|-------|
| Subtotal | **Total** |
| Paid | **Paid** |
| Remaining | **due after this sale** |
| Fully paid | **Fully settled ✓** |

### Bottom bar
| Button | Label |
|--------|-------|
| Submit | **Record Sale** |
| Loading | **Saving...** |

### Leave warning dialog
**"You have unsaved items. Leave anyway?"**

---

## Screen 4 — Sales History

**Page title:** **Sales History**  
*(accessed via nav: **Sales**)*

### Period Tabs
**Today · This Week · This Month · Custom**

### Filter label (dues only)
**Outstanding Dues**

### Table headers
**Date · Customer · Total · Paid · Due · Type**

### Walk-in label
**Walk-in**

### Payment type badges
| Type | Badge text |
|------|-----------|
| cash | **CASH** |
| partial | **PARTIAL** |
| due | **DUE** |

### Empty state
**"No sales yet. Use Quick Sale to record one."**

### Export button
**Export CSV**

### Cash collected today stat
**Cash Collected**

### Totals row
| Label | Text |
|-------|------|
| Total pcs | **Total Pcs** |
| Sold | **Sold** |
| Remaining | **Remaining** |

---

## Screen 5 — Sale Detail

**Page title:** **Sale #[ID]**

Back button: **← Sales**

### Section: Payment History
Shows all payments collected after original sale.

### Collect button
**Collect**

### Collect Payment Modal
| Element | Text |
|---------|------|
| Modal title | **Collect Payment** |
| Amount label | **Amount ৳ *** |
| Pay full button | **Pay in full** |
| Date label | **Collection Date *** |
| Notes label | **Notes** |
| Submit button | **Confirm Payment** |
| Loading | **Saving...** |
| Cancel | **Cancel** |
| Remaining label | **Remaining Due** |
| Already paid label | **Already Paid** |
| After payment text | **after this payment** |

### Delete sale
**"Delete this sale? Stock will be restored."**  
*(Admin only — hide in salesman app)*

---

## Screen 6 — Outstanding Dues

**Page title:** **Outstanding Dues**  
**Sub-title:** **Sales with unpaid amounts**

### Summary Cards (4 cards)

| Card | Label |
|------|-------|
| Amount | **Total Due Amount** |
| Count | **No. of Sales** |
| Customers | **Customers Owing** |
| Age | **Oldest Due** |

### Sort dropdown options
| Value | Label |
|-------|-------|
| `days_desc` | **Oldest first** |
| `amount_desc` | **Largest amount first** |
| `name` | **Customer name** |

### Filter checkbox
**Only overdue >7 days**

### Table headers
**Customer · Phone · Sale Date · Age · Total Sale · Paid · Remaining Due · Action**

### Collect button (per row)
**Collect**

### All dues cleared state
**All dues collected!**  
Sub: **Great work. No outstanding payments.**

---

## Screen 7 — Customers

**Page title:** **Customers**

### Add button
**Add Customer**

### Summary stat
**Total Customer Due**

### Search placeholder
**Search...**

### Empty state
**"No customers yet"**

### Delete confirm
**"Delete customer?"**

---

## Screen 8 — Add Customer

**Page title:** **Add Customer** *(from nav button)*

### Form fields
| Label | Placeholder |
|-------|-------------|
| **Name** * | — |
| **Phone** | — |
| **Address** | — |

| Button | Text |
|--------|------|
| Submit | **Add Customer** |
| Cancel | **Cancel** |

---

## Screen 9 — Customer Detail

**Page title:** **[Customer Name]**

### Section: Due collection
| Element | Text |
|---------|------|
| Section title | **Collect Due** |
| Button | **Collect Due** |
| Sub-label | **Outstanding** |

### Record Collection Modal
| Element | Text |
|---------|------|
| Modal title | **Record Collection** |
| Submit | **Record Collection** |

---

## Screen 10 — Empty Cylinders

**Page title:** **My Day**  
*(accessed from the End of Day / Dashboard screen)*

### Tabs
**Today's Allocation · My Allocations**

*(The empty return is a modal/bottom sheet on this screen)*

### Log Empty Return button (per allocation)
**Collect Empty**

### Log Empty Modal
| Element | Text |
|---------|------|
| Modal title | **Record Empty Cylinders** |
| Type label | **Cylinder Type** |
| Qty label | **Empty Qty Collected** |
| Submit button | **Submit Return** |
| Loading | **Saving...** |

### Return type tabs
| Key | Label |
|-----|-------|
| normal | **Normal Return** |
| extra | **Extra Return** |

### Extra return success message
**"Extra return logged! Admin will be notified for verification."**

### Extra reason dropdown options
| Value | Label |
|-------|-------|
| `old_stock` | **Old stock** |
| `neighbour` | **Neighbour collection** |
| `competitor` | **Competitor cylinder** |
| `salesman_handover` | **Salesman handover** |
| `other` | **Other** |

---

## Screen 11 — End of Day (EOD)

**Page title:** **End of Day**  
**Sub-title:** `Thursday, June 4, 2026` *(day + date)*

### Warning banner
**"Reconcile each allocation by confirming sold qty, empty returns, and cash collected. This cannot be undone."**

### Overdue banner (if allocations from previous days exist)
**"Overdue: You have unreconciled allocations from previous days. Please reconcile them below."**

### Cash Accountability Card

**Title:** **Today's Cash Accountability**

| Row label | Description |
|-----------|-------------|
| **From today's cylinder sales** | Cash from today's sales |
| **Today's dues (to collect later)** | Credit given today |
| **Pending due collections (N)** | Due payments collected but not yet submitted |
| **Total cash to hand in** | Final amount |
| **⚠ Your outstanding (your customers only)** | All unpaid dues from your customers |

Link: **View N pending collection(s) to submit**

### Each Allocation Card

| Element | Text |
|---------|------|
| Status badge (done) | **✅ Reconciled** |
| Reconcile button | **Reconcile** |
| Cancel button | **Cancel** |
| Labels | **Allocated · Sold · Returned** *(if reconciled)* |
| Labels | **Allocated · Sold · To Return** *(if pending)* |
| Overdue label | **⚠ From [date]** |

### Reconcile Form (expands inline)

**Title:** **Reconcile: [Cylinder Name] [Size]**

**Summary row labels:**
| Label | Meaning |
|-------|---------|
| **Allocated** | Total given |
| **Sold** | System-recorded sales |
| **Price/pcs** | Sale price |
| **Customers paid** | Cash collected per this allocation |
| **Due (credit given)** | Amount not yet paid by customers |

**Input fields:**
| Label | Hint |
|-------|------|
| **How many did you sell? *** | `Max: [N] · Price: ৳[X]/pcs` |
| **Cash submitted ৳ *** | `Collected: ৳[X] · Due: ৳[X]` |

**Hint when full cash:**  
`✓ Full cash: [N] × ৳[X]`

**Auto calculation boxes:**
| Box | Label |
|-----|-------|
| Green | **Sold ✓** |
| Amber | **Return to warehouse** |
| Teal | `[N] + [N] = [total] ✓` or **⚠ Exceeds limit!** |

**Buttons:**
| Button | Text |
|--------|------|
| Next | **Review & Submit →** |
| Cancel | **Cancel** |

### Confirmation Step

**Title:** **Please confirm before submitting:**

**3 boxes:**
| Box | Label |
|-----|-------|
| Green | **Cylinders Sold** |
| Amber | **Return to Warehouse** |
| Teal | **Cash to Hand In** |

**Under-cash warning:**
`"Cash (৳[X]) is less than expected (৳[X]). The difference of ৳[X] will remain as customer dues."`

**Pending dues note:**
`"৳[X] in pending due collections will also be submitted with this EOD."`

**Outstanding warning:**
`"Your total outstanding from your own customers: ৳[X]. Collect over time — this is only your sales."`

**Final warning:**
`"⚠ This action cannot be undone by you. Only admin can edit after submission."`

**Buttons:**
| Button | Text |
|--------|------|
| Back | **← Back** |
| Submit | **Confirm & Submit** |
| Loading | **Submitting...** |

### All Done Screen

```
✅  All Done!
    All allocations reconciled for today.
```

**Stats:**

| Label | Value |
|-------|-------|
| **Total Sold** | `[N] pcs` |
| **Total Returned** | `[N] pcs` |

**Cash Summary section:**
| Row | Label |
|-----|-------|
| Line 1 | **Cylinder sales collected** |
| Line 2 *(if dues exist)* | **Today's dues (to collect later)** |
| Final | **Total to hand in** |
| Warning *(if outstanding)* | **⚠ Your outstanding (your customers only)** |

### No Allocations State
**"No allocations for today."**

---

## Screen 12 — My Reports

**Page title:** **My Reports**  
**Sub-title:** **Personal performance overview**

### Period Tabs
**Today · This Week · This Month · Custom**

### KPI Cards (4 cards)

| Card Label | Icon |
|------------|------|
| **Revenue** | DollarSign |
| **Units Sold** | ShoppingCart |
| **Cash Collected** | TrendingUp |
| **Outstanding** | AlertCircle |

### Charts

| Chart | Title |
|-------|-------|
| Bar chart | **Daily Sales Revenue** |
| Pie chart | **Payment Types** |

Bar chart empty state: **"No sales data for this period"**  
Pie chart empty state: **"No data"**

### Performance Summary section
**Title:** **Performance Summary**

| Metric label |
|-------------|
| **Total Allocated** |
| **Total Sold** |
| **Total Returned** |
| **Sell-through** |
| **Dues Created** |
| **Dues Collected** |
| **Collection Rate** |

### Cylinder Flow section

**Title:** **Cylinder Flow**  
**Sub-title:** **Allocated → Sold → Returned (unsold) + Empties collected**

**Mini KPI labels (5 boxes):**
| Label |
|-------|
| **Allocated** |
| **Sold** |
| **Returned Unsold** |
| **With You** |
| **Empties Back** |

**Table headers:**
`Cylinder · Allocated · Sold · Returned Unsold · Empties Collected · Sell-through`

### Sales Table section
**Title:** `Sales in Period ([N])`

**Table headers:** `Date · Customer · Total · Paid · Due · Type`

Empty state: **"No sales in this period"**

### Export button
**Export CSV**

---

## Screen 13 — Notifications

**Page title:** **Notifications** *(inferred from nav)*

Notification bell icon shows unread count badge.

---

## Loading States (All Screens)

| Screen | Loading text |
|--------|-------------|
| Dashboard | **Loading your day...** |
| EOD | **Loading allocations...** |
| Outstanding Dues | **Loading dues...** |
| My Reports | **Loading report...** |
| Empty Cylinders | **Loading stock...** |
| Global | **Loading...** |

---

## Common Labels Used Everywhere

| Key | English Text |
|-----|-------------|
| Save | **Save** |
| Cancel | **Cancel** |
| Add | **Add** |
| Delete | **Delete** |
| Edit | **Edit** |
| Close | **Close** |
| Confirm | **Confirm** |
| Logout | **Logout** |
| Saving... | **Saving...** |
| Loading... | **Loading...** |
| Creating... | **Creating...** |
| No data | **No data** |
| Total | **Total** |
| Paid | **Paid** |
| Due | **Due** |
| Date | **Date** |
| Notes | **Notes** |
| Name | **Name** |
| Phone | **Phone** |
| Address | **Address** |
| Amount | **Amount** |
| Qty | **Qty** |
| Status | **Status** |
| Actions | **Actions** |
| Today | **Today** |
| This Week | **This Week** |
| This Month | **This Month** |
| Custom | **Custom** |
| From | **From** |
| To | **To** |
| Search | **Search** |
| pcs | **pcs** |
| Pay in full | **Pay in full** |
| Fully settled | **Fully settled ✓** |
| after this payment | **after this payment** |

---

## Status Badges

| Status | Badge text |
|--------|-----------|
| `cash` | **CASH** |
| `partial` | **PARTIAL** |
| `due` | **DUE** |
| `active` | **Active** |
| `inactive` | **Inactive** |
| `reconciled` | **Reconciled** |
| `pending` | **Pending** |

---

## Colors

| Element | Hex |
|---------|-----|
| Primary (teal) | `#0B6E75` |
| Success (green) | `#176B3A` |
| Warning (amber) | `#A85200` |
| Danger (red) | `#B83030` |
| CASH badge | `#176B3A` |
| PARTIAL badge | `#A85200` |
| DUE badge | `#B83030` |
| Reconciled border | `var(--success)` = `#176B3A` |
| Active allocation border | `#0B6E75` |

---

## Bottom of Sidebar / Profile Area

| Label | Value |
|-------|-------|
| Name | `[Salesman Name]` |
| Role | **Salesman** |
| Logout button | **Logout** |

---

## Header Bar (Top)

| Element | Content |
|---------|---------|
| App name | **CylinderHub** |
| Sub | **Salesman Portal** |
| Date | `Thu, Jun 4` |
| Language toggle | 🇧🇩 বাংলা / English |
| Notification bell | Badge with unread count |
| New Sale button | **+ New Sale** |
