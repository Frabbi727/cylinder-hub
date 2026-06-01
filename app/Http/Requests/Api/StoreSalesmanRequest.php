<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreSalesmanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $salesmanId = $this->route('user')?->id;

        return [
            'name'     => 'required|string|max:150',
            'email'    => 'required|email|unique:users,email,' . $salesmanId,
            'password' => $salesmanId ? 'nullable|string|min:6' : 'required|string|min:6',
            'phone'    => 'nullable|string|max:20',
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'This email is already taken by another user.',
        ];
    }
}
