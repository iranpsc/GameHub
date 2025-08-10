<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserBalanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_balance_requires_authentication(): void
    {
        $this->getJson('/api/user/balance')->assertStatus(401);
        $this->getJson('/api/v1/user/balance')->assertStatus(401);
    }

    public function test_balance_returns_credit_and_time_non_versioned(): void
    {
        $user = User::factory()->create([
            'credit_balance' => 123.45,
            'remaining_time' => 42,
        ]);
        $token = $user->createToken('api')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/user/balance')
            ->assertOk()
            ->assertJson([
                'credit_balance' => 123.45,
                'remaining_time' => 42,
            ]);
    }

    public function test_balance_returns_credit_and_time_versioned(): void
    {
        $user = User::factory()->create([
            'credit_balance' => 50.00,
            'remaining_time' => 10,
        ]);
        $token = $user->createToken('api')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/user/balance')
            ->assertOk()
            ->assertJson([
                'credit_balance' => 50.00,
                'remaining_time' => 10,
            ]);
    }
}