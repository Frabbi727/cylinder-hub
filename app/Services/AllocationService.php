<?php

namespace App\Services;

use App\Models\StockAllocation;
use App\Models\User;

class AllocationService
{
    public function __construct(private StockService $stockService) {}

    public function allocate(int $salesmanId, int $cylinderId, int $qty, string $date): StockAllocation
    {
        $this->stockService->removeFilledStock($cylinderId, $qty);

        return StockAllocation::create([
            'salesman_id'     => $salesmanId,
            'cylinder_id'     => $cylinderId,
            'allocation_date' => $date,
            'qty'             => $qty,
            'sold_qty'        => 0,
            'returned_qty'    => 0,
            'collected_amount'=> 0,
            'is_reconciled'   => false,
        ]);
    }

    public function reconcile(
        StockAllocation $allocation,
        int $soldQty,
        int $returnedQty,
        float $collectedAmount
    ): StockAllocation {
        // Return unsold cylinders back to filled stock
        $unsold = $allocation->qty - $soldQty - $returnedQty;
        if ($unsold > 0) {
            $this->stockService->addFilledStock($allocation->cylinder_id, $unsold);
        }

        // Returned empties go to empty stock
        if ($returnedQty > 0) {
            $this->stockService->addEmptyStock($allocation->cylinder_id, $returnedQty);
        }

        $allocation->update([
            'sold_qty'         => $soldQty,
            'returned_qty'     => $returnedQty,
            'collected_amount' => $collectedAmount,
            'is_reconciled'    => true,
        ]);

        return $allocation->fresh(['salesman', 'cylinder']);
    }
}
