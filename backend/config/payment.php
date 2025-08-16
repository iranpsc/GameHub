<?php

return [
    'default_gateway' => env('PAYMENT_GATEWAY', 'zarinpal'),

    'callback_url' => env('PAYMENT_CALLBACK_URL', env('APP_URL') . '/api/payment/callback'),

    'gateways' => [
        'zarinpal' => [
            'merchant_id' => env('ZARINPAL_MERCHANT_ID'),
            'base_url' => env('ZARINPAL_BASE_URL', 'https://api.zarinpal.com/pg/v4'),
            'gateway_base' => env('ZARINPAL_GATEWAY_BASE', 'https://www.zarinpal.com/pg/StartPay'),
            'sandbox' => env('ZARINPAL_SANDBOX', false),
        ],
    ],
];