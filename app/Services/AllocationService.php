<?php

namespace App\Services;

use App\Models\StockAllocation;

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

        $unsold = max(0, $allocation->qty - $soldQty - $returnedQty);
        if ($unsold > 0) {
            $this->stockService->addFilledStock($allocation->cylinder_id, $unsold);
            $this->movements->record(
                $allocation->cylinder_id,
                'eod_return',
                $unsold,
                auth()->id(),
                $allocation->id,
                "EOD reconcile #{$allocation->id} — {$unsold} unsold units returned to stock"
            );
        }

        if ($returnedQty > 0) {
            $this->stockService->addEmptyStock($allocation->cylinder_id, $returnedQty);
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
            null, $allocation->toArray()
        );

        return $allocation->fresh(['salesman', 'cylinder']);
    }
}
