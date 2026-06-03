<?php

namespace App\Services;

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
        $this->stockService->removeFilledStock($cylinderId, $qty);

        $allocation = StockAllocation::create([
            'salesman_id'     => $salesmanId,
            'cylinder_id'     => $cylinderId,
            'allocation_date' => $date,
            'qty'             => $qty,
            'sale_price'      => $salePrice,
            'sold_qty'        => 0,
            'returned_qty'    => 0,
            'collected_amount'=> 0,
            'is_reconciled'   => false,
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

            $this->audit->log(
                'reconciled', 'Allocation', $allocation->id, auth()->id(),
                "Salesman #{$allocation->salesman_id} submitted EOD — {$soldQty} sold, {$returnedQty} returned, ৳" . number_format($collectedAmount, 2) . ' cash',
                null, null
            );

            return $allocation->fresh(['salesman', 'cylinder']);
        });
    }
}
