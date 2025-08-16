<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_start_requires_authentication(): void
    {
        $this->postJson('/api/payment/start', ['amount' => 1000, 'gateway' => 'fake'])
            ->assertStatus(401);
    }

    public function test_start_initiates_transaction_and_returns_redirect(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $gateway = Mockery::mock(\App\Services\Payments\PaymentGatewayInterface::class);
        $gateway->shouldReceive('getName')->andReturn('fake');
        $gateway->shouldReceive('start')->with(1000, Mockery::type('string'), Mockery::type('string'))
            ->andReturn(['redirect_url' => 'https://fake/redirect', 'authority' => 'AUTH123']);

        Mockery::mock('alias:App\\Services\\Payments\\PaymentFactory')
            ->shouldReceive('make')->andReturn($gateway);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/payment/start', ['amount' => 1000, 'gateway' => 'fake', 'description' => 'Wallet recharge']);

        $response->assertOk()
            ->assertJson([
                'payment_url' => 'https://fake/redirect',
                'authority' => 'AUTH123',
                'gateway' => 'fake',
            ]);

        $this->assertDatabaseHas('transactions', [
            'user_id' => $user->id,
            'amount' => 1000,
            'payment_status' => 'pending',
            'authority' => 'AUTH123',
        ]);
    }

    public function test_callback_success_verifies_and_credits_user(): void
    {
        $user = User::factory()->create(['credit_balance' => 0]);
        $txn = Transaction::factory()->create([
            'user_id' => $user->id,
            'amount' => 5000,
            'transaction_type' => 'credit',
            'payment_status' => 'pending',
            'gateway' => 'fake',
            'authority' => 'AUTHXYZ',
        ]);

        $gateway = Mockery::mock(\App\Services\Payments\PaymentGatewayInterface::class);
        $gateway->shouldReceive('verify')->with('AUTHXYZ', 5000)->andReturn([
            'success' => true,
            'reference_id' => 'REF-1',
            'raw' => ['ok' => true],
        ]);

        Mockery::mock('alias:App\\Services\\Payments\\PaymentFactory')
            ->shouldReceive('make')->andReturn($gateway);

        $response = $this->postJson('/api/payment/callback', ['Authority' => 'AUTHXYZ', 'Status' => 'OK']);
        $response->assertOk()->assertJson(['message' => 'Payment verified', 'reference_id' => 'REF-1']);

        $this->assertDatabaseHas('transactions', [
            'id' => $txn->id,
            'payment_status' => 'completed',
            'reference_id' => 'REF-1',
        ]);

        $user->refresh();
        $this->assertEquals(5000.00, (float) $user->credit_balance);
    }

    public function test_callback_failed_status_marks_failed(): void
    {
        $user = User::factory()->create(['credit_balance' => 0]);
        $txn = Transaction::factory()->create([
            'user_id' => $user->id,
            'amount' => 5000,
            'transaction_type' => 'credit',
            'payment_status' => 'pending',
            'gateway' => 'fake',
            'authority' => 'AUTHNOK',
        ]);

        $response = $this->postJson('/api/payment/callback', ['Authority' => 'AUTHNOK', 'Status' => 'NOK']);
        $response->assertOk()->assertJson(['message' => 'Payment failed']);
        $this->assertDatabaseHas('transactions', ['id' => $txn->id, 'payment_status' => 'failed']);
    }

    public function test_callback_not_found_returns_404(): void
    {
        $this->postJson('/api/payment/callback', ['Authority' => 'UNKNOWN', 'Status' => 'OK'])
            ->assertStatus(404);
    }

    public function test_callback_success_with_get_method(): void
    {
        $user = User::factory()->create(['credit_balance' => 0]);
        $txn = Transaction::factory()->create([
            'user_id' => $user->id,
            'amount' => 5000,
            'transaction_type' => 'credit',
            'payment_status' => 'pending',
            'gateway' => 'fake',
            'authority' => 'AUTHGET',
        ]);

        $gateway = Mockery::mock(\App\Services\Payments\PaymentGatewayInterface::class);
        $gateway->shouldReceive('verify')->with('AUTHGET', 5000)->andReturn([
            'success' => true,
            'reference_id' => 'REF-GET',
            'raw' => ['ok' => true],
        ]);

        Mockery::mock('alias:App\\Services\\Payments\\PaymentFactory')
            ->shouldReceive('make')->andReturn($gateway);

        $response = $this->getJson('/api/payment/callback?Authority=AUTHGET&Status=OK');
        $response->assertOk()->assertJson(['message' => 'Payment verified', 'reference_id' => 'REF-GET']);

        $this->assertDatabaseHas('transactions', [
            'id' => $txn->id,
            'payment_status' => 'completed',
            'reference_id' => 'REF-GET',
        ]);

        $user->refresh();
        $this->assertEquals(5000.00, (float) $user->credit_balance);
    }
}