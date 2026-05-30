<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreCylinderRequest;
use App\Http\Resources\Api\CylinderResource;
use App\Repositories\Contracts\CylinderRepositoryInterface;
use App\Models\Cylinder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CylinderController extends Controller
{
    public function __construct(private CylinderRepositoryInterface $cylinders) {}

    public function index(): AnonymousResourceCollection
    {
        return CylinderResource::collection($this->cylinders->all());
    }

    public function store(StoreCylinderRequest $request): CylinderResource
    {
        $cylinder = $this->cylinders->create($request->validated());
        return new CylinderResource($cylinder);
    }

    public function show(Cylinder $cylinder): CylinderResource
    {
        return new CylinderResource($cylinder->load('stock'));
    }

    public function update(StoreCylinderRequest $request, Cylinder $cylinder): CylinderResource
    {
        $cylinder = $this->cylinders->update($cylinder, $request->validated());
        return new CylinderResource($cylinder);
    }

    public function destroy(Cylinder $cylinder): JsonResponse
    {
        $this->cylinders->delete($cylinder);
        return response()->json(['message' => 'Cylinder deleted.']);
    }
}
