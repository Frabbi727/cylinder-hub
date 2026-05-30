<?php

namespace App\Services;

use App\Models\PurchaseItem;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FifoService
{
    /**
     * Simulate a FIFO sale — read-only, no DB changes.
     * Returns breakdown of which lots will be consumed.
     */
    public function simulate(int $cylinderId, int $qty, float $salePrice): array
    {
        $lots = PurchaseItem::fifoQueue($cylinderId)
            ->with('purchase.supplier')
            ->get();

        return $this->walkFifo($lots, $qty, $salePrice, writeMode: false);
    }

    /**
     * Consume stock FIFO — writes remaining_qty and status to DB.
     * Returns the sale items data (lot breakdowns) to be persisted.
     * Must be called inside a DB transaction.
     */
    public function consume(int $cylinderId, int $qty, float $salePrice): array
    {
        $lots = PurchaseItem::fifoQueue($cylinderId)
            ->lockForUpdate()
            ->get();

        $result = $this->walkFifo($lots, $qty, $salePrice, writeMode: true);

        if ($result['remaining_qty_needed'] > 0) {
            throw new \RuntimeException("Insufficient FIFO stock for cylinder #{$cylinderId}. Needed {$qty}, only " . ($qty - $result['remaining_qty_needed']) . " available.");
        }

        return $result;
    }

    private function walkFifo(Collection $lots, int $totalQty, float $salePrice, bool $writeMode): array
    {
        $breakdown = [];
        $totalCost = 0;
        $totalProfit = 0;
        $remaining = $totalQty;

        foreach ($lots as $lot) {
            if ($remaining <= 0) break;

            $take = min($remaining, $lot->remaining_qty);
            $cost = $take * (float) $lot->unit_cost;
            $revenue = $take * $salePrice;
            $profit = $revenue - $cost;

            $breakdown[] = [
                'purchase_item_id' => $lot->id,
                'cylinder_id'      => $lot->cylinder_id,
                'qty'              => $take,
                'unit_price'       => $salePrice,
                'unit_cost'        => (float) $lot->unit_cost,
                'profit'           => $profit,
                'lot_id_label'     => "L-{$lot->id}",
            ];

            $totalCost   += $cost;
            $totalProfit += $profit;
            $remaining   -= $take;

            if ($writeMode) {
                $newRemaining = $lot->remaining_qty - $take;
                $lot->update([
                    'remaining_qty' => $newRemaining,
                    'status'        => $newRemaining === 0 ? 'done' : 'active',
                ]);
            }
        }

        return [
            'breakdown'           => $breakdown,
            'total_cost'          => $totalCost,
            'total_profit'        => $totalProfit,
            'total_revenue'       => $totalQty * $salePrice,
            'remaining_qty_needed'=> $remaining,
            'lots_consumed'       => count($breakdown),
        ];
    }
}
