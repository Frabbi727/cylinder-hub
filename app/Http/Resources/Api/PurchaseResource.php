<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'purchase_date' => $this->purchase_date,
            'total_amount'  => (float) $this->total_amount,
            'paid_amount'   => (float) $this->paid_amount,
            'due_amount'    => (float) $this->due_amount,
            'notes'         => $this->notes,
            'supplier'      => $this->whenLoaded('supplier', fn () => [
                'id'   => $this->supplier->id,
                'name' => $this->supplier->name,
                'type' => $this->supplier->type,
            ]),
            'items' => $this->whenLoaded('items', fn () =>
                $this->items->map(fn ($item) => [
                    'id'           => $item->id,
                    'cylinder_id'  => $item->cylinder_id,
                    'cylinder'     => $item->cylinder ? [
                        'id'        => $item->cylinder->id,
                        'name'      => $item->cylinder->name,
                        'size'      => $item->cylinder->size,
                        'short_code'=> $item->cylinder->short_code,
                        'color1'    => $item->cylinder->color1,
                        'color2'    => $item->cylinder->color2,
                    ] : null,
                    'unit_cost'    => (float) $item->unit_cost,
                    'qty'          => $item->qty,
                    'remaining_qty'=> $item->remaining_qty,
                    'status'       => $item->status,
                ])
            ),
            'created_at' => $this->created_at,
        ];
    }
}
