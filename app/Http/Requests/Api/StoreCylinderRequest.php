<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreCylinderRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'         => 'required|string|max:100',
            'size'         => 'required|string|max:50',
            'short_code'   => 'required|string|max:5',
            'color1'       => 'nullable|string|max:10',
            'color2'       => 'nullable|string|max:10',
            'brands'       => 'nullable|string',
            'status'       => 'nullable|in:active,inactive',
            'reorder_level'=> 'nullable|integer|min:0',
            'capacity'     => 'nullable|integer|min:1',
        ];
    }
}
