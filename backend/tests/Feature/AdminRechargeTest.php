<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminRechargeTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_recharge(): void
    {
        $user = User::factory()->create(['is_admin' => false]);
        $token = $user->createToken('api')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/admin/recharge', ['user_id' => 1, 'amount' => 1000])
            ->assertStatus(403);
    }

    public function test_admin_recharge_increments_balance_and_creates_transaction(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $target = User::factory()->create(['credit_balance' => 0]);
        $token = $admin->createToken('api')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/admin/recharge', ['user_id' => $target->id, 'amount' => 2500])
            ->assertOk()
            ->assertJson(['message' => 'Balance recharged']);

        $target->refresh();
        $this->assertEquals(2500.00, (float) $target->credit_balance);
        $this->assertDatabaseHas('transactions', [
            'user_id' => $target->id,
            'amount' => 2500,
            'gateway' => 'admin',
            'payment_status' => 'completed',
        ]);
    }
}