<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'sale_date'    => $this->sale_date,
            'total_amount' => (float) $this->total_amount,
            'paid_amount'  => (float) $this->paid_amount,
            'due_amount'   => (float) $this->due_amount,
            'payment_type' => $this->payment_type,
            'notes'        => $this->notes,
            'customer'     => $this->whenLoaded('customer', fn () => $this->customer ? [
                'id'    => $this->customer->id,
                'name'  => $this->customer->name,
                'phone' => $this->customer->phone,
            ] : null),
            'salesman'     => $this->whenLoaded('salesman', fn () => [
                'id'             => $this->salesman->id,
                'name'           => $this->salesman->name,
                'avatar_initials'=> $this->salesman->avatar_initials,
            ]),
            'items' => $this->whenLoaded('items', fn () =>
                $this->items->map(fn ($item) => [
                    'id'         => $item->id,
                    'cylinder'   => $item->cylinder ? [
                        'id'        => $item->cylinder->id,
                        'name'      => $item->cylinder->name,
                        'size'      => $item->cylinder->size,
                        'short_code'=> $item->cylinder->short_code,
                        'color1'    => $item->cylinder->color1,
                        'color2'    => $item->cylinder->color2,
                    ] : null,
                    'qty'        => $item->qty,
                    'unit_price' => (float) $item->unit_price,
                    'unit_cost'  => (float) $item->unit_cost,
                    'profit'     => (float) $item->profit,
                ])
            ),
            'created_at' => $this->created_at,
        ];
    }
}
