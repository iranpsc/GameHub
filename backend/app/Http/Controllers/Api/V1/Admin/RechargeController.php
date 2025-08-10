<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\RechargeRequest;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class RechargeController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function store(RechargeRequest $request): JsonResponse
    {
        $admin = $request->user();
        if (! $admin->is_admin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user = User::query()->findOrFail($request->integer('user_id'));
        $amount = (int) $request->integer('amount');
        $description = (string) ($request->input('description') ?: 'Admin recharge');

        DB::transaction(function () use ($user, $amount, $description) {
            $txn = Transaction::query()->create([
                'user_id' => $user->id,
                'amount' => $amount,
                'transaction_type' => 'credit',
                'payment_status' => 'completed',
                'gateway' => 'admin',
                'description' => $description,
            ]);

            $user->lockForUpdate();
            $user->credit_balance = ((float) $user->credit_balance) + (float) $amount;
            $user->save();
        });

        return response()->json(['message' => 'Balance recharged']);
    }
}