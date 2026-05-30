<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\CylinderStock;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\Expense;
use App\Models\Cylinder;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    public function getTodaySummary(): array
    {
        $todaySales = Sale::today()->get();
        $todayItems = SaleItem::whereHas('sale', fn ($q) => $q->today())->get();

        $totalSalesAmount = $todaySales->sum('total_amount');
        $totalProfit      = $todayItems->sum('profit');
        $totalFilledStock = CylinderStock::sum('filled_qty');
        $totalCustomerDue = Customer::sum('total_due');
        $totalSupplierDue = Supplier::sum('total_due');
        $monthlyExpenses  = Expense::thisMonth()->sum('amount');

        return [
            'today_sales_amount' => (float) $totalSalesAmount,
            'today_profit'       => (float) $totalProfit,
            'total_filled_stock' => (int) $totalFilledStock,
            'customer_due'       => (float) $totalCustomerDue,
            'supplier_due'       => (float) $totalSupplierDue,
            'monthly_expenses'   => (float) $monthlyExpenses,
            'today_sales_count'  => $todaySales->count(),
        ];
    }

    public function getWeeklyChart(): array
    {
        $days = collect(range(6, 0))->map(function ($daysAgo) {
            $date = now()->subDays($daysAgo)->toDateString();
            $amount = Sale::whereDate('sale_date', $date)->sum('total_amount');
            return [
                'd'   => now()->subDays($daysAgo)->format('D'),
                'amt' => (float) $amount,
                'date'=> $date,
            ];
        });

        return $days->values()->all();
    }

    public function getRecentSales(int $limit = 10): array
    {
        return Sale::with(['customer', 'salesman', 'items.cylinder'])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    public function getLiveStock(): array
    {
        return CylinderStock::with('cylinder')
            ->get()
            ->map(fn ($s) => [
                'cylinder_id' => $s->cylinder_id,
                'name'        => $s->cylinder?->name,
                'size'        => $s->cylinder?->size,
                'short_code'  => $s->cylinder?->short_code,
                'color1'      => $s->cylinder?->color1,
                'color2'      => $s->cylinder?->color2,
                'filled_qty'  => $s->filled_qty,
                'empty_qty'   => $s->empty_qty,
                'capacity'    => $s->capacity,
                'reorder_level' => $s->cylinder?->reorder_level,
            ])
            ->all();
    }
}
