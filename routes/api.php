<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\CylinderController;
use App\Http\Controllers\Api\V1\PurchaseController;
use App\Http\Controllers\Api\V1\SaleController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\SupplierController;
use App\Http\Controllers\Api\V1\SalesmanController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\StockController;

Route::prefix('v1')->group(function () {

    // Public
    Route::post('auth/login', [AuthController::class, 'login']);

    // Authenticated — all roles
    Route::middleware('auth:sanctum')->group(function () {

        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me',     [AuthController::class, 'me']);

        // Sales — salesman sees only their own (filtered server-side)
        Route::get('sales',             [SaleController::class, 'index']);
        Route::post('sales',            [SaleController::class, 'store']);
        Route::get('sales/{sale}',      [SaleController::class, 'show']);
        Route::post('sales/{sale}/pay', [SaleController::class, 'pay']);

        // Customer read — salesman needs this to select a customer during Quick Sale
        Route::get('customers', [CustomerController::class, 'index']);

        // Salesman self-service: view own allocation data + reconcile own allocation
        Route::get('salesmen/{user}',                     [SalesmanController::class, 'show']);
        Route::post('allocations/{allocation}/reconcile', [SalesmanController::class, 'reconcile']);

        // Empty cylinder collection — salesman records empties received during delivery
        Route::post('returns', [StockController::class, 'storeReturn']);

        // ── Admin-only ────────────────────────────────────────────────────────
        Route::middleware('can:admin-only')->group(function () {

            Route::get('dashboard', [DashboardController::class, 'index']);

            // Cylinders
            Route::get('cylinders',               [CylinderController::class, 'index']);
            Route::get('cylinders/{cylinder}',    [CylinderController::class, 'show']);
            Route::post('cylinders',              [CylinderController::class, 'store']);
            Route::put('cylinders/{cylinder}',    [CylinderController::class, 'update']);
            Route::delete('cylinders/{cylinder}', [CylinderController::class, 'destroy']);

            // Purchases
            Route::get('purchases',                   [PurchaseController::class, 'index']);
            Route::post('purchases',                  [PurchaseController::class, 'store']);
            Route::get('purchases/{purchase}',        [PurchaseController::class, 'show']);
            Route::post('purchases/{purchase}/pay',   [PurchaseController::class, 'pay']);
            Route::get('purchases/fifo/{cylinderId}', [PurchaseController::class, 'fifoQueue']);
            Route::post('purchases/simulate',         [PurchaseController::class, 'simulate']);

            // Sales admin actions
            Route::delete('sales/{sale}', [SaleController::class, 'destroy']);

            // Customer management
            Route::post('customers',                    [CustomerController::class, 'store']);
            Route::get('customers/{customer}',          [CustomerController::class, 'show']);
            Route::put('customers/{customer}',          [CustomerController::class, 'update']);
            Route::delete('customers/{customer}',       [CustomerController::class, 'destroy']);
            Route::post('customers/{customer}/collect', [CustomerController::class, 'collect']);

            // Suppliers
            Route::get('suppliers',                  [SupplierController::class, 'index']);
            Route::post('suppliers',                 [SupplierController::class, 'store']);
            Route::get('suppliers/{supplier}',       [SupplierController::class, 'show']);
            Route::put('suppliers/{supplier}',       [SupplierController::class, 'update']);
            Route::delete('suppliers/{supplier}',    [SupplierController::class, 'destroy']);
            Route::post('suppliers/{supplier}/pay',  [SupplierController::class, 'pay']);

            // Salesmen management
            Route::get('salesmen',                           [SalesmanController::class, 'index']);
            Route::post('salesmen',                          [SalesmanController::class, 'store']);
            Route::put('salesmen/{user}',                    [SalesmanController::class, 'update']);
            Route::post('salesmen/{user}/toggle-active',     [SalesmanController::class, 'toggleActive']);
            Route::post('salesmen/{user}/allocate',          [SalesmanController::class, 'allocate']);

            // Expenses
            Route::get('expenses',             [ExpenseController::class, 'index']);
            Route::post('expenses',            [ExpenseController::class, 'store']);
            Route::get('expenses/{expense}',   [ExpenseController::class, 'show']);
            Route::put('expenses/{expense}',   [ExpenseController::class, 'update']);
            Route::delete('expenses/{expense}',[ExpenseController::class, 'destroy']);

            // Stock & returns
            Route::get('stock',    [StockController::class, 'index']);
            Route::get('returns',  [StockController::class, 'returns']);
            Route::post('returns', [StockController::class, 'storeReturn']);
        });
    });
});
