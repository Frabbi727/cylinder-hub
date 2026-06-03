<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreAllocationRequest;
use App\Http\Requests\Api\StoreSalesmanRequest;
use App\Models\StockAllocation;
use App\Models\User;
use App\Repositories\Contracts\SaleRepositoryInterface;
use App\Services\AllocationService;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesmanController extends Controller
{
    public function __construct(
        private AllocationService $allocationService,
        private SaleRepositoryInterface $saleRepository,
        private ReportService $reports,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $date  = $request->get('date', today()->toDateString());
        $query = User::where('role', 'salesman')
            ->with(['allocations' => fn ($q) => $q->whereDate('allocation_date', $date)->with('cylinder')]);

        if ($request->boolean('active')) {
            $query->where('is_active', true);
        }

        return $this->success($query->orderBy('name')->get());
    }

    public function show(User $user): JsonResponse
    {
        if (auth()->user()->isSalesman() && (int) $user->id !== (int) auth()->id()) {
            abort(403, 'Access denied.');
        }

        // Load today's allocations AND any unreconciled allocations from previous days
        $user->load(['allocations' => function ($q) {
            $q->where(function ($sub) {
                $sub->whereDate('allocation_date', today())          // today's
                    ->orWhere('is_reconciled', false);               // or any pending
            })->with('cylinder')->orderBy('allocation_date', 'desc');
        }]);

        $todaySales = $this->saleRepository->salesmanSales($user->id, today()->toDateString());

        return $this->success([
            'salesman'    => $user,
            'today_sales' => $todaySales,
        ]);
    }

    public function allocate(StoreAllocationRequest $request, User $user): JsonResponse
    {
        $data       = $request->validated();
        $allocation = $this->allocationService->allocate(
            $user->id,
            $data['cylinder_id'],
            $data['qty'],
            (float) ($data['sale_price'] ?? 0),
            $data['allocation_date'] ?? today()->toDateString()
        );

        return $this->created($allocation->load('cylinder'), 'Allocation created.');
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

        return $this->success($allocation, 'Allocation reconciled.');
    }

    // ---- Salesman management (admin only) ----

    public function store(StoreSalesmanRequest $request): JsonResponse
    {
        $data     = $request->validated();
        $initials = collect(explode(' ', trim($data['name'])))
            ->map(fn ($w) => strtoupper($w[0]))
            ->take(2)
            ->implode('');

        $salesman = User::create([
            'name'            => $data['name'],
            'email'           => $data['email'],
            'password'        => $data['password'],
            'phone'           => $data['phone'] ?? null,
            'role'            => 'salesman',
            'avatar_initials' => $initials,
            'is_active'       => true,
        ]);

        return $this->created($salesman, 'Salesman created.');
    }

    public function update(StoreSalesmanRequest $request, User $user): JsonResponse
    {
        $data    = $request->validated();
        $updates = array_filter([
            'name'  => $data['name']  ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
        ]);

        if (! empty($data['password'])) {
            $updates['password'] = $data['password'];
        }

        if (! empty($data['name'])) {
            $updates['avatar_initials'] = collect(explode(' ', trim($data['name'])))
                ->map(fn ($w) => strtoupper($w[0]))
                ->take(2)
                ->implode('');
        }

        $user->update($updates);
        return $this->success($user->fresh());
    }

    public function toggleActive(User $user): JsonResponse
    {
        $user->update(['is_active' => ! $user->is_active]);
        $message = $user->is_active ? 'Salesman activated.' : 'Salesman deactivated.';

        return $this->success(['id' => $user->id, 'is_active' => $user->is_active], $message);
    }

    public function report(Request $request, User $user): JsonResponse
    {
        if (auth()->user()->isSalesman() && (int) $user->id !== (int) auth()->id()) {
            abort(403, 'Access denied.');
        }

        [$from, $to] = $this->resolvePeriod($request);
        return $this->success($this->reports->salesmanReport($user->id, $from, $to));
    }

    public function cylinderFlow(Request $request, User $user): JsonResponse
    {
        if (auth()->user()->isSalesman() && (int) $user->id !== (int) auth()->id()) {
            abort(403, 'Access denied.');
        }

        [$from, $to] = $this->resolvePeriod($request);
        return $this->success($this->reports->cylinderFlow($from, $to, $user->id));
    }

    public function reportAll(Request $request): JsonResponse
    {
        [$from, $to] = $this->resolvePeriod($request);

        $salesmen = User::where('role', 'salesman')->pluck('id');
        $reports  = $salesmen->map(fn ($id) => $this->reports->salesmanReport($id, $from, $to));

        return $this->success($reports->values()->all());
    }

    private function resolvePeriod(Request $request): array
    {
        $from = $request->get('from', now()->startOfMonth()->toDateString());
        $to   = $request->get('to', today()->toDateString());
        return [$from, $to];
    }
}
