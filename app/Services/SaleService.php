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
                    // Check all unreconciled allocations up to and including the sale date
                    // so carry-over stock from previous days can still be sold
                    $available = StockAllocation::where('salesman_id', $data['salesman_id'])
                        ->where('cylinder_id', $item['cylinder_id'])
                        ->whereDate('allocation_date', '<=', $data['sale_date'])
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

            $totalAmount    = 0;
            $allSaleItems   = [];
            $isSalesmanSale = ($data['salesman_role'] ?? null) === 'salesman';

            foreach ($data['items'] as $item) {
                $fifoResult = $this->fifoService->consume(
                    $item['cylinder_id'],
                    $item['qty'],
                    (float) $item['unit_price']
                );

                // For salesman sales the warehouse was already decremented at allocation time.
                // Only decrement here for direct (admin) sales.
                if (! $isSalesmanSale) {
                    $this->stockService->removeFilledStock($item['cylinder_id'], $item['qty']);
                }

                $totalAmount  += $fifoResult['total_revenue'];
                $allSaleItems  = array_merge($allSaleItems, $fifoResult['breakdown']);
            }

            if (($data['payment_type'] ?? null) === 'due') {
                $paidAmount = 0;
            } else {
                $paidAmount = min((float) ($data['paid_amount'] ?? $totalAmount), $totalAmount);
            }
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

            $this->updateAllocationSoldQty(
                $data['salesman_id'], $data['items'], $data['sale_date'],
                $paidAmount, $totalAmount
            );

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

    private function updateAllocationSoldQty(
        int $salesmanId, array $items, string $saleDate,
        float $paidAmount = 0, float $totalAmount = 0
    ): void {
        $qtyByCylinder   = [];
        $priceByCylinder = [];
        foreach ($items as $item) {
            $cid = (int) $item['cylinder_id'];
            $qtyByCylinder[$cid]   = ($qtyByCylinder[$cid] ?? 0) + (int) $item['qty'];
            $priceByCylinder[$cid] = (float) $item['unit_price'];
        }

        foreach ($qtyByCylinder as $cylinderId => $totalQty) {
            // Consume from oldest allocation first (FIFO) so carry-over stock is used up first
            $allocations = StockAllocation::where('salesman_id', $salesmanId)
                ->where('cylinder_id', $cylinderId)
                ->whereDate('allocation_date', '<=', $saleDate)
                ->where('is_reconciled', false)
                ->orderBy('allocation_date', 'asc')
                ->orderBy('created_at', 'asc')
                ->get();

            $remaining = $totalQty;
            foreach ($allocations as $allocation) {
                if ($remaining <= 0) break;
                $capacity = max(0, $allocation->qty - $allocation->sold_qty - $allocation->returned_qty);
                $take     = min($remaining, $capacity);
                if ($take > 0) {
                    $allocation->increment('sold_qty', $take);
                    // Attribute proportional cash to this specific allocation
                    if ($totalAmount > 0) {
                        $lineRevenue  = $take * ($priceByCylinder[$cylinderId] ?? 0);
                        $proportion   = $lineRevenue / $totalAmount;
                        $cashForAlloc = round($paidAmount * $proportion, 2);
                        $allocation->increment('collected_amount', $cashForAlloc);
                    }
                    $remaining -= $take;
                }
            }
        }
    }

    public function deleteSale(Sale $sale): void
    {
        DB::transaction(function () use ($sale) {
            $sale->loadMissing('salesman');
            $isSalesmanSale = $sale->salesman?->role === 'salesman';

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

                // For salesman sales, stock returns via allocation sold_qty reversal below.
                // Only restore warehouse stock for direct (admin) sales.
                if (! $isSalesmanSale) {
                    $this->stockService->addFilledStock($saleItem->cylinder_id, $saleItem->qty);
                }
            }

            $qtyByCylinder   = [];
            $priceByCylinder = [];
            foreach ($sale->items as $saleItem) {
                $cid = $saleItem->cylinder_id;
                $qtyByCylinder[$cid]   = ($qtyByCylinder[$cid] ?? 0) + $saleItem->qty;
                $priceByCylinder[$cid] = (float) $saleItem->unit_price;
            }
            foreach ($qtyByCylinder as $cylinderId => $totalQty) {
                // When reversing a sale, give back to the most recent allocation first
                $allocations = StockAllocation::where('salesman_id', $sale->salesman_id)
                    ->where('cylinder_id', $cylinderId)
                    ->whereDate('allocation_date', '<=', $sale->sale_date)
                    ->where('is_reconciled', false)
                    ->orderBy('allocation_date', 'desc')
                    ->orderBy('created_at', 'desc')
                    ->get();

                $remaining = $totalQty;
                foreach ($allocations as $allocation) {
                    if ($remaining <= 0) break;
                    $take = min($remaining, $allocation->sold_qty);
                    if ($take > 0) {
                        $allocation->decrement('sold_qty', $take);
                        // Reverse the proportional collected_amount for this allocation
                        if ((float) $sale->total_amount > 0) {
                            $lineRevenue   = $take * ($priceByCylinder[$cylinderId] ?? 0);
                            $proportion    = $lineRevenue / (float) $sale->total_amount;
                            $cashToReverse = round((float) $sale->paid_amount * $proportion, 2);
                            $safeReverse   = max(0, min($cashToReverse, (float) $allocation->collected_amount));
                            if ($safeReverse > 0) {
                                $allocation->decrement('collected_amount', $safeReverse);
                            }
                        }
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
