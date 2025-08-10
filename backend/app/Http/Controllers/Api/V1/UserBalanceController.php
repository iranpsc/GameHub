<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserBalanceController extends Controller
{
    public function show(): JsonResponse
    {
        // In a real app, this should use the authenticated user
        $user = auth()->user() ?? User::query()->first();

        if (! $user) {
            return response()->json([
                'message' => 'User not found.'
            ], 404);
        }

        return response()->json([
            'credit_balance' => (float) $user->credit_balance,
            'remaining_time' => (int) $user->remaining_time,
        ]);
    }
}