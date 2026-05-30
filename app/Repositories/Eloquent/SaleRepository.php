<?php

namespace App\Repositories\Eloquent;

use App\Models\Sale;
use App\Repositories\Contracts\SaleRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class SaleRepository implements SaleRepositoryInterface
{
    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return Sale::with(['customer', 'salesman', 'items.cylinder'])
            ->orderByDesc('sale_date')
            ->paginate($perPage);
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
