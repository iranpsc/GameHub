<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsersAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_users_index(): void
    {
        $user = User::factory()->create(['is_admin' => false]);
        $token = $user->createToken('api')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/users')
            ->assertStatus(403);
    }

    public function test_admin_can_list_create_update_and_delete_users(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $token = $admin->createToken('api')->plainTextToken;

        // index
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/users')
            ->assertOk();

        // create
        $payload = ['name' => 'New User', 'email' => 'new@example.com', 'password' => 'secret1234'];
        $create = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/users', $payload)
            ->assertCreated();
        $createdId = $create->json('id');

        // update
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/v1/users/'.$createdId, ['name' => 'Updated Name'])
            ->assertOk()
            ->assertJson(['name' => 'Updated Name']);

        // show
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/users/'.$createdId)
            ->assertOk()
            ->assertJson(['id' => $createdId]);

        // delete
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson('/api/v1/users/'.$createdId)
            ->assertNoContent();
    }
}