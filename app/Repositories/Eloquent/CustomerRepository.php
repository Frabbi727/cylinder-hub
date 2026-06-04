<?php

namespace App\Repositories\Eloquent;

use App\Models\Customer;
use App\Models\User;
use App\Repositories\Contracts\CustomerRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class CustomerRepository implements CustomerRepositoryInterface
{
    public function paginate(int $perPage = 15, ?User $user = null): LengthAwarePaginator
    {
        $query = Customer::orderBy('name');
        if ($user?->isSalesman()) {
            $query->where('added_by', $user->id);
        }
        return $query->paginate($perPage);
    }

    public function findById(int $id): ?Customer
    {
        return Customer::find($id);
    }

    public function create(array $data): Customer
    {
        return Customer::create($data);
    }

    public function update(Customer $customer, array $data): Customer
    {
        $customer->update($data);
        return $customer->fresh();
    }

    public function delete(Customer $customer): void
    {
        $customer->delete();
    }

    public function withDue(?User $user = null): Collection
    {
        $query = Customer::withDue()->orderByDesc('total_due');
        if ($user?->isSalesman()) {
            $query->where('added_by', $user->id);
        }
        return $query->get();
    }

    public function search(string $term, ?User $user = null): Collection
    {
        $query = Customer::search($term);
        if ($user?->isSalesman()) {
            $query->where('added_by', $user->id);
        }
        return $query->limit(20)->get();
    }
}
