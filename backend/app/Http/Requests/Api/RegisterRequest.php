<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Please enter your name.',
            'name.string' => 'Your name must be a valid text.',
            'name.max' => 'Your name may not be greater than :max characters.',

            'email.required' => 'Please enter your email address.',
            'email.email' => 'Please enter a valid email address.',
            'email.max' => 'Your email may not be greater than :max characters.',
            'email.unique' => 'An account with this email already exists.',

            'password.required' => 'Please enter a password.',
            'password.string' => 'Your password must be valid text.',
            'password.min' => 'Your password must be at least :min characters.',
        ];
    }
}