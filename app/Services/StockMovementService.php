<?php

namespace App\Services;

use App\Models\CylinderStock;
use App\Models\StockMovement;

class StockMovementService
{
    public function record(
        int $cylinderId,
        string $eventType,
        int $changeQty,
        int $recordedBy,
        ?int $referenceId = null,
        ?string $notes = null
    ): void {
        $balanceAfter = (int) CylinderStock::where('cylinder_id', $cylinderId)->value('filled_qty');

        StockMovement::create([
            'cylinder_id'  => $cylinderId,
            'event_type'   => $eventType,
            'change_qty'   => $changeQty,
            'balance_after'=> $balanceAfter,
            'reference_id' => $referenceId,
            'recorded_by'  => $recordedBy,
            'notes'        => $notes,
        ]);
    }
}
