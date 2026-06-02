<?php

namespace App\Services;

use App\Models\Cylinder;
use App\Models\Customer;
use App\Models\PurchaseItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockAllocation;
use Illuminate\Support\Facades\DB;

class SaleService
{
    public function __construct(
        private FifoService $fifoService,
        private StockService $stockService,
        private StockMovementService $movements,
        private AuditLogService $audit,
        private NotificationService $notifications,
    ) {}

    public function createSale(array $data): Sale
    {
        return DB::transaction(function () use ($data) {
            if (($data['salesman_role'] ?? null) === 'salesman') {
                foreach ($data['items'] as $item) {
                    $available = StockAllocation::where('salesman_id', $data['salesman_id'])
                        ->where('cylinder_id', $item['cylinder_id'])
                        ->whereDate('allocation_date', $data['sale_date'])
                        ->where('is_reconciled', false)
                        ->get()
                        ->sum(fn ($a) => max(0, $a->qty - $a->sold_qty - $a->returned_qty));

                    if ($available < (int) $item['qty']) {
                        $cylinder = Cylinder::find($item['cylinder_id']);
                        $label    = $cylinder ? "{$cylinder->name} {$cylinder->size}" : "Cylinder #{$item['cylinder_id']}";
                        throw new \RuntimeException(
                            "Only {$available} unit(s) of {$label} allocated to you for {$data['sale_date']}. Cannot sell {$item['qty']}."
                        );
                    }
                }
            }

            $totalAmount  = 0;
            $allSaleItems = [];

            foreach ($data['items'] as $item) {
                $fifoResult = $this->fifoService->consume(
                    $item['cylinder_id'],
                    $item['qty'],
                    (float) $item['unit_price']
                );

                $this->stockService->removeFilledStock($item['cylinder_id'], $item['qty']);
                $totalAmount  += $fifoResult['total_revenue'];
                $allSaleItems  = array_merge($allSaleItems, $fifoResult['breakdown']);
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

            $dbFields = ['purchase_item_id', 'cylinder_id', 'qty', 'unit_price', 'unit_cost', 'profit'];
            foreach ($allSaleItems as $saleItemData) {
                SaleItem::create(array_merge(
                    array_intersect_key($saleItemData, array_flip($dbFields)),
                    ['sale_id' => $sale->id]
                ));
            }

            $this->updateAllocationSoldQty($data['salesman_id'], $data['items'], $data['sale_date']);

            if ($sale->customer_id && $paidAmount < $totalAmount) {
                Customer::where('id', $sale->customer_id)
                    ->increment('total_due', $totalAmount - $paidAmount);
            }

            $sale->load(['items.cylinder', 'customer', 'salesman']);

            // Record stock movements per cylinder
            $qtyCylinder = [];
            foreach ($data['items'] as $item) {
                $qtyCylinder[$item['cylinder_id']] = ($qtyCylinder[$item['cylinder_id']] ?? 0) + $item['qty'];
            }
            foreach ($qtyCylinder as $cylinderId => $qty) {
                $cylinder = Cylinder::find($cylinderId);
                $this->movements->record(
                    $cylinderId,
                    'sale',
                    -$qty,
                    $data['salesman_id'],
                    $sale->id,
                    "Sale #{$sale->id} — {$qty} pcs of {$cylinder?->name}"
                );
                $this->notifications->checkLowStock($cylinderId);
            }

            // Audit + large-sale notification
            $this->audit->log(
                'created', 'Sale', $sale->id, $data['salesman_id'],
                "Sale #{$sale->id} recorded for " . ($sale->customer?->name ?? 'walk-in') . " (৳" . number_format($totalAmount, 2) . ')',
                null, $sale->toArray()
            );
            $this->notifications->checkLargeSale($sale);

            return $sale;
        });
    }

    private function updateAllocationSoldQty(int $salesmanId, array $items, string $saleDate): void
    {
        $qtyByCylinder = [];
        foreach ($items as $item) {
            $cid = (int) $item['cylinder_id'];
            $qtyByCylinder[$cid] = ($qtyByCylinder[$cid] ?? 0) + (int) $item['qty'];
        }

        foreach ($qtyByCylinder as $cylinderId => $totalQty) {
            $allocations = StockAllocation::where('salesman_id', $salesmanId)
                ->where('cylinder_id', $cylinderId)
                ->whereDate('allocation_date', $saleDate)
                ->where('is_reconciled', false)
                ->orderBy('created_at', 'asc')
                ->get();

            $remaining = $totalQty;
            foreach ($allocations as $allocation) {
                if ($remaining <= 0) break;
                $capacity = max(0, $allocation->qty - $allocation->sold_qty - $allocation->returned_qty);
                $take     = min($remaining, $capacity);
                if ($take > 0) {
                    $allocation->increment('sold_qty', $take);
                    $remaining -= $take;
                }
            }
        }
    }

    public function deleteSale(Sale $sale): void
    {
        DB::transaction(function () use ($sale) {
            foreach ($sale->items as $saleItem) {
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

                $this->stockService->addFilledStock($saleItem->cylinder_id, $saleItem->qty);
            }

            $qtyByCylinder = [];
            foreach ($sale->items as $saleItem) {
                $cid = $saleItem->cylinder_id;
                $qtyByCylinder[$cid] = ($qtyByCylinder[$cid] ?? 0) + $saleItem->qty;
            }
            foreach ($qtyByCylinder as $cylinderId => $totalQty) {
                $allocations = StockAllocation::where('salesman_id', $sale->salesman_id)
                    ->where('cylinder_id', $cylinderId)
                    ->whereDate('allocation_date', $sale->sale_date)
                    ->where('is_reconciled', false)
                    ->orderBy('created_at', 'desc')
                    ->get();

                $remaining = $totalQty;
                foreach ($allocations as $allocation) {
                    if ($remaining <= 0) break;
                    $take = min($remaining, $allocation->sold_qty);
                    if ($take > 0) {
                        $allocation->decrement('sold_qty', $take);
                        $remaining -= $take;
                    }
                }

                $this->movements->record(
                    $cylinderId,
                    'sale_delete',
                    $totalQty,
                    auth()->id(),
                    $sale->id,
                    "Sale #{$sale->id} deleted — stock restored"
                );
            }

            $dueAmount = (float) $sale->total_amount - (float) $sale->paid_amount;
            if ($sale->customer_id && $dueAmount > 0) {
                Customer::where('id', $sale->customer_id)->decrement('total_due', $dueAmount);
            }

            $this->audit->log(
                'deleted', 'Sale', $sale->id, auth()->id(),
                "Sale #{$sale->id} deleted — stock restored",
                $sale->toArray(), null
            );

            $sale->delete();
        });
    }
}
