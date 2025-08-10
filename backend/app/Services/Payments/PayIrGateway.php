<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class PayIrGateway implements PaymentGatewayInterface
{
    private string $apiKey;
    private string $baseUrl;

    public function __construct()
    {
        $config = config('payment.gateways.payir');
        $this->apiKey = (string) ($config['api_key'] ?? '');
        $this->baseUrl = rtrim((string) ($config['base_url'] ?? 'https://pay.ir/pg'), '/');
    }

    public function getName(): string
    {
        return 'payir';
    }

    public function start(int $amountInRials, string $callbackUrl, string $description = ''): array
    {
        $payload = [
            'api' => $this->apiKey,
            'amount' => $amountInRials,
            'redirect' => $callbackUrl,
            'description' => $description ?: 'Wallet recharge',
        ];

        $response = Http::asForm()->post($this->baseUrl . '/send', $payload)->throwIf(function ($res) {
            return $res->status() >= 500;
        });

        $data = $response->json();

        // Pay.ir may return {status:1, token:"..."}
        if (($data['status'] ?? 0) == 1 && !empty($data['token'])) {
            $token = (string) $data['token'];
            $redirectUrl = $this->baseUrl . '/go/' . $token;
            return [
                'redirect_url' => $redirectUrl,
                'authority' => $token,
            ];
        }

        throw new \RuntimeException('Pay.ir start failed: ' . json_encode($data));
    }

    public function verify(string $authority, int $amountInRials): array
    {
        $payload = [
            'api' => $this->apiKey,
            'token' => $authority,
        ];

        $response = Http::asForm()->post($this->baseUrl . '/verify', $payload)->throwIf(function ($res) {
            return $res->status() >= 500;
        });

        $data = $response->json();

        // Success example: {status:1, amount:10000, transId:123456, factorNumber:null, cardNumber:"xxxx", message:"..."}
        $success = ($data['status'] ?? 0) == 1;
        $referenceId = $success ? (string) ($data['transId'] ?? '') : null;

        return [
            'success' => $success,
            'reference_id' => $referenceId,
            'raw' => $data,
        ];
    }
}