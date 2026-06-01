<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreAllocationRequest;
use App\Http\Requests\Api\StoreSalesmanRequest;
use App\Models\User;
use App\Models\StockAllocation;
use App\Repositories\Contracts\SaleRepositoryInterface;
use App\Services\AllocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SalesmanController extends Controller
{
    public function __construct(
        private AllocationService $allocationService,
        private SaleRepositoryInterface $saleRepository,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $date = $request->get('date', today()->toDateString());

        $query = User::where('role', 'salesman')
            ->with(['allocations' => fn ($q) => $q->whereDate('allocation_date', $date)->with('cylinder')]);

        // Optionally filter to active only (salesman mobile app uses ?active=1)
        if ($request->boolean('active')) {
            $query->where('is_active', true);
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function show(User $user): JsonResponse
    {
        // A salesman can only view their own data
        if (auth()->user()->isSalesman() && $user->id !== auth()->id()) {
            abort(403, 'Access denied.');
        }

        $user->load([
            'allocations' => fn ($q) => $q->today()->with('cylinder'),
        ]);
        $todaySales = $this->saleRepository->salesmanSales($user->id, today()->toDateString());

        return response()->json([
            'salesman'    => $user,
            'today_sales' => $todaySales,
        ]);
    }

    public function allocate(StoreAllocationRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();
        $allocation = $this->allocationService->allocate(
            $user->id,
            $data['cylinder_id'],
            $data['qty'],
            (float) ($data['sale_price'] ?? 0),
            $data['allocation_date'] ?? today()->toDateString()
        );

        return response()->json($allocation->load('cylinder'), 201);
    }

    public function reconcile(Request $request, StockAllocation $allocation): JsonResponse
    {
        if ($allocation->is_reconciled) {
            abort(422, 'This allocation has already been reconciled.');
        }

        $data = $request->validate([
            'sold_qty'         => 'required|integer|min:0',
            'returned_qty'     => 'required|integer|min:0',
            'collected_amount' => 'required|numeric|min:0',
        ]);

        if ($data['sold_qty'] + $data['returned_qty'] > $allocation->qty) {
            abort(422, 'Sold ('.$data['sold_qty'].') + returned ('.$data['returned_qty'].') cannot exceed allocated quantity ('.$allocation->qty.').');
        }

        $allocation = $this->allocationService->reconcile(
            $allocation,
            $data['sold_qty'],
            $data['returned_qty'],
            $data['collected_amount']
        );

        return response()->json($allocation);
    }

    // ---- Salesman management (admin only) ----

    public function store(StoreSalesmanRequest $request): JsonResponse
    {
        $data = $request->validated();
        $initials = collect(explode(' ', trim($data['name'])))
            ->map(fn ($w) => strtoupper($w[0]))
            ->take(2)
            ->implode('');

        $salesman = User::create([
            'name'            => $data['name'],
            'email'           => $data['email'],
            'password'        => Hash::make($data['password']),
            'phone'           => $data['phone'] ?? null,
            'role'            => 'salesman',
            'avatar_initials' => $initials,
            'is_active'       => true,
        ]);

        return response()->json($salesman, 201);
    }

    public function update(StoreSalesmanRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();

        $updates = array_filter([
            'name'  => $data['name']  ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
        ]);

        if (!empty($data['password'])) {
            $updates['password'] = Hash::make($data['password']);
        }

        // Regenerate initials if name changed
        if (!empty($data['name'])) {
            $updates['avatar_initials'] = collect(explode(' ', trim($data['name'])))
                ->map(fn ($w) => strtoupper($w[0]))
                ->take(2)
                ->implode('');
        }

        $user->update($updates);
        return response()->json($user->fresh());
    }

    public function toggleActive(User $user): JsonResponse
    {
        $user->update(['is_active' => ! $user->is_active]);
        return response()->json([
            'id'        => $user->id,
            'is_active' => $user->is_active,
            'message'   => $user->is_active ? 'Salesman activated.' : 'Salesman deactivated.',
        ]);
    }
}
