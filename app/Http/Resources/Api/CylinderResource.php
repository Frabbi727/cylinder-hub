<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CylinderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'size'         => $this->size,
            'short_code'   => $this->short_code,
            'color1'       => $this->color1,
            'color2'       => $this->color2,
            'brands'       => $this->brands,
            'status'       => $this->status,
            'reorder_level'=> $this->reorder_level,
            'capacity'     => $this->capacity,
            'stock'        => $this->whenLoaded('stock', fn () => [
                'filled_qty' => $this->stock->filled_qty,
                'empty_qty'  => $this->stock->empty_qty,
                'capacity'   => $this->stock->capacity,
            ]),
        ];
    }
}
