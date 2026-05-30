<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreSaleRequest;
use App\Http\Resources\Api\SaleResource;
use App\Models\Sale;
use App\Repositories\Contracts\SaleRepositoryInterface;
use App\Services\SaleService;
use Illuminate\Http\JsonResponse;

class SaleController extends Controller
{
    public function __construct(
        private SaleRepositoryInterface $sales,
        private SaleService $saleService,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json($this->sales->paginate());
    }

    public function store(StoreSaleRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['salesman_id'] = auth()->id();

        $sale = $this->saleService->createSale($data);
        return response()->json(new SaleResource($sale), 201);
    }

    public function show(Sale $sale): SaleResource
    {
        return new SaleResource($sale->load(['customer', 'salesman', 'items.cylinder']));
    }

    public function destroy(Sale $sale): JsonResponse
    {
        $sale->load('items');
        $this->saleService->deleteSale($sale);
        return response()->json(['message' => 'Sale deleted and stock restored.']);
    }
}
