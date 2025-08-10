<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminLogsAndSessionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_logs_or_sessions(): void
    {
        $user = User::factory()->create(['is_admin' => false]);
        $token = $user->createToken('api')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/admin/logs')->assertStatus(403);
        $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/admin/sessions')->assertStatus(403);
    }

    public function test_admin_can_list_logs_and_sessions_with_filters(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();
        ActivityLog::query()->create(['user_id' => $user->id, 'action_type' => 'login', 'timestamp' => now()]);
        ActivityLog::query()->create(['user_id' => $user->id, 'action_type' => 'logout', 'timestamp' => now()]);

        UserSession::query()->create(['user_id' => $user->id, 'start_time' => now()->subHour(), 'end_time' => null]);
        UserSession::query()->create(['user_id' => $user->id, 'start_time' => now()->subHours(2), 'end_time' => now()->subHour()]);

        $token = $admin->createToken('api')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/logs?user_id='.$user->id.'&action_type=login')
            ->assertOk()
            ->assertJsonFragment(['action_type' => 'login']);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/sessions?user_id='.$user->id.'&active=true')
            ->assertOk()
            ->assertJsonFragment(['end_time' => null]);
    }
}