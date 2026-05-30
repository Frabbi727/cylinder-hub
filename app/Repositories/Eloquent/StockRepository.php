<?php

namespace App\Repositories\Eloquent;

use App\Models\CylinderStock;
use App\Models\Cylinder;
use App\Repositories\Contracts\StockRepositoryInterface;
use Illuminate\Support\Collection;

class StockRepository implements StockRepositoryInterface
{
    public function all(): Collection
    {
        return CylinderStock::with('cylinder')->get();
    }

    public function forCylinder(int $cylinderId): ?CylinderStock
    {
        return CylinderStock::where('cylinder_id', $cylinderId)->first();
    }

    public function belowReorder(): Collection
    {
        return CylinderStock::with('cylinder')
            ->whereHas('cylinder', fn ($q) => $q->where('status', 'active'))
            ->whereColumn('filled_qty', '<=', 'cylinders.reorder_level')
            ->join('cylinders', 'cylinder_stocks.cylinder_id', '=', 'cylinders.id')
            ->select('cylinder_stocks.*')
            ->get();
    }

    public function upsert(int $cylinderId, array $data): CylinderStock
    {
        return CylinderStock::updateOrCreate(
            ['cylinder_id' => $cylinderId],
            $data
        );
    }
}
