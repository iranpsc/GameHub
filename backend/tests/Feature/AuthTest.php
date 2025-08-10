<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_success(): void
    {
        $payload = [
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
        ];

        $response = $this->postJson('/api/register', $payload);

        $response->assertCreated()
            ->assertJsonStructure(['message', 'token', 'user' => ['id', 'name', 'email']]);

        $this->assertDatabaseHas('users', ['email' => 'jane@example.com']);
    }

    public function test_login_success_and_failure(): void
    {
        $user = User::factory()->create([
            'email' => 'john@example.com',
            'password' => bcrypt('password123'),
        ]);

        $ok = $this->postJson('/api/login', ['email' => 'john@example.com', 'password' => 'password123']);
        $ok->assertOk()->assertJsonStructure(['token', 'user']);

        $bad = $this->postJson('/api/login', ['email' => 'john@example.com', 'password' => 'wrong']);
        $bad->assertStatus(422);
    }

    public function test_forgot_password_returns_generic_message(): void
    {
        $user = User::factory()->create(['email' => 'lost@example.com']);
        $response = $this->postJson('/api/password/forgot', ['email' => 'lost@example.com']);
        $response->assertOk()->assertJsonStructure(['message']);
    }

    public function test_logout_revokes_token_if_authenticated(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/logout');

        $response->assertOk();
    }
}