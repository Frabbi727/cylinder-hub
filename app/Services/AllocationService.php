<?php

namespace App\Services;

use App\Models\CylinderStock;
use App\Models\DueCollection;
use App\Models\StockAllocation;
use Illuminate\Support\Facades\DB;

class AllocationService
{
    public function __construct(
        private StockService $stockService,
        private StockMovementService $movements,
        private AuditLogService $audit,
    ) {}

    public function allocate(int $salesmanId, int $cylinderId, int $qty, float $salePrice, string $date): StockAllocation
    {
        return DB::transaction(function () use ($salesmanId, $cylinderId, $qty, $salePrice, $date) {
            $stock     = CylinderStock::where('cylinder_id', $cylinderId)->lockForUpdate()->first();
            $available = $stock?->filled_qty ?? 0;

            if ($qty > $available) {
                throw new \RuntimeException(
                    "Insufficient stock. Only {$available} filled cylinder(s) available for allocation."
                );
            }

            $this->stockService->removeFilledStock($cylinderId, $qty);

            $allocation = StockAllocation::create([
                'salesman_id'      => $salesmanId,
                'cylinder_id'      => $cylinderId,
                'allocation_date'  => $date,
                'qty'              => $qty,
                'sale_price'       => $salePrice,
                'sold_qty'         => 0,
                'returned_qty'     => 0,
                'collected_amount' => 0,
                'is_reconciled'    => false,
            ]);

            $this->movements->record(
                $cylinderId,
                'allocation',
                -$qty,
                auth()->id(),
                $allocation->id,
                "Allocation #{$allocation->id} — {$qty} pcs allocated to salesman #{$salesmanId}"
            );

            $this->audit->log(
                'created', 'Allocation', $allocation->id, auth()->id(),
                "Admin allocated {$qty} pcs of cylinder #{$cylinderId} to salesman #{$salesmanId}",
                null, $allocation->toArray()
            );

            return $allocation;
        });
    }

    public function updateReconciliation(
        StockAllocation $allocation,
        int $newSoldQty,
        float $newCollectedAmount
    ): StockAllocation {
        return DB::transaction(function () use ($allocation, $newSoldQty, $newCollectedAmount) {
            $oldFilledBack = $allocation->qty - $allocation->sold_qty;
            $newFilledBack = $allocation->qty - $newSoldQty;
            $netChange     = $newFilledBack - $oldFilledBack;

            if ($netChange > 0) {
                $this->stockService->addFilledStock($allocation->cylinder_id, $netChange);
            } elseif ($netChange < 0) {
                $this->stockService->removeFilledStock($allocation->cylinder_id, abs($netChange));
            }

            if ($netChange !== 0) {
                $this->movements->record(
                    $allocation->cylinder_id,
                    'reconcile_adjustment',
                    $netChange,
                    auth()->id(),
                    $allocation->id,
                    "Admin adjusted Allocation #{$allocation->id}: sold {$allocation->sold_qty}→{$newSoldQty}, stock Δ{$netChange}"
                );
            }

            $this->audit->log(
                'updated', 'Allocation', $allocation->id, auth()->id(),
                "Admin edited reconciliation #{$allocation->id} — sold {$allocation->sold_qty}→{$newSoldQty}, cash ৳{$allocation->collected_amount}→{$newCollectedAmount}",
                null, null
            );

            $allocation->update([
                'sold_qty'         => $newSoldQty,
                'returned_qty'     => $allocation->qty - $newSoldQty,
                'collected_amount' => $newCollectedAmount,
            ]);

            return $allocation->fresh(['salesman', 'cylinder']);
        });
    }

    public function reconcile(
        StockAllocation $allocation,
        int $soldQty,
        int $returnedQty,
        float $collectedAmount
    ): StockAllocation {
        if ($allocation->is_reconciled) {
            throw new \LogicException('Allocation #'.$allocation->id.' is already reconciled.');
        }

        return DB::transaction(function () use ($allocation, $soldQty, $returnedQty, $collectedAmount) {
            // returnedQty = unsold FILLED cylinders explicitly handed back to warehouse
            // unsold      = any remainder not explicitly returned (also filled, also goes back)
            // Empty shells from customers are tracked separately via cylinder_returns and are
            // already added to empty_qty when logged — do NOT add them here again.
            $unsold = max(0, $allocation->qty - $soldQty - $returnedQty);
            $totalFilledBack = $returnedQty + $unsold;

            if ($totalFilledBack > 0) {
                $this->stockService->addFilledStock($allocation->cylinder_id, $totalFilledBack);
                $this->movements->record(
                    $allocation->cylinder_id,
                    'eod_return',
                    $totalFilledBack,
                    auth()->id(),
                    $allocation->id,
                    "EOD #{$allocation->id} — {$soldQty} sold, {$returnedQty} returned, {$unsold} auto-unsold → {$totalFilledBack} filled back to stock"
                );
            }

            $allocation->update([
                'sold_qty'         => $soldQty,
                'returned_qty'     => $returnedQty,
                'collected_amount' => $collectedAmount,
                'is_reconciled'    => true,
            ]);

            // Sweep all pending due collections by this salesman into this EOD cycle.
            // Any DueCollection with reconciled_allocation_id = null was collected
            // since the previous EOD and is now being submitted with this reconciliation.
            DueCollection::where('collected_by', $allocation->salesman_id)
                ->whereNull('reconciled_allocation_id')
                ->update(['reconciled_allocation_id' => $allocation->id]);

            $this->audit->log(
                'reconciled', 'Allocation', $allocation->id, auth()->id(),
                "Salesman #{$allocation->salesman_id} submitted EOD — {$soldQty} sold, {$returnedQty} returned, ৳" . number_format($collectedAmount, 2) . ' cash',
                null, null
            );

            return $allocation->fresh(['salesman', 'cylinder']);
        });
    }
}
