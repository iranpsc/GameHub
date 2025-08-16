<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StartPaymentRequest;
use App\Models\Transaction;
use App\Services\Payments\PaymentFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum')->only('start');
    }

    public function start(StartPaymentRequest $request): JsonResponse
    {
        $user = $request->user();
        $amount = (int) $request->integer('amount');
        $gatewayName = $request->input('gateway');
        $description = (string) ($request->input('description') ?: 'Wallet recharge');

        $gateway = PaymentFactory::make($gatewayName);
        $callbackUrl = config('payment.callback_url');

        $txn = Transaction::query()->create([
            'user_id' => $user->id,
            'amount' => $amount,
            'transaction_type' => 'credit',
            'payment_status' => 'pending',
            'gateway' => $gateway->getName(),
            'description' => $description,
            'callback_url' => $callbackUrl,
        ]);

        $start = $gateway->start($amount, $callbackUrl, $description);

        $txn->authority = $start['authority'] ?? null;
        $txn->save();

        return response()->json([
            'payment_url' => $start['redirect_url'],
            'transaction_id' => $txn->id,
            'gateway' => $gateway->getName(),
            'authority' => $txn->authority,
        ]);
    }

    public function callback(Request $request): JsonResponse
    {
        // Gateway-agnostic callback: determine gateway by token/authority
        $authority = (string) ($request->input('Authority') ?? $request->input('token') ?? $request->input('authority') ?? '');
        $status = (string) ($request->input('Status') ?? $request->input('status') ?? '');

        $txn = Transaction::query()->where('authority', $authority)->first();
        if (! $txn) {
            return response()->json(['message' => 'Transaction not found'], 404);
        }

        if ($txn->payment_status === 'completed') {
            return response()->json(['message' => 'Already verified']);
        }

        // Some gateways set status to NOK on cancel. In that case, do not call verify.
        if (strtolower($status) === 'nok' || strtolower($status) === 'failed' || strtolower($status) === 'error') {
            $txn->payment_status = 'failed';
            $txn->save();
            return response()->json(['message' => 'Payment failed']);
        }

        $gateway = PaymentFactory::make($txn->gateway);
        $verification = $gateway->verify($authority, (int) $txn->amount);

        if ($verification['success']) {
            DB::transaction(function () use ($txn, $verification) {
                $txn->payment_status = 'completed';
                $txn->reference_id = $verification['reference_id'] ?? null;
                $txn->meta = $verification['raw'] ?? null;
                $txn->save();

                // credit user balance
                $user = $txn->user()->lockForUpdate()->first();
                $user->credit_balance = ((float) $user->credit_balance) + (float) $txn->amount;
                $user->save();
            });

            return response()->json([
                'message' => 'Payment verified',
                'reference_id' => $verification['reference_id'] ?? null,
            ]);
        }

        $txn->payment_status = 'failed';
        $txn->meta = $verification['raw'] ?? null;
        $txn->save();

        return response()->json(['message' => 'Verification failed'], 422);
    }
}