<?php

namespace App\Services;

use App\Models\Cylinder;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Customer;
use App\Models\PurchaseItem;
use App\Models\StockAllocation;
use Illuminate\Support\Facades\DB;

class SaleService
{
    public function __construct(
        private FifoService  $fifoService,
        private StockService $stockService,
    ) {}

    /**
     * Create a sale with FIFO lot consumption and stock deduction.
     * data = [
     *   customer_id, salesman_id, sale_date, payment_type, paid_amount, notes,
     *   items => [[ cylinder_id, qty, unit_price ], ...]
     * ]
     */
    public function createSale(array $data): Sale
    {
        return DB::transaction(function () use ($data) {
            // Salesmen may only sell cylinders that have been allocated to them
            if (($data['salesman_role'] ?? null) === 'salesman') {
                foreach ($data['items'] as $item) {
                    $available = StockAllocation::where('salesman_id', $data['salesman_id'])
                        ->where('cylinder_id', $item['cylinder_id'])
                        ->whereDate('allocation_date', $data['sale_date'])
                        ->where('is_reconciled', false)
                        ->get()
                        ->sum(fn ($a) => max(0, $a->qty - $a->sold_qty));

                    if ($available < (int) $item['qty']) {
                        $cylinder = Cylinder::find($item['cylinder_id']);
                        $label    = $cylinder ? "{$cylinder->name} {$cylinder->size}" : "Cylinder #{$item['cylinder_id']}";
                        throw new \RuntimeException(
                            "Only {$available} unit(s) of {$label} allocated to you for {$data['sale_date']}. Cannot sell {$item['qty']}."
                        );
                    }
                }
            }

            $totalAmount = 0;
            $allSaleItems = [];

            foreach ($data['items'] as $item) {
                $fifoResult = $this->fifoService->consume(
                    $item['cylinder_id'],
                    $item['qty'],
                    (float) $item['unit_price']
                );

                $this->stockService->removeFilledStock($item['cylinder_id'], $item['qty']);

                $totalAmount += $fifoResult['total_revenue'];
                $allSaleItems = array_merge($allSaleItems, $fifoResult['breakdown']);
            }

            $paidAmount  = min((float) ($data['paid_amount'] ?? $totalAmount), $totalAmount);
            $paymentType = $paidAmount >= $totalAmount ? 'cash' : ($paidAmount > 0 ? 'partial' : 'due');

            $sale = Sale::create([
                'customer_id'  => $data['customer_id'] ?? null,
                'salesman_id'  => $data['salesman_id'],
                'sale_date'    => $data['sale_date'],
                'total_amount' => $totalAmount,
                'paid_amount'  => $paidAmount,
                'payment_type' => $paymentType,
                'notes'        => $data['notes'] ?? null,
            ]);

            // Only persist DB columns — strip display-only fields like lot_id_label
            $dbFields = ['purchase_item_id', 'cylinder_id', 'qty', 'unit_price', 'unit_cost', 'profit'];
            foreach ($allSaleItems as $saleItemData) {
                SaleItem::create(array_merge(
                    array_intersect_key($saleItemData, array_flip($dbFields)),
                    ['sale_id' => $sale->id]
                ));
            }

            // Reflect this sale's qty on the salesman's open allocation so
            // the allocation card shows real-time "sold" numbers without waiting for reconcile
            $this->updateAllocationSoldQty($data['salesman_id'], $data['items'], $data['sale_date']);

            // Update customer's total due if it's a due/partial sale
            if ($sale->customer_id && $paidAmount < $totalAmount) {
                Customer::where('id', $sale->customer_id)
                    ->increment('total_due', $totalAmount - $paidAmount);
            }

            return $sale->load(['items.cylinder', 'customer', 'salesman']);
        });
    }

    /**
     * Find the salesman's open (unreconciled) allocation for each item's cylinder
     * on the sale date and increment sold_qty. Handles the case where the salesman
     * received multiple allocations for the same cylinder on the same day.
     */
    private function updateAllocationSoldQty(int $salesmanId, array $items, string $saleDate): void
    {
        // Group items by cylinder_id so we make one update per cylinder
        $qtyByCylinder = [];
        foreach ($items as $item) {
            $cid = (int) $item['cylinder_id'];
            $qtyByCylinder[$cid] = ($qtyByCylinder[$cid] ?? 0) + (int) $item['qty'];
        }

        foreach ($qtyByCylinder as $cylinderId => $qty) {
            // Find the oldest unreconciled allocation for this salesman+cylinder+date
            $allocation = StockAllocation::where('salesman_id', $salesmanId)
                ->where('cylinder_id', $cylinderId)
                ->whereDate('allocation_date', $saleDate)
                ->where('is_reconciled', false)
                ->orderBy('created_at', 'asc')
                ->first();

            if ($allocation) {
                $allocation->increment('sold_qty', $qty);
            }
        }
    }

    /**
     * Delete a sale — reverses FIFO lots, restores stock and customer due.
     * Admin-only operation.
     */
    public function deleteSale(Sale $sale): void
    {
        DB::transaction(function () use ($sale) {
            foreach ($sale->items as $saleItem) {
                // Restore remaining_qty on the purchase lot
                $purchaseItem = PurchaseItem::find($saleItem->purchase_item_id);
                if ($purchaseItem) {
                    $newRemaining = $purchaseItem->remaining_qty + $saleItem->qty;
                    $purchaseItem->update([
                        'remaining_qty' => $newRemaining,
                        'status'        => $newRemaining > 0 && $newRemaining < $purchaseItem->qty
                            ? 'active'
                            : ($newRemaining === $purchaseItem->qty ? 'pending' : 'done'),
                    ]);
                }

                // Restore filled stock
                $this->stockService->addFilledStock($saleItem->cylinder_id, $saleItem->qty);
            }

            // Reverse sold_qty on the allocation
            $qtyByCylinder = [];
            foreach ($sale->items as $saleItem) {
                $cid = $saleItem->cylinder_id;
                $qtyByCylinder[$cid] = ($qtyByCylinder[$cid] ?? 0) + $saleItem->qty;
            }
            foreach ($qtyByCylinder as $cylinderId => $qty) {
                StockAllocation::where('salesman_id', $sale->salesman_id)
                    ->where('cylinder_id', $cylinderId)
                    ->whereDate('allocation_date', $sale->sale_date)
                    ->where('is_reconciled', false)
                    ->orderBy('created_at', 'asc')
                    ->first()
                    ?->decrement('sold_qty', $qty);
            }

            // Reverse customer due if applicable
            $dueAmount = (float) $sale->total_amount - (float) $sale->paid_amount;
            if ($sale->customer_id && $dueAmount > 0) {
                Customer::where('id', $sale->customer_id)
                    ->decrement('total_due', $dueAmount);
            }

            $sale->delete();
        });
    }
}
