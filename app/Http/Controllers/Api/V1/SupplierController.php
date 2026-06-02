<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreSupplierRequest;
use App\Models\DuePayment;
use App\Models\Supplier;
use App\Repositories\Contracts\SupplierRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function __construct(private SupplierRepositoryInterface $suppliers) {}

    public function index(): JsonResponse
    {
        return $this->paginated($this->suppliers->paginate());
    }

    public function store(StoreSupplierRequest $request): JsonResponse
    {
        $supplier = $this->suppliers->create($request->validated());
        return $this->created($supplier, 'Supplier created.');
    }

    public function show(Supplier $supplier): JsonResponse
    {
        return $this->success($supplier->load(['purchases', 'duePayments']));
    }

    public function update(StoreSupplierRequest $request, Supplier $supplier): JsonResponse
    {
        $supplier = $this->suppliers->update($supplier, $request->validated());
        return $this->success($supplier);
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        $this->suppliers->delete($supplier);
        return $this->deleted('Supplier deleted.');
    }

    public function pay(Request $request, Supplier $supplier): JsonResponse
    {
        $data = $request->validate([
            'amount'       => ['required', 'numeric', 'min:0.01', 'max:'.(float) $supplier->total_due],
            'payment_date' => 'required|date',
            'purchase_id'  => 'nullable|integer|exists:purchases,id',
            'notes'        => 'nullable|string',
        ]);

        DuePayment::create([
            'supplier_id'  => $supplier->id,
            'purchase_id'  => $data['purchase_id'] ?? null,
            'recorded_by'  => auth()->id(),
            'amount'       => $data['amount'],
            'payment_date' => $data['payment_date'],
            'notes'        => $data['notes'] ?? null,
        ]);

        $supplier->decrement('total_due', $data['amount']);
        return $this->success($supplier->fresh(), 'Payment recorded.');
    }
}
