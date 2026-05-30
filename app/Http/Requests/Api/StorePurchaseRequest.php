<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'supplier_id'   => 'required|integer|exists:suppliers,id',
            'purchase_date' => 'required|date',
            'paid_amount'   => 'nullable|numeric|min:0',
            'notes'         => 'nullable|string',
            'items'         => 'required|array|min:1',
            'items.*.cylinder_id' => 'required|integer|exists:cylinders,id',
            'items.*.qty'         => 'required|integer|min:1',
            'items.*.unit_cost'   => 'required|numeric|min:0',
        ];
    }
}
