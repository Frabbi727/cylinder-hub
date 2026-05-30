<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StorePurchaseRequest;
use App\Http\Resources\Api\PurchaseResource;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Repositories\Contracts\PurchaseRepositoryInterface;
use App\Services\FifoService;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    public function __construct(
        private PurchaseRepositoryInterface $purchases,
        private FifoService  $fifoService,
        private StockService $stockService,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json($this->purchases->paginate());
    }

    public function store(StorePurchaseRequest $request): JsonResponse
    {
        $data = $request->validated();

        $purchase = DB::transaction(function () use ($data) {
            $totalAmount = collect($data['items'])->sum(fn ($i) => $i['unit_cost'] * $i['qty']);

            $purchase = $this->purchases->create([
                'supplier_id'   => $data['supplier_id'],
                'recorded_by'   => auth()->id(),
                'purchase_date' => $data['purchase_date'],
                'total_amount'  => $totalAmount,
                'paid_amount'   => $data['paid_amount'] ?? 0,
                'due_amount'    => $totalAmount - ($data['paid_amount'] ?? 0),
                'notes'         => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                PurchaseItem::create([
                    'purchase_id'  => $purchase->id,
                    'cylinder_id'  => $item['cylinder_id'],
                    'unit_cost'    => $item['unit_cost'],
                    'qty'          => $item['qty'],
                    'remaining_qty'=> $item['qty'],
                    'status'       => 'pending',
                ]);
                $this->stockService->addFilledStock($item['cylinder_id'], $item['qty']);
            }

            // Update supplier due
            $due = $totalAmount - ($data['paid_amount'] ?? 0);
            if ($due > 0) {
                Supplier::where('id', $data['supplier_id'])->increment('total_due', $due);
            }

            return $purchase->fresh(['supplier', 'items.cylinder']);
        });

        return response()->json(new PurchaseResource($purchase), 201);
    }

    public function show(Purchase $purchase): PurchaseResource
    {
        return new PurchaseResource($purchase->load(['supplier', 'items.cylinder']));
    }

    public function fifoQueue(int $cylinderId): JsonResponse
    {
        $queue = $this->purchases->fifoQueue($cylinderId);
        return response()->json($queue);
    }

    public function simulate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cylinder_id' => 'required|integer|exists:cylinders,id',
            'qty'         => 'required|integer|min:1',
            'unit_price'  => 'required|numeric|min:0',
        ]);

        $result = $this->fifoService->simulate($data['cylinder_id'], $data['qty'], $data['unit_price']);
        return response()->json($result);
    }
}
