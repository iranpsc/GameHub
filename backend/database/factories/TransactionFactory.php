<?php

namespace Database\Factories;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Transaction>
 */
class TransactionFactory extends Factory
{
    protected $model = Transaction::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'amount' => $this->faker->numberBetween(100, 100000),
            'transaction_type' => 'credit',
            'payment_status' => 'pending',
            'gateway' => 'admin',
            'authority' => null,
            'reference_id' => null,
            'description' => 'Test transaction',
            'callback_url' => 'https://example.com/callback',
            'meta' => null,
        ];
    }
}