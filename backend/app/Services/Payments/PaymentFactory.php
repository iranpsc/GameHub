<?php

namespace App\Services\Payments;

use InvalidArgumentException;

class PaymentFactory
{
    public static function make(?string $gatewayName = null): PaymentGatewayInterface
    {
        $name = $gatewayName ?: config('payment.default_gateway');
        $name = strtolower((string) $name);
        return match ($name) {
            'zarinpal' => new ZarinpalGateway(),
            default => throw new InvalidArgumentException("Unsupported gateway: {$name}"),
        };
    }
}