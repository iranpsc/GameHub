<?php

namespace App\Services\Payments;

interface PaymentGatewayInterface
{
    /**
     * Start a payment and return an array with:
     *  - redirect_url: string
     *  - authority: string unique transaction token/id from gateway
     */
    public function start(int $amountInRials, string $callbackUrl, string $description = ''): array;

    /**
     * Verify a payment by authority/token and return an array with:
     *  - success: bool
     *  - reference_id: string|null
     *  - raw: array raw payload
     */
    public function verify(string $authority, int $amountInRials): array;

    /**
     * Name of the gateway (e.g., zarinpal)
     */
    public function getName(): string;
}