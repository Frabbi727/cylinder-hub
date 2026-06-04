<?php

namespace App\Repositories\Contracts;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface CustomerRepositoryInterface
{
    public function paginate(int $perPage = 15, ?User $user = null): LengthAwarePaginator;
    public function findById(int $id): ?Customer;
    public function create(array $data): Customer;
    public function update(Customer $customer, array $data): Customer;
    public function delete(Customer $customer): void;
    public function withDue(?User $user = null): Collection;
    public function search(string $term, ?User $user = null): Collection;
}
