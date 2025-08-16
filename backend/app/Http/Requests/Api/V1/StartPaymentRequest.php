<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StartPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        $allowed = ['zarinpal'];
        if (app()->environment('testing')) {
            $allowed[] = 'fake';
        }
        return [
            'amount' => ['required', 'integer', 'min:1000'], // rials
            'gateway' => ['nullable', 'in:' . implode(',', $allowed)],
            'description' => ['nullable', 'string', 'max:191'],
        ];
    }
}