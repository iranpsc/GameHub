<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreUserRequest;
use App\Http\Requests\Api\V1\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    protected function ensureAdmin(Request $request): ?JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->is_admin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return null;
    }

    public function index(Request $request): JsonResponse
    {
        if ($resp = $this->ensureAdmin($request)) return $resp;
        $users = User::query()->latest()->paginate();
        return response()->json($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        if ($resp = $this->ensureAdmin($request)) return $resp;
        $user = User::create([
            'name' => $request->string('name'),
            'email' => $request->string('email'),
            'password' => bcrypt($request->string('password')),
        ]);

        return response()->json($user, 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        if ($resp = $this->ensureAdmin($request)) return $resp;
        return response()->json($user);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        if ($resp = $this->ensureAdmin($request)) return $resp;
        $user->update($request->validated());
        return response()->json($user);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($resp = $this->ensureAdmin($request)) return $resp;
        $user->delete();
        return response()->json(null, 204);
    }
}
