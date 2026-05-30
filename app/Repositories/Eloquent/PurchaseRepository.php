<?php

namespace App\Repositories\Eloquent;

use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Repositories\Contracts\PurchaseRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class PurchaseRepository implements PurchaseRepositoryInterface
{
    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return Purchase::with(['supplier', 'items.cylinder', 'recordedBy'])
            ->orderByDesc('purchase_date')
            ->paginate($perPage);
    }

    public function findById(int $id): ?Purchase
    {
        return Purchase::with(['supplier', 'items.cylinder'])->find($id);
    }

    public function create(array $data): Purchase
    {
        return Purchase::create($data);
    }

    public function update(Purchase $purchase, array $data): Purchase
    {
        $purchase->update($data);
        return $purchase->fresh(['supplier', 'items.cylinder']);
    }

    public function fifoQueue(int $cylinderId): Collection
    {
        return PurchaseItem::fifoQueue($cylinderId)
            ->with('purchase.supplier')
            ->get();
    }

    public function lotsByStatus(string $status): Collection
    {
        return PurchaseItem::where('status', $status)
            ->with(['cylinder', 'purchase.supplier'])
            ->orderByDesc('created_at')
            ->get();
    }
}
