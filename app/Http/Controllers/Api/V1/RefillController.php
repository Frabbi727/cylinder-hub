<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CylinderStock;
use App\Models\RefillOrder;
use App\Services\StockMovementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RefillController extends Controller
{
    public function __construct(private StockMovementService $movements) {}

    public function index(): JsonResponse
    {
        $refills = RefillOrder::with(['cylinder', 'supplier', 'recordedBy'])
            ->orderByDesc('sent_date')
            ->paginate(20);

        return $this->paginated($refills);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cylinder_id'  => 'required|integer|exists:cylinders,id',
            'supplier_id'  => 'nullable|integer|exists:suppliers,id',
            'qty_sent'     => 'required|integer|min:1',
            'sent_date'    => 'required|date',
            'refill_cost'  => 'nullable|numeric|min:0',
            'notes'        => 'nullable|string',
        ]);

        return DB::transaction(function () use ($data) {
            $stock = CylinderStock::where('cylinder_id', $data['cylinder_id'])->first();
            if (! $stock || $stock->empty_qty < $data['qty_sent']) {
                abort(422, 'Not enough empty cylinders. Available: ' . ($stock?->empty_qty ?? 0));
            }

            $refill = RefillOrder::create([
                'cylinder_id'  => $data['cylinder_id'],
                'supplier_id'  => $data['supplier_id'] ?? null,
                'qty_sent'     => $data['qty_sent'],
                'sent_date'    => $data['sent_date'],
                'refill_cost'  => $data['refill_cost'] ?? null,
                'recorded_by'  => auth()->id(),
                'notes'        => $data['notes'] ?? null,
            ]);

            $stock->decrementEmpty($data['qty_sent']);

            $this->movements->record(
                $data['cylinder_id'],
                'refill_sent',
                -$data['qty_sent'],
                auth()->id(),
                $refill->id,
                "Refill order #{$refill->id} — {$data['qty_sent']} empty cylinders sent for refill"
            );

            return $this->created($refill->load(['cylinder', 'supplier']), 'Refill order created.');
        });
    }

    public function receive(Request $request, RefillOrder $refill): JsonResponse
    {
        if ($refill->status === 'received') {
            abort(422, 'This refill order is already fully received.');
        }

        $maxReceivable = $refill->qty_sent - $refill->qty_received;
        $data = $request->validate([
            'qty_received'  => "required|integer|min:1|max:{$maxReceivable}",
            'received_date' => 'required|date',
        ]);

        return DB::transaction(function () use ($data, $refill) {
            $newReceived = $refill->qty_received + $data['qty_received'];
            $status      = $newReceived >= $refill->qty_sent ? 'received' : 'partially_received';

            $refill->update([
                'qty_received'  => $newReceived,
                'received_date' => $data['received_date'],
                'status'        => $status,
            ]);

            $stock = CylinderStock::where('cylinder_id', $refill->cylinder_id)->firstOrFail();
            $stock->incrementFilled($data['qty_received']);

            $this->movements->record(
                $refill->cylinder_id,
                'refill_received',
                $data['qty_received'],
                auth()->id(),
                $refill->id,
                "Refill order #{$refill->id} — {$data['qty_received']} cylinders received back filled"
            );

            return $this->success($refill->fresh(['cylinder', 'supplier']), 'Cylinders received and stock updated.');
        });
    }
}
