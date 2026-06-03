<?php

namespace App\Repositories\Contracts;

use App\Models\Sale;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface SaleRepositoryInterface
{
    public function paginate(?User $user = null, bool $todayOnly = false, array $filters = []): LengthAwarePaginator;
    public function findById(int $id): ?Sale;
    public function create(array $data): Sale;
    public function delete(Sale $sale): void;
    public function todaySales(): Collection;
    public function salesByPeriod(string $from, string $to): Collection;
    public function salesmanSales(int $salesmanId, ?string $date = null): Collection;
}
