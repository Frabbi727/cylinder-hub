<?php

namespace App\Repositories\Contracts;

use App\Models\CylinderStock;
use Illuminate\Support\Collection;

interface StockRepositoryInterface
{
    public function all(): Collection;
    public function forCylinder(int $cylinderId): ?CylinderStock;
    public function belowReorder(): Collection;
    public function upsert(int $cylinderId, array $data): CylinderStock;
}
