<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'customer_id'  => 'nullable|integer|exists:customers,id',
            'sale_date'    => 'required|date',
            'payment_type' => 'required|in:cash,due,partial',
            'paid_amount'  => 'nullable|numeric|min:0',
            'notes'        => 'nullable|string',
            'items'        => 'required|array|min:1',
            'items.*.cylinder_id' => 'required|integer|exists:cylinders,id',
            'items.*.qty'         => 'required|integer|min:1',
            'items.*.unit_price'  => 'required|numeric|min:0',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if (in_array($this->payment_type, ['due', 'partial']) && is_null($this->customer_id)) {
                $validator->errors()->add('customer_id', 'A customer is required for sales with due or partial payments.');
            }
        });
    }
}
