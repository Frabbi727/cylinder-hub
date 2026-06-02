<?php

namespace App\Services;

use App\Models\DueCollection;
use App\Models\DuePayment;
use App\Models\Expense;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockAllocation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReportService
{
    public function pnl(string $from, string $to): array
    {
        $totalRevenue = (float) Sale::whereBetween('sale_date', [$from, $to])->sum('total_amount');

        $totalCogs = (float) SaleItem::whereHas(
            'sale',
            fn ($q) => $q->whereBetween('sale_date', [$from, $to])
        )->sum(DB::raw('unit_cost * qty'));

        $grossProfit = $totalRevenue - $totalCogs;

        $categories    = ['transport', 'salary', 'rent', 'utility', 'other'];
        $expenseTotals = Expense::whereBetween('expense_date', [$from, $to])
            ->select('category', DB::raw('SUM(amount) as total'))
            ->groupBy('category')
            ->pluck('total', 'category');

        $expensesBreakdown = collect($categories)->map(fn ($cat) => [
            'category' => $cat,
            'amount'   => round((float) ($expenseTotals[$cat] ?? 0), 2),
        ])->values()->all();

        $totalExpenses = array_sum(array_column($expensesBreakdown, 'amount'));
        $netProfit     = $grossProfit - $totalExpenses;

        return [
            'period'              => ['from' => $from, 'to' => $to],
            'total_revenue'       => round($totalRevenue, 2),
            'total_cogs'          => round($totalCogs, 2),
            'gross_profit'        => round($grossProfit, 2),
            'expenses_breakdown'  => $expensesBreakdown,
            'total_expenses'      => round($totalExpenses, 2),
            'net_profit'          => round($netProfit, 2),
        ];
    }

    public function cashflow(string $from, string $to): array
    {
        $salesCollected   = (float) Sale::whereBetween('sale_date', [$from, $to])->sum('paid_amount');
        $dueCollections   = (float) DueCollection::whereBetween('collection_date', [$from, $to])->sum('amount');
        $totalIn          = $salesCollected + $dueCollections;

        $supplierPayments = (float) DuePayment::whereBetween('payment_date', [$from, $to])->sum('amount');
        $expensesPaid     = (float) Expense::whereBetween('expense_date', [$from, $to])->sum('amount');
        $totalOut         = $supplierPayments + $expensesPaid;

        $netCash = $totalIn - $totalOut;

        return [
            'period'   => ['from' => $from, 'to' => $to],
            'cash_in'  => [
                'sales_collected' => round($salesCollected, 2),
                'due_collections' => round($dueCollections, 2),
                'total_in'        => round($totalIn, 2),
            ],
            'cash_out' => [
                'supplier_payments' => round($supplierPayments, 2),
                'expenses_paid'     => round($expensesPaid, 2),
                'total_out'         => round($totalOut, 2),
            ],
            'net'      => [
                'net_cash' => round($netCash, 2),
            ],
        ];
    }

    public function purchases(string $from, string $to): array
    {
        $perSupplier = Purchase::with('supplier')
            ->whereBetween('purchase_date', [$from, $to])
            ->select(
                'supplier_id',
                DB::raw('SUM(total_amount) as total_cost'),
                DB::raw('SUM(paid_amount) as total_paid'),
                DB::raw('SUM(due_amount) as still_owe')
            )
            ->groupBy('supplier_id')
            ->get()
            ->map(function ($p) use ($from, $to) {
                $pcs = PurchaseItem::whereHas(
                    'purchase',
                    fn ($q) => $q->where('supplier_id', $p->supplier_id)->whereBetween('purchase_date', [$from, $to])
                )->sum('qty');

                return [
                    'supplier_name'       => $p->supplier?->name,
                    'total_purchased_pcs' => (int) $pcs,
                    'total_cost'          => round((float) $p->total_cost, 2),
                    'total_paid'          => round((float) $p->total_paid, 2),
                    'still_owe'           => round((float) $p->still_owe, 2),
                ];
            })
            ->values()
            ->all();

        $perCylinder = PurchaseItem::with('cylinder')
            ->whereHas('purchase', fn ($q) => $q->whereBetween('purchase_date', [$from, $to]))
            ->select(
                'cylinder_id',
                DB::raw('SUM(qty) as total_pcs'),
                DB::raw('AVG(unit_cost) as avg_unit_cost'),
                DB::raw('MIN(unit_cost) as min_cost'),
                DB::raw('MAX(unit_cost) as max_cost')
            )
            ->groupBy('cylinder_id')
            ->get()
            ->map(fn ($pi) => [
                'cylinder_name' => $pi->cylinder?->name,
                'total_pcs'     => (int) $pi->total_pcs,
                'avg_unit_cost' => round((float) $pi->avg_unit_cost, 2),
                'min_cost'      => round((float) $pi->min_cost, 2),
                'max_cost'      => round((float) $pi->max_cost, 2),
            ])
            ->values()
            ->all();

        $totals  = Purchase::whereBetween('purchase_date', [$from, $to])
            ->selectRaw('SUM(total_amount) as total_cost, SUM(paid_amount) as total_paid, SUM(due_amount) as total_owe')
            ->first();
        $totalPcs = (int) PurchaseItem::whereHas(
            'purchase',
            fn ($q) => $q->whereBetween('purchase_date', [$from, $to])
        )->sum('qty');

        return [
            'period'       => ['from' => $from, 'to' => $to],
            'per_supplier' => $perSupplier,
            'per_cylinder' => $perCylinder,
            'totals'       => [
                'total_pcs'  => $totalPcs,
                'total_cost' => round((float) ($totals->total_cost ?? 0), 2),
                'total_paid' => round((float) ($totals->total_paid ?? 0), 2),
                'total_owe'  => round((float) ($totals->total_owe ?? 0), 2),
            ],
        ];
    }

    public function salesmanReport(int $salesmanId, string $from, string $to): array
    {
        $salesman = User::findOrFail($salesmanId);

        $totalAllocated = (int) StockAllocation::where('salesman_id', $salesmanId)
            ->whereBetween('allocation_date', [$from, $to])->sum('qty');
        $totalSold = (int) StockAllocation::where('salesman_id', $salesmanId)
            ->whereBetween('allocation_date', [$from, $to])->sum('sold_qty');
        $totalReturned = (int) StockAllocation::where('salesman_id', $salesmanId)
            ->whereBetween('allocation_date', [$from, $to])->sum('returned_qty');

        $totalRevenue       = (float) Sale::where('salesman_id', $salesmanId)
            ->whereBetween('sale_date', [$from, $to])->sum('total_amount');
        $totalCashCollected = (float) Sale::where('salesman_id', $salesmanId)
            ->whereBetween('sale_date', [$from, $to])->sum('paid_amount');
        $totalDuesCreated   = round($totalRevenue - $totalCashCollected, 2);

        $totalDuesCollected = (float) DueCollection::where('collected_by', $salesmanId)
            ->whereBetween('collection_date', [$from, $to])->sum('amount');
        $stillOutstanding   = round(max(0, $totalDuesCreated - $totalDuesCollected), 2);
        $sellThroughRate    = $totalAllocated > 0
            ? round($totalSold / $totalAllocated, 4)
            : 0.0;

        return [
            'salesman' => [
                'id'             => $salesman->id,
                'name'           => $salesman->name,
                'phone'          => $salesman->phone,
                'avatar_initials'=> $salesman->avatar_initials,
            ],
            'period'               => ['from' => $from, 'to' => $to],
            'total_allocated'      => $totalAllocated,
            'total_sold'           => $totalSold,
            'total_returned'       => $totalReturned,
            'total_revenue'        => round($totalRevenue, 2),
            'total_cash_collected' => round($totalCashCollected, 2),
            'total_dues_created'   => $totalDuesCreated,
            'total_dues_collected' => round($totalDuesCollected, 2),
            'still_outstanding'    => $stillOutstanding,
            'sell_through_rate'    => $sellThroughRate,
        ];
    }
}
