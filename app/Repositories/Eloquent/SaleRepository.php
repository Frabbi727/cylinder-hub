<?php

namespace App\Repositories\Eloquent;

use App\Models\Sale;
use App\Models\User;
use App\Repositories\Contracts\SaleRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class SaleRepository implements SaleRepositoryInterface
{
    public function paginate(?User $user = null, bool $todayOnly = false, array $filters = []): LengthAwarePaginator
    {
        $query = Sale::with(['customer', 'salesman', 'items.cylinder'])
            ->orderByDesc('sale_date')
            ->orderByDesc('created_at');

        if ($user?->isSalesman()) {
            $query->where('salesman_id', $user->id);
        }

        if ($todayOnly) {
            $query->whereDate('sale_date', today());
        }

        if (! empty($filters['from'])) {
            $query->whereDate('sale_date', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->whereDate('sale_date', '<=', $filters['to']);
        }
        if (! empty($filters['payment_type']) && $filters['payment_type'] !== 'all') {
            $query->where('payment_type', $filters['payment_type']);
        }
        if (! empty($filters['search'])) {
            $query->whereHas('customer', fn ($q) => $q->where('name', 'like', '%'.$filters['search'].'%'));
        }
        if (! empty($filters['has_due'])) {
            $query->whereRaw('(total_amount - paid_amount) > 0');
        }

        return $query->paginate(20);
    }

    public function findById(int $id): ?Sale
    {
        return Sale::with(['customer', 'salesman', 'items.cylinder'])->find($id);
    }

    public function create(array $data): Sale
    {
        return Sale::create($data);
    }

    public function delete(Sale $sale): void
    {
        $sale->delete();
    }

    public function todaySales(): Collection
    {
        return Sale::today()
            ->with(['customer', 'salesman', 'items.cylinder'])
            ->orderByDesc('created_at')
            ->get();
    }

    public function salesByPeriod(string $from, string $to): Collection
    {
        return Sale::whereBetween('sale_date', [$from, $to])
            ->with(['items'])
            ->get();
    }

    public function salesmanSales(int $salesmanId, ?string $date = null): Collection
    {
        $query = Sale::forSalesman($salesmanId)->with(['customer', 'items.cylinder']);
        if ($date) {
            $query->whereDate('sale_date', $date);
        }
        return $query->orderByDesc('created_at')->get();
    }
}
