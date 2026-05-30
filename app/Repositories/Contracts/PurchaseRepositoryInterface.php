<?php

namespace App\Repositories\Contracts;

use App\Models\Purchase;
use App\Models\PurchaseItem;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface PurchaseRepositoryInterface
{
    public function paginate(int $perPage = 15): LengthAwarePaginator;
    public function findById(int $id): ?Purchase;
    public function create(array $data): Purchase;
    public function update(Purchase $purchase, array $data): Purchase;
    public function fifoQueue(int $cylinderId): Collection;
    public function lotsByStatus(string $status): Collection;
}
