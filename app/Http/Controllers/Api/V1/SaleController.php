<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreSaleRequest;
use App\Http\Resources\Api\SaleResource;
use App\Models\Customer;
use App\Models\DueCollection;
use App\Models\Sale;
use App\Repositories\Contracts\SaleRepositoryInterface;
use App\Services\SaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    public function __construct(
        private SaleRepositoryInterface $sales,
        private SaleService $saleService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $todayOnly = $request->boolean('today');
        $filters   = [
            'from'         => $request->get('from'),
            'to'           => $request->get('to'),
            'payment_type' => $request->get('payment_type'),
            'search'       => $request->get('search'),
            'has_due'      => $request->boolean('has_due'),
        ];

        return $this->paginated(
            $this->sales->paginate(auth()->user(), $todayOnly, $filters)
        );
    }

    public function store(StoreSaleRequest $request): JsonResponse
    {
        $data                  = $request->validated();
        $data['salesman_id']   = auth()->id();
        $data['salesman_role'] = auth()->user()->role;

        $sale = $this->saleService->createSale($data);
        return $this->created(new SaleResource($sale), 'Sale recorded.');
    }

    public function show(Sale $sale): JsonResponse
    {
        if (auth()->user()->isSalesman() && (int) $sale->salesman_id !== (int) auth()->id()) {
            abort(403, 'Access denied.');
        }

        $sale->load(['customer', 'salesman', 'items.cylinder', 'dueCollections.collectedBy']);

        return $this->success([
            'sale'            => new SaleResource($sale),
            'payment_history' => $sale->dueCollections->map(fn ($dc) => [
                'id'              => $dc->id,
                'amount'          => (float) $dc->amount,
                'collection_date' => $dc->collection_date,
                'collected_by'    => $dc->collectedBy?->name,
                'notes'           => $dc->notes,
            ]),
        ]);
    }

    public function destroy(Sale $sale): JsonResponse
    {
        $sale->load('items');
        $this->saleService->deleteSale($sale);
        return $this->deleted('Sale deleted and stock restored.');
    }

    public function pay(Request $request, Sale $sale): JsonResponse
    {
        if (auth()->user()->isSalesman() && (int) $sale->salesman_id !== (int) auth()->id()) {
            abort(403, 'You can only collect payment for your own sales.');
        }

        $data = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'date'   => 'required|date',
            'notes'  => 'nullable|string',
        ]);

        return DB::transaction(function () use ($data, $sale) {
            $sale      = Sale::lockForUpdate()->findOrFail($sale->id);
            $dueAmount = round((float) $sale->total_amount - (float) $sale->paid_amount, 2);
            $amount    = round((float) $data['amount'], 2);

            if ($amount > $dueAmount) {
                abort(422, 'Payment of ৳'.number_format($amount, 2).' exceeds remaining due of ৳'.number_format($dueAmount, 2).'.');
            }

            if ($sale->customer_id) {
                DueCollection::create([
                    'customer_id'     => $sale->customer_id,
                    'sale_id'         => $sale->id,
                    'collected_by'    => auth()->id(),
                    'amount'          => $amount,
                    'collection_date' => $data['date'],
                    'notes'           => $data['notes'] ?? null,
                ]);
                Customer::where('id', $sale->customer_id)->decrement('total_due', $amount);
            }

            $newPaid = round((float) $sale->paid_amount + $amount, 2);
            $sale->update([
                'paid_amount'  => $newPaid,
                'payment_type' => $newPaid >= round((float) $sale->total_amount, 2) ? 'cash' : 'partial',
            ]);

            return $this->success(
                new SaleResource($sale->fresh(['customer', 'salesman', 'items.cylinder'])),
                'Payment collected.'
            );
        });
    }
}
