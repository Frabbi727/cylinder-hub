# Salesman Mobile App Workflow

This document outlines the core business logic and user flows for the salesman-facing mobile application. It is designed to ensure the mobile app's functionality aligns with the backend's business rules.

---

## 1. Daily Workflow Overview

The salesman's daily activities revolve around a simple loop: receiving stock, selling it, collecting payments, and reconciling at the end of the day.

```
START DAY                 DURING DAY                  END OF DAY
    │                         │                           │
    │── View Allocated Stock  │── Record a Sale           │── Open EOD Screen
    │                         │   - Cash                  │
    │                         │   - Partial (Customer REQ)│
    │                         │   - Due (Customer REQ)    │── Review System-Calculated Totals
    │                         │                           │
    └─────────────────────────│── Collect Customer Dues   │── Submit Reconciliation
                              │                           │
                              └───────────────────────────┘
```

---

## 2. Core App Screens & Logic

### 2.1. Dashboard / Home Screen

-   **Purpose:** To give the salesman a quick overview of their current status.
-   **Key Information to Display:**
    -   A list of all **unreconciled stock allocations**. This includes today's stock and any carry-over from previous days.
    -   For each allocation, it should clearly show:
        -   Cylinder Name (e.g., "12kg LPG")
        -   Total Quantity Allocated
        -   Quantity Already Sold

### 2.2. Recording a New Sale

-   **Purpose:** To record a transaction with a customer.
-   **User Flow:**
    1.  Select the cylinder type and quantity to sell.
    2.  Select the customer type:
        -   **Registered Customer:** Select from a list of existing customers.
        -   **Walk-In Customer:** A generic option for non-registered cash buyers.
    3.  Select the `Payment Type`:
        -   `Cash`: Paid in full.
        -   `Partial`: A portion of the total is paid.
        -   `Due`: No payment is made at the time of sale.
-   **Critical Business Rule:**
    -   If the `Payment Type` is **`Partial`** or **`Due`**, the app **MUST** require the salesman to select a **Registered Customer**.
    -   The "Walk-In Customer" option must be disabled or hidden in this case. This is the primary validation to prevent the previous 500 error.

### 2.3. Collecting Due Payments

-   **Purpose:** To record payments received for past credit sales.
-   **User Flow:**
    1.  Navigate to a "Due Collections" or "Customer Balances" screen.
    2.  Select the customer who is making a payment.
    3.  Enter the amount being paid.
    4.  Submit the payment.
-   **Backend Logic:** This action creates a `DueCollection` record that is in a **pending** state. This cash is not yet reconciled until the EOD process is completed.

### 2.4. End of Day (EOD) Reconciliation

-   **Purpose:** To close out the day's activities, account for all stock and cash, and lock the records.
-   **User Flow:**
    1.  Navigate to the "EOD" or "Reconciliation" screen.
    2.  The app will display a list of all **unreconciled allocations**.
    3.  For each allocation, the app should **pre-fill** the following fields based on data from the server:
        -   `Sold Qty`: The total units sold from that allocation during the day.
        -   `Collected Amount`: The total cash received *at the time of sale* for that stock.
    4.  The screen must also display a clear summary of the total cash to be handed in:
        -   **Cash from Sales:** The sum of `Collected Amount` from all reconciled items.
        -   **Cash from Due Collections:** The sum of all *pending* due payments collected today.
        -   **Total Cash to Hand In:** The sum of the above two values.
    5.  The salesman reviews these system-calculated numbers and hits "Submit".
-   **Backend Logic:** Upon submission, the backend marks the allocation as `reconciled`, returns any unsold stock to the virtual warehouse, and officially "sweeps" the pending due collections into the day's totals. The allocation is now locked from further edits by the salesman.

---

## 3. Verification Checklist for the Mobile App

Use this list to cross-verify the app's implementation:

-   [ ] **(Sales)** Does the app correctly force the user to select a registered customer for `Partial` and `Due` sales?
-   [ ] **(Dashboard)** Does the main screen accurately show all unreconciled stock, including carry-over from previous days?
-   [ ] **(EOD)** Does the EOD screen correctly pre-fill `Sold Qty` and `Collected Amount` from server data?
-   [ ] **(EOD)** Does the EOD screen correctly calculate and display the `Total Cash to Hand In` by summing cash from sales and cash from due collections?
-   [ ] **(EOD)** After submitting the EOD, is the allocation correctly marked as "Reconciled" and locked from further action by the salesman?
-   [ ] **(Offline/Sync)** *(Consider)* Does the app handle sales made while offline and sync them correctly when back online, ensuring allocation quantities are respected? (This is an advanced case but important for reliability).
