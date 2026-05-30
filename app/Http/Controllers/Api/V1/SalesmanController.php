<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreAllocationRequest;
use App\Models\User;
use App\Models\StockAllocation;
use App\Repositories\Contracts\SaleRepositoryInterface;
use App\Services\AllocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesmanController extends Controller
{
    public function __construct(
        private AllocationService $allocationService,
        private SaleRepositoryInterface $saleRepository,
    ) {}

    public function index(): JsonResponse
    {
        $salesmen = User::where('role', 'salesman')
            ->where('is_active', true)
            ->with(['allocations' => fn ($q) => $q->today()->with('cylinder')])
            ->get();

        return response()->json($salesmen);
    }

    public function show(User $user): JsonResponse
    {
        $user->load([
            'allocations' => fn ($q) => $q->today()->with('cylinder'),
        ]);
        $todaySales = $this->saleRepository->salesmanSales($user->id, today()->toDateString());

        return response()->json([
            'salesman'    => $user,
            'today_sales' => $todaySales,
        ]);
    }

    public function allocate(StoreAllocationRequest $request, User $salesman): JsonResponse
    {
        $data = $request->validated();
        $allocation = $this->allocationService->allocate(
            $salesman->id,
            $data['cylinder_id'],
            $data['qty'],
            $data['allocation_date'] ?? today()->toDateString()
        );

        return response()->json($allocation->load('cylinder'), 201);
    }

    public function reconcile(Request $request, StockAllocation $allocation): JsonResponse
    {
        $data = $request->validate([
            'sold_qty'         => 'required|integer|min:0',
            'returned_qty'     => 'required|integer|min:0',
            'collected_amount' => 'required|numeric|min:0',
        ]);

        $allocation = $this->allocationService->reconcile(
            $allocation,
            $data['sold_qty'],
            $data['returned_qty'],
            $data['collected_amount']
        );

        return response()->json($allocation);
    }
}
