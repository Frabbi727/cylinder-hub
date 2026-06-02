<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CylinderReturn;
use App\Models\StockMovement;
use App\Repositories\Contracts\StockRepositoryInterface;
use App\Services\StockMovementService;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function __construct(
        private StockRepositoryInterface $stockRepository,
        private StockService $stockService,
        private StockMovementService $movements,
    ) {}

    public function index(): JsonResponse
    {
        return $this->success($this->stockRepository->all());
    }

    public function returns(Request $request): JsonResponse
    {
        $returns = CylinderReturn::with(['cylinder', 'customer', 'recordedBy'])
            ->orderByDesc('return_date')
            ->paginate(15);

        return $this->paginated($returns);
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
        $return              = CylinderReturn::create($data);

        if ($data['type'] === 'empty_return') {
            $this->stockService->addEmptyStock($data['cylinder_id'], $data['qty']);
        }

        $this->movements->record(
            $data['cylinder_id'],
            'cylinder_return',
            $data['qty'],
            auth()->id(),
            $return->id,
            "Empty return #{$return->id} — {$data['qty']} cylinders received from customer"
        );

        return $this->created($return->load(['cylinder', 'customer']), 'Return recorded.');
    }

    public function history(int $cylinderId): JsonResponse
    {
        $movements = StockMovement::with(['recordedBy'])
            ->where('cylinder_id', $cylinderId)
            ->orderByDesc('created_at')
            ->paginate(30);

        return $this->paginated($movements);
    }
}
