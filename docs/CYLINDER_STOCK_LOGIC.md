# Cylinder Stock & Availability Logic

This document explains the business logic for calculating and displaying available cylinder stock throughout the CylinderHub system.

---

## 1. Overview: The Three Stock Pools

To understand cylinder availability, it's important to know that the system tracks cylinders in three distinct "pools":

1.  **Warehouse Stock (Central Inventory):** This is the main stock you own, stored at your facility. It's the source for all sales and allocations.
2.  **Field Stock (With Salesmen):** These are cylinders that have been allocated to salesmen but have not yet been sold or returned. They are physically out of the warehouse.
3.  **Empty Yard:** These are empty cylinders returned by customers or from unsold stock, waiting to be sent for refilling.

---

## 2. How Stock is Calculated

### 2.1. Warehouse Stock

This is the most straightforward calculation and is stored in the `cylinder_stock` table. For any given cylinder type (e.g., "Omera 12kg"):

-   **Available for Allocation/Sale:** `cylinder_stock.filled_qty`
    -   This is the number an **Admin** sees as "In Warehouse" or "Available Stock".
    -   When an admin allocates 50 cylinders to a salesman, this `filled_qty` is reduced by 50.
    -   When a salesman reconciles at EOD and returns 10 unsold cylinders, this `filled_qty` is increased by 10.

-   **Ready for Refill:** `cylinder_stock.empty_qty`
    -   This number increases when a customer returns an empty cylinder or when a salesman returns empty, unsold stock.

### 2.2. Field Stock (With a Salesman)

This is the stock a **Salesman** is responsible for. It's not a single number but is calculated from their **unreconciled** `stock_allocations`.

-   **Salesman's Available to Sell:** `SUM(allocation.qty - allocation.sold_qty - allocation.returned_qty)`
    -   This is the number a **Salesman** should see in their mobile app as "My Stock" or "Available to Sell".
    -   It's the sum of all remaining cylinders from all their active (unreconciled) allocations.
    -   **Example:** If a salesman has two active allocations for Omera 12kg (10 remaining from yesterday, 20 from today), their app should show they have **30** available to sell.

### 2.3. Total Company Assets (Company-Wide View)

For a high-level business overview (e.g., on an Admin dashboard), you might want to see the total number of filled cylinders the company owns, regardless of location.

-   **Total Filled Cylinders:** `Warehouse Filled Stock` + `Total Field Stock`
    -   **Formula:** `SUM(cylinder_stock.filled_qty) + SUM(unreconciled_allocations.qty - unreconciled_allocations.sold_qty - unreconciled_allocations.returned_qty)`
    -   This gives you a complete picture of your assets.

---

## 3. Example Scenario: The Lifecycle of "Omera" Cylinders

Let's trace how the numbers change for the "Omera 12kg" cylinder.

| Action | Warehouse Filled | Field Stock (Rahim) | Customer | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Start of Day** | 100 | 0 | - | You have 100 units in the warehouse. |
| **Admin allocates 30 to Rahim** | 70 | 30 | - | Warehouse stock decreases; field stock increases. |
| **Rahim sells 5 (Cash Sale)** | 70 | 25 | Has 5 cylinders | Rahim's available stock drops. `sold_qty` on his allocation is now 5. |
| **Rahim sells 2 (Due Sale)** | 70 | 23 | Has 2 cylinders | Rahim's available stock drops again. `sold_qty` is now 7. |
| **EOD: Rahim reconciles** | 93 | 0 | - | Rahim sold 7 and has 23 unsold. The 23 are returned to the warehouse (`70 + 23 = 93`). His allocation is now reconciled and his field stock for it becomes 0. |

The "80" you are seeing could be the `Warehouse Filled` quantity at a specific point in time. To provide a full picture, your app should be able to show:

-   **Admin View:** A dashboard showing "Warehouse Stock" and maybe a separate "Total Stock with Salesmen".
-   **Salesman View:** Only the "Field Stock" that they are personally responsible for.

---

## 4. Relevant API Endpoints

-   **For Warehouse Stock (Admin):**
    -   `GET /api/v1/stock`: This endpoint likely returns the `cylinder_stock` data, showing `filled_qty` and `empty_qty` for each cylinder type.
-   **For Salesman's Field Stock (Salesman/Admin):**
    -   `GET /api/v1/salesmen/{user}`: The response for a salesman includes their `allocations`. The mobile app should calculate the remaining available stock from these allocation objects.
-   **For Company-Wide Reports (Admin):**
    -   `GET /api/v1/dashboard` or `GET /api/v1/reports/...`: These endpoints likely provide the combined totals for high-level reporting.

By using this logic, you can build a UI that provides a clear and accurate view of cylinder availability for the right audience.
