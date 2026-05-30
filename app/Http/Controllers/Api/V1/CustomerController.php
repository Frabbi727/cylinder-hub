<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreCustomerRequest;
use App\Models\Customer;
use App\Models\DueCollection;
use App\Repositories\Contracts\CustomerRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function __construct(private CustomerRepositoryInterface $customers) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->has('search')) {
            return response()->json($this->customers->search($request->search));
        }
        return response()->json($this->customers->paginate());
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['added_by'] = auth()->id();
        $customer = $this->customers->create($data);
        return response()->json($customer, 201);
    }

    public function show(Customer $customer): JsonResponse
    {
        return response()->json($customer->load(['sales', 'dueCollections']));
    }

    public function update(StoreCustomerRequest $request, Customer $customer): JsonResponse
    {
        $customer = $this->customers->update($customer, $request->validated());
        return response()->json($customer);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $this->customers->delete($customer);
        return response()->json(['message' => 'Customer deleted.']);
    }

    public function collect(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate([
            'amount'          => 'required|numeric|min:0.01',
            'collection_date' => 'required|date',
            'sale_id'         => 'nullable|integer|exists:sales,id',
            'notes'           => 'nullable|string',
        ]);

        DueCollection::create([
            'customer_id'     => $customer->id,
            'sale_id'         => $data['sale_id'] ?? null,
            'collected_by'    => auth()->id(),
            'amount'          => $data['amount'],
            'collection_date' => $data['collection_date'],
            'notes'           => $data['notes'] ?? null,
        ]);

        $customer->decrement('total_due', $data['amount']);
        return response()->json($customer->fresh());
    }
}
