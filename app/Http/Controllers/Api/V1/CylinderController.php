<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreCylinderRequest;
use App\Http\Resources\Api\CylinderResource;
use App\Models\Cylinder;
use App\Repositories\Contracts\CylinderRepositoryInterface;
use Illuminate\Http\JsonResponse;

class CylinderController extends Controller
{
    public function __construct(private CylinderRepositoryInterface $cylinders) {}

    public function index(): JsonResponse
    {
        return $this->success(CylinderResource::collection($this->cylinders->all()));
    }

    public function store(StoreCylinderRequest $request): JsonResponse
    {
        $cylinder = $this->cylinders->create($request->validated());
        return $this->created(new CylinderResource($cylinder));
    }

    public function show(Cylinder $cylinder): JsonResponse
    {
        return $this->success(new CylinderResource($cylinder->load('stock')));
    }

    public function update(StoreCylinderRequest $request, Cylinder $cylinder): JsonResponse
    {
        $cylinder = $this->cylinders->update($cylinder, $request->validated());
        return $this->success(new CylinderResource($cylinder));
    }

    public function destroy(Cylinder $cylinder): JsonResponse
    {
        $this->cylinders->delete($cylinder);
        return $this->deleted('Cylinder deleted.');
    }
}
