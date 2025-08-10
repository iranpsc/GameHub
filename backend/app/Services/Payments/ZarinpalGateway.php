<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\Http;

class ZarinpalGateway implements PaymentGatewayInterface
{
    private string $merchantId;
    private string $baseUrl;
    private string $gatewayBase;
    private bool $sandbox;

    public function __construct()
    {
        $config = config('payment.gateways.zarinpal');
        $this->merchantId = (string) ($config['merchant_id'] ?? '');
        $this->baseUrl = rtrim((string) ($config['base_url'] ?? 'https://api.zarinpal.com/pg/v4'), '/');
        $this->gatewayBase = rtrim((string) ($config['gateway_base'] ?? 'https://www.zarinpal.com/pg/StartPay'), '/');
        $this->sandbox = (bool) ($config['sandbox'] ?? false);
    }

    public function getName(): string
    {
        return 'zarinpal';
    }

    public function start(int $amountInRials, string $callbackUrl, string $description = ''): array
    {
        $payload = [
            'merchant_id' => $this->merchantId,
            'amount' => $amountInRials,
            'description' => $description ?: 'Wallet recharge',
            'callback_url' => $callbackUrl,
        ];

        $response = Http::withHeaders([
            'accept' => 'application/json'
        ])->post($this->baseUrl . '/payment/request.json', $payload)->throwIf(function ($res) {
            return $res->status() >= 500;
        });

        $data = $response->json();
        // Expected {data: {code: 100, message: ..., authority: ...}, errors: []}
        $dataBlock = $data['data'] ?? [];
        if (($dataBlock['code'] ?? 0) == 100 && !empty($dataBlock['authority'])) {
            $authority = (string) $dataBlock['authority'];
            $redirect = $this->gatewayBase . '/' . $authority;
            return [
                'redirect_url' => $redirect,
                'authority' => $authority,
            ];
        }

        throw new \RuntimeException('Zarinpal start failed: ' . json_encode($data));
    }

    public function verify(string $authority, int $amountInRials): array
    {
        $payload = [
            'merchant_id' => $this->merchantId,
            'amount' => $amountInRials,
            'authority' => $authority,
        ];

        $response = Http::withHeaders([
            'accept' => 'application/json'
        ])->post($this->baseUrl . '/payment/verify.json', $payload)->throwIf(function ($res) {
            return $res->status() >= 500;
        });

        $data = $response->json();
        $dataBlock = $data['data'] ?? [];
        $success = ($dataBlock['code'] ?? 0) == 100 || ($dataBlock['code'] ?? 0) == 101; // 101: already verified
        $referenceId = $success ? (string) ($dataBlock['ref_id'] ?? '') : null;

        return [
            'success' => $success,
            'reference_id' => $referenceId,
            'raw' => $data,
        ];
    }
}