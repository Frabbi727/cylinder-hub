<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CylinderStock;
use App\Models\CylinderReturn;
use App\Repositories\Contracts\StockRepositoryInterface;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function __construct(
        private StockRepositoryInterface $stockRepository,
        private StockService $stockService,
    ) {}

    public function index(): JsonResponse
    {
        $stock = $this->stockRepository->all();
        return response()->json($stock);
    }

    public function returns(Request $request): JsonResponse
    {
        $returns = CylinderReturn::with(['cylinder', 'customer', 'recordedBy'])
            ->orderByDesc('return_date')
            ->paginate(15);
        return response()->json($returns);
    }

    public function storeReturn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cylinder_id' => 'required|integer|exists:cylinders,id',
            'qty'         => 'required|integer|min:1',
            'type'        => 'required|in:empty_return,error_correction',
            'return_date' => 'required|date',
            'customer_id' => 'nullable|integer|exists:customers,id',
            'sale_id'     => 'nullable|integer|exists:sales,id',
            'notes'       => 'nullable|string',
        ]);

        $data['recorded_by'] = auth()->id();
        $return = CylinderReturn::create($data);

        if ($data['type'] === 'empty_return') {
            $this->stockService->addEmptyStock($data['cylinder_id'], $data['qty']);
        }

        return response()->json($return->load(['cylinder', 'customer']), 201);
    }
}
