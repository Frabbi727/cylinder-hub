<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Customer;
use App\Models\PurchaseItem;
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

            $paidAmount = (float) ($data['paid_amount'] ?? $totalAmount);

            $sale = Sale::create([
                'customer_id'  => $data['customer_id'] ?? null,
                'salesman_id'  => $data['salesman_id'],
                'sale_date'    => $data['sale_date'],
                'total_amount' => $totalAmount,
                'paid_amount'  => $paidAmount,
                'payment_type' => $data['payment_type'] ?? 'cash',
                'notes'        => $data['notes'] ?? null,
            ]);

            foreach ($allSaleItems as $saleItemData) {
                SaleItem::create(array_merge($saleItemData, ['sale_id' => $sale->id]));
            }

            // Update customer's total due if it's a due/partial sale
            if ($sale->customer_id && $paidAmount < $totalAmount) {
                Customer::where('id', $sale->customer_id)
                    ->increment('total_due', $totalAmount - $paidAmount);
            }

            return $sale->load(['items.cylinder', 'customer', 'salesman']);
        });
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
