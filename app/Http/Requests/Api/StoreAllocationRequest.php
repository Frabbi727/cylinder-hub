<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreAllocationRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'cylinder_id'     => 'required|integer|exists:cylinders,id',
            'qty'             => 'required|integer|min:1',
            'sale_price'      => 'nullable|numeric|min:0',
            'allocation_date' => 'nullable|date',
        ];
    }
}
