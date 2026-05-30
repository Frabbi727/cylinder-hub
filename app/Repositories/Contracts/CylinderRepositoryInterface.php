<?php

namespace App\Repositories\Contracts;

use App\Models\Cylinder;
use Illuminate\Support\Collection;

interface CylinderRepositoryInterface
{
    public function all(): Collection;
    public function allActive(): Collection;
    public function findById(int $id): ?Cylinder;
    public function create(array $data): Cylinder;
    public function update(Cylinder $cylinder, array $data): Cylinder;
    public function delete(Cylinder $cylinder): void;
}
