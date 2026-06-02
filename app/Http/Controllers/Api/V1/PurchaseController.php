<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StorePurchaseRequest;
use App\Http\Resources\Api\PurchaseResource;
use App\Models\DuePayment;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Repositories\Contracts\PurchaseRepositoryInterface;
use App\Services\AuditLogService;
use App\Services\FifoService;
use App\Services\NotificationService;
use App\Services\StockMovementService;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    public function __construct(
        private PurchaseRepositoryInterface $purchases,
        private FifoService $fifoService,
        private StockService $stockService,
        private StockMovementService $movements,
        private AuditLogService $audit,
        private NotificationService $notifications,
    ) {}

    public function index(): JsonResponse
    {
        return $this->paginated($this->purchases->paginate());
    }

    public function store(StorePurchaseRequest $request): JsonResponse
    {
        $data = $request->validated();

        $purchase = DB::transaction(function () use ($data) {
            $totalAmount = collect($data['items'])->sum(fn ($i) => $i['unit_cost'] * $i['qty']);
            $paidAmount  = min((float) ($data['paid_amount'] ?? 0), $totalAmount);

            $purchase = $this->purchases->create([
                'supplier_id'   => $data['supplier_id'],
                'recorded_by'   => auth()->id(),
                'purchase_date' => $data['purchase_date'],
                'total_amount'  => $totalAmount,
                'paid_amount'   => $paidAmount,
                'due_amount'    => $totalAmount - $paidAmount,
                'notes'         => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                PurchaseItem::create([
                    'purchase_id'   => $purchase->id,
                    'cylinder_id'   => $item['cylinder_id'],
                    'unit_cost'     => $item['unit_cost'],
                    'qty'           => $item['qty'],
                    'remaining_qty' => $item['qty'],
                    'status'        => 'pending',
                ]);
                $this->stockService->addFilledStock($item['cylinder_id'], $item['qty']);
                $this->movements->record(
                    $item['cylinder_id'],
                    'purchase',
                    $item['qty'],
                    auth()->id(),
                    $purchase->id,
                    "Purchase #{$purchase->id} — {$item['qty']} pcs received from supplier"
                );
            }

            $due = $totalAmount - $paidAmount;
            if ($due > 0) {
                Supplier::where('id', $data['supplier_id'])->increment('total_due', $due);
            }

            $supplier = Supplier::find($data['supplier_id']);
            $this->audit->log(
                'created', 'Purchase', $purchase->id, auth()->id(),
                "Purchase #{$purchase->id} recorded from {$supplier?->name} (৳" . number_format($totalAmount, 2) . ')',
                null, $purchase->toArray()
            );
            if ($due > 0) {
                $this->notifications->supplierDueAlert($supplier->fresh());
            }

            return $purchase->fresh(['supplier', 'items.cylinder']);
        });

        return $this->created(new PurchaseResource($purchase), 'Purchase recorded.');
    }

    public function show(Purchase $purchase): JsonResponse
    {
        return $this->success(new PurchaseResource($purchase->load(['supplier', 'items.cylinder'])));
    }

    public function fifoQueue(int $cylinderId): JsonResponse
    {
        return $this->success($this->purchases->fifoQueue($cylinderId));
    }

    public function simulate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cylinder_id' => 'required|integer|exists:cylinders,id',
            'qty'         => 'required|integer|min:1',
            'unit_price'  => 'required|numeric|min:0',
        ]);

        return $this->success($this->fifoService->simulate($data['cylinder_id'], $data['qty'], $data['unit_price']));
    }

    public function pay(Request $request, Purchase $purchase): JsonResponse
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'date'   => 'required|date',
            'notes'  => 'nullable|string',
        ]);

        return DB::transaction(function () use ($data, $purchase) {
            $purchase  = Purchase::lockForUpdate()->findOrFail($purchase->id);
            $dueAmount = round((float) $purchase->due_amount, 2);
            $amount    = round((float) $data['amount'], 2);

            if ($amount > $dueAmount) {
                abort(422, 'Payment of ৳'.number_format($amount, 2).' exceeds remaining due of ৳'.number_format($dueAmount, 2).'.');
            }

            DuePayment::create([
                'supplier_id'  => $purchase->supplier_id,
                'purchase_id'  => $purchase->id,
                'recorded_by'  => auth()->id(),
                'amount'       => $amount,
                'payment_date' => $data['date'],
                'notes'        => $data['notes'] ?? null,
            ]);

            Supplier::where('id', $purchase->supplier_id)->decrement('total_due', $amount);

            $purchase->update([
                'paid_amount' => round((float) $purchase->paid_amount + $amount, 2),
                'due_amount'  => round(max(0, $dueAmount - $amount), 2),
            ]);

            $this->audit->log(
                'paid', 'Purchase', $purchase->id, auth()->id(),
                "Payment of ৳" . number_format($amount, 2) . " recorded against Purchase #{$purchase->id}",
                null, ['amount' => $amount]
            );

            return $this->success(
                new PurchaseResource($purchase->fresh(['supplier', 'items.cylinder'])),
                'Payment recorded.'
            );
        });
    }
}
