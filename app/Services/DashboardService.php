<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\CylinderStock;
use App\Models\StockAllocation;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\Expense;
use App\Models\Cylinder;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    public function getSummary(string $from, string $to): array
    {
        $sales          = Sale::whereBetween('sale_date', [$from, $to])->get();
        $items          = SaleItem::whereHas('sale', fn ($q) => $q->whereBetween('sale_date', [$from, $to]))->get();
        $warehouseStock = (int) CylinderStock::sum('filled_qty');
        $withSalesmen   = (int) StockAllocation::where('is_reconciled', false)
            ->get()
            ->sum(fn ($a) => max(0, $a->qty - $a->sold_qty - $a->returned_qty));

        return [
            'today_sales_amount'  => (float) $sales->sum('total_amount'),
            'today_profit'        => (float) $items->sum('profit'),
            'warehouse_stock'     => $warehouseStock,
            'total_with_salesman' => $withSalesmen,
            'total_filled_stock'  => $warehouseStock + $withSalesmen,
            'customer_due'        => (float) Customer::sum('total_due'),
            'supplier_due'       => (float) Supplier::sum('total_due'),
            'monthly_expenses'   => (float) Expense::thisMonth()->sum('amount'),
            'today_sales_count'  => $sales->count(),
        ];
    }

    public function getWeeklyChart(): array
    {
        return collect(range(6, 0))->map(function ($daysAgo) {
            $date   = now()->subDays($daysAgo)->toDateString();
            $amount = Sale::whereDate('sale_date', $date)->sum('total_amount');
            return ['d' => now()->subDays($daysAgo)->format('D'), 'amt' => (float) $amount, 'date' => $date];
        })->values()->all();
    }

    public function getRecentSales(string $from, string $to, int $limit = 10): array
    {
        return Sale::with(['customer', 'salesman', 'items.cylinder'])
            ->whereBetween('sale_date', [$from, $to])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    public function getLiveStock(): array
    {
        $withSalesmen = StockAllocation::where('is_reconciled', false)
            ->get()
            ->groupBy('cylinder_id')
            ->map(fn ($group) => $group->sum(fn ($a) => max(0, $a->qty - $a->sold_qty - $a->returned_qty)));

        return CylinderStock::with('cylinder')
            ->get()
            ->map(fn ($s) => [
                'cylinder_id'       => $s->cylinder_id,
                'name'              => $s->cylinder?->name,
                'size'              => $s->cylinder?->size,
                'short_code'        => $s->cylinder?->short_code,
                'color1'            => $s->cylinder?->color1,
                'color2'            => $s->cylinder?->color2,
                'filled_qty'        => $s->filled_qty,
                'with_salesman_qty' => (int) ($withSalesmen[$s->cylinder_id] ?? 0),
                'total_filled_qty'  => $s->filled_qty + (int) ($withSalesmen[$s->cylinder_id] ?? 0),
                'empty_qty'         => $s->empty_qty,
                'capacity'          => $s->capacity,
                'reorder_level'     => $s->cylinder?->reorder_level,
            ])
            ->all();
    }
}
