<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\CylinderController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ExpenseBudgetController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PurchaseController;
use App\Http\Controllers\Api\V1\RefillController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\SaleController;
use App\Http\Controllers\Api\V1\SalesmanController;
use App\Http\Controllers\Api\V1\StockController;
use App\Http\Controllers\Api\V1\SupplierController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // ── Public ────────────────────────────────────────────────────────────────
    Route::post('auth/login', [AuthController::class, 'login']);

    // ── Sanctum authenticated ─────────────────────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        // Token management — accept any valid Sanctum token (access OR refresh)
        Route::post('auth/refresh', [AuthController::class, 'refresh']);
        Route::post('auth/logout',  [AuthController::class, 'logout']);

        // ── Access-token-only routes ──────────────────────────────────────────
        // Refresh tokens are rejected by the 'access-token' middleware below
        Route::middleware('access-token')->group(function () {

            Route::get('auth/me', [AuthController::class, 'me']);

            // Notifications (all roles)
            Route::get('notifications',            [NotificationController::class, 'index']);
            Route::post('notifications/read-all',  [NotificationController::class, 'markAllRead']);
            Route::post('notifications/{id}/read', [NotificationController::class, 'markRead']);

            // Sales — salesman sees only their own (filtered server-side)
            Route::get('sales',             [SaleController::class, 'index']);
            Route::post('sales',            [SaleController::class, 'store']);
            Route::get('sales/{sale}',      [SaleController::class, 'show']);
            Route::post('sales/{sale}/pay', [SaleController::class, 'pay']);

            // Cylinders read
            Route::get('cylinders',            [CylinderController::class, 'index']);
            Route::get('cylinders/{cylinder}', [CylinderController::class, 'show']);

            // Customers — read + create for salesman
            Route::get('customers',  [CustomerController::class, 'index']);
            Route::post('customers', [CustomerController::class, 'store']);

            // Salesman self-service
            Route::get('salesmen/{user}',                     [SalesmanController::class, 'show']);
            Route::post('allocations/{allocation}/reconcile', [SalesmanController::class, 'reconcile']);

            // Empty cylinder return
            Route::post('returns', [StockController::class, 'storeReturn']);

            // ── Admin-only ────────────────────────────────────────────────────
            Route::middleware('can:admin-only')->group(function () {

                Route::get('dashboard', [DashboardController::class, 'index']);

                // Reports
                Route::get('reports/pnl',       [ReportController::class, 'pnl']);
                Route::get('reports/cashflow',   [ReportController::class, 'cashflow']);
                Route::get('reports/purchases',  [ReportController::class, 'purchases']);

                // Cylinders write
                Route::post('cylinders',              [CylinderController::class, 'store']);
                Route::put('cylinders/{cylinder}',    [CylinderController::class, 'update']);
                Route::delete('cylinders/{cylinder}', [CylinderController::class, 'destroy']);

                // Purchases
                Route::get('purchases/fifo/{cylinderId}', [PurchaseController::class, 'fifoQueue']);
                Route::post('purchases/simulate',         [PurchaseController::class, 'simulate']);
                Route::get('purchases',                   [PurchaseController::class, 'index']);
                Route::post('purchases',                  [PurchaseController::class, 'store']);
                Route::get('purchases/{purchase}',        [PurchaseController::class, 'show']);
                Route::post('purchases/{purchase}/pay',   [PurchaseController::class, 'pay']);

                // Sales admin actions
                Route::delete('sales/{sale}', [SaleController::class, 'destroy']);

                // Customers — overdue before {customer} to avoid route conflict
                Route::get('customers/overdue',             [CustomerController::class, 'overdue']);
                Route::get('customers/{customer}',          [CustomerController::class, 'show']);
                Route::put('customers/{customer}',          [CustomerController::class, 'update']);
                Route::delete('customers/{customer}',       [CustomerController::class, 'destroy']);
                Route::post('customers/{customer}/collect', [CustomerController::class, 'collect']);

                // Suppliers
                Route::get('suppliers',                 [SupplierController::class, 'index']);
                Route::post('suppliers',                [SupplierController::class, 'store']);
                Route::get('suppliers/{supplier}',      [SupplierController::class, 'show']);
                Route::put('suppliers/{supplier}',      [SupplierController::class, 'update']);
                Route::delete('suppliers/{supplier}',   [SupplierController::class, 'destroy']);
                Route::post('suppliers/{supplier}/pay', [SupplierController::class, 'pay']);

                // Salesmen — report before {user} to avoid route conflict
                Route::get('salesmen/report',                [SalesmanController::class, 'reportAll']);
                Route::get('salesmen',                       [SalesmanController::class, 'index']);
                Route::post('salesmen',                      [SalesmanController::class, 'store']);
                Route::put('salesmen/{user}',                [SalesmanController::class, 'update']);
                Route::post('salesmen/{user}/toggle-active', [SalesmanController::class, 'toggleActive']);
                Route::post('salesmen/{user}/allocate',      [SalesmanController::class, 'allocate']);
                Route::get('salesmen/{user}/report',         [SalesmanController::class, 'report']);

                // Expenses — summary/budget before {expense} to avoid conflict
                Route::get('expenses/summary',         [ExpenseBudgetController::class, 'summary']);
                Route::post('expenses/budget',         [ExpenseBudgetController::class, 'store']);
                Route::put('expenses/budget/{budget}', [ExpenseBudgetController::class, 'update']);
                Route::get('expenses',                 [ExpenseController::class, 'index']);
                Route::post('expenses',                [ExpenseController::class, 'store']);
                Route::get('expenses/{expense}',       [ExpenseController::class, 'show']);
                Route::put('expenses/{expense}',       [ExpenseController::class, 'update']);
                Route::delete('expenses/{expense}',    [ExpenseController::class, 'destroy']);

                // Stock — named routes before {cylinderId} to avoid conflict
                Route::get('stock/refills',                 [RefillController::class, 'index']);
                Route::post('stock/refill',                 [RefillController::class, 'store']);
                Route::post('stock/refill/{refill}/receive',[RefillController::class, 'receive']);
                Route::get('stock/{cylinderId}/history',    [StockController::class, 'history']);
                Route::get('stock',                         [StockController::class, 'index']);
                Route::get('returns',                       [StockController::class, 'returns']);

                // Audit logs
                Route::get('audit-logs', [AuditLogController::class, 'index']);
            });
        });
    });
});
