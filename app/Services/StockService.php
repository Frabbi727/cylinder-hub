<?php

namespace App\Services;

use App\Models\CylinderStock;

class StockService
{
    public function addFilledStock(int $cylinderId, int $qty): void
    {
        $stock = $this->getOrCreate($cylinderId);
        $stock->incrementFilled($qty);
    }

    public function removeFilledStock(int $cylinderId, int $qty): void
    {
        $stock = $this->getOrCreate($cylinderId);
        $stock->decrementFilled($qty);
    }

    public function addEmptyStock(int $cylinderId, int $qty): void
    {
        $stock = $this->getOrCreate($cylinderId);
        $stock->incrementEmpty($qty);
    }

    public function removeEmptyStock(int $cylinderId, int $qty): void
    {
        $stock = $this->getOrCreate($cylinderId);
        $stock->decrementEmpty($qty);
    }

    public function getCurrentStock(int $cylinderId): array
    {
        $stock = CylinderStock::where('cylinder_id', $cylinderId)->first();
        return [
            'filled_qty' => $stock?->filled_qty ?? 0,
            'empty_qty'  => $stock?->empty_qty ?? 0,
            'capacity'   => $stock?->capacity ?? 0,
        ];
    }

    private function getOrCreate(int $cylinderId): CylinderStock
    {
        return CylinderStock::firstOrCreate(
            ['cylinder_id' => $cylinderId],
            ['filled_qty' => 0, 'empty_qty' => 0, 'capacity' => 100]
        );
    }
}
