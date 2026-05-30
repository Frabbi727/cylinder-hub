<?php

namespace App\Repositories\Contracts;

use App\Models\Customer;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface CustomerRepositoryInterface
{
    public function paginate(int $perPage = 15): LengthAwarePaginator;
    public function findById(int $id): ?Customer;
    public function create(array $data): Customer;
    public function update(Customer $customer, array $data): Customer;
    public function delete(Customer $customer): void;
    public function withDue(): Collection;
    public function search(string $term): Collection;
}
