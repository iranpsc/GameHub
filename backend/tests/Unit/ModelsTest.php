<?php

namespace Tests\Unit;

use App\Models\ActivityLog;
use App\Models\Transaction;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_relationships(): void
    {
        $user = User::factory()->create();
        $txn = Transaction::query()->create([
            'user_id' => $user->id,
            'amount' => 100,
            'transaction_type' => 'credit',
            'payment_status' => 'completed',
            'gateway' => 'admin',
        ]);
        $log = ActivityLog::query()->create([
            'user_id' => $user->id,
            'action_type' => 'login',
            'timestamp' => now(),
        ]);
        $session = UserSession::query()->create([
            'user_id' => $user->id,
            'start_time' => now(),
            'end_time' => null,
        ]);

        $this->assertTrue($user->transactions->contains($txn));
        $this->assertTrue($user->logs->contains($log));
        $this->assertTrue($user->sessions->contains($session));

        $this->assertEquals($user->id, $txn->user->id);
        $this->assertEquals($user->id, $log->user->id);
        $this->assertEquals($user->id, $session->user->id);
    }
}