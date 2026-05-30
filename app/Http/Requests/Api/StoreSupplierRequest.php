<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'    => 'required|string|max:150',
            'type'    => 'nullable|in:dealer,self',
            'phone'   => 'nullable|string|max:20',
            'address' => 'nullable|string',
        ];
    }
}
