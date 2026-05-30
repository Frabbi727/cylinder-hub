<?php

namespace App\Repositories\Eloquent;

use App\Models\Cylinder;
use App\Repositories\Contracts\CylinderRepositoryInterface;
use Illuminate\Support\Collection;

class CylinderRepository implements CylinderRepositoryInterface
{
    public function all(): Collection
    {
        return Cylinder::with('stock')->get();
    }

    public function allActive(): Collection
    {
        return Cylinder::active()->with('stock')->get();
    }

    public function findById(int $id): ?Cylinder
    {
        return Cylinder::with('stock')->find($id);
    }

    public function create(array $data): Cylinder
    {
        return Cylinder::create($data);
    }

    public function update(Cylinder $cylinder, array $data): Cylinder
    {
        $cylinder->update($data);
        return $cylinder->fresh('stock');
    }

    public function delete(Cylinder $cylinder): void
    {
        $cylinder->delete();
    }
}
