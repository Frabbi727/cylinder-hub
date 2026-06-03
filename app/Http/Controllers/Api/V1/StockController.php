<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CylinderReturn;
use App\Models\StockAllocation;
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
        $user  = auth()->user();
        $query = CylinderReturn::with(['cylinder', 'customer', 'recordedBy', 'salesman'])
            ->orderByDesc('return_date')
            ->orderByDesc('created_at');

        // Salesmen only see their own returns
        if ($user->isSalesman()) {
            $query->where('salesman_id', $user->id);
        }

        // Filters
        if ($request->filled('date')) {
            $query->whereDate('return_date', $request->date);
        }
        if ($request->filled('from')) {
            $query->whereDate('return_date', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('return_date', '<=', $request->to);
        }
        if ($request->filled('salesman_id') && ! $user->isSalesman()) {
            $query->where('salesman_id', $request->salesman_id);
        }
        if ($request->filled('cylinder_id')) {
            $query->where('cylinder_id', $request->cylinder_id);
        }
        if ($request->filled('allocation_id')) {
            $query->where('allocation_id', $request->allocation_id);
        }
        if ($request->has('is_extra')) {
            $query->where('is_extra', $request->boolean('is_extra'));
        }
        if ($request->has('is_verified')) {
            $val = $request->input('is_verified');
            if ($val === 'null' || $val === '') {
                $query->whereNull('is_verified');
            } else {
                $query->where('is_verified', filter_var($val, FILTER_VALIDATE_BOOLEAN));
            }
        }

        return $this->paginated($query->paginate(30));
    }

    public function storeReturn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cylinder_id'  => 'required|integer|exists:cylinders,id',
            'qty'          => 'required|integer|min:1',
            'type'         => 'required|in:empty_return,error_correction',
            'return_date'  => 'required|date',
            'customer_id'  => 'nullable|integer|exists:customers,id',
            'sale_id'      => 'nullable|integer|exists:sales,id',
            'notes'        => 'nullable|string',
            'is_extra'     => 'nullable|boolean',
            'extra_reason' => 'nullable|string|max:100',
        ]);

        $data['recorded_by'] = auth()->id();
        $data['salesman_id'] = auth()->id();
        $data['is_extra']    = $data['is_extra'] ?? false;

        // Auto-link to today's active allocation for this cylinder
        $allocation = StockAllocation::where('salesman_id', auth()->id())
            ->where('cylinder_id', $data['cylinder_id'])
            ->whereDate('allocation_date', $data['return_date'])
            ->where('is_reconciled', false)
            ->first();

        if ($allocation) {
            $data['allocation_id'] = $allocation->id;
        }

        $return = CylinderReturn::create($data);

        if ($data['type'] === 'empty_return') {
            $this->stockService->addEmptyStock($data['cylinder_id'], $data['qty']);
        }

        $label = $data['is_extra'] ? 'Extra empty return' : 'Empty return';
        $this->movements->record(
            $data['cylinder_id'],
            'cylinder_return',
            $data['qty'],
            auth()->id(),
            $return->id,
            "{$label} #{$return->id} — {$data['qty']} cylinders received"
        );

        return $this->created($return->load(['cylinder', 'customer']), 'Return recorded.');
    }

    public function verifyReturn(Request $request, CylinderReturn $return): JsonResponse
    {
        if (! $return->is_extra) {
            abort(422, 'Only extra returns require verification.');
        }

        $return->update(['is_verified' => true]);

        return $this->success([
            'id'          => $return->id,
            'is_verified' => true,
        ], 'Return verified and stock confirmed.');
    }

    public function rejectReturn(Request $request, CylinderReturn $return): JsonResponse
    {
        if (! $return->is_extra) {
            abort(422, 'Only extra returns can be rejected.');
        }
        if ($return->is_verified === false) {
            abort(422, 'This return has already been rejected.');
        }

        $data = $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        // Reverse the empty stock that was provisionally added
        if ($return->type === 'empty_return') {
            $this->stockService->addEmptyStock($return->cylinder_id, -$return->qty);

            $this->movements->record(
                $return->cylinder_id,
                'cylinder_return',
                -$return->qty,
                auth()->id(),
                $return->id,
                "Rejected extra return #{$return->id} — stock reversed"
            );
        }

        $return->update([
            'is_verified' => false,
            'notes'       => $data['notes'] ? ($return->notes ? $return->notes."\nRejected: ".$data['notes'] : 'Rejected: '.$data['notes']) : $return->notes,
        ]);

        return $this->success([
            'id'          => $return->id,
            'is_verified' => false,
        ], 'Return rejected and stock reversed.');
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
