<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserSessionController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (! $admin || ! $admin->is_admin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $query = UserSession::query()->with('user')->latest('start_time');

        if ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->integer('user_id'));
        }
        if ($request->filled('active')) {
            $active = filter_var($request->input('active'), FILTER_VALIDATE_BOOLEAN);
            if ($active) {
                $query->whereNull('end_time');
            } else {
                $query->whereNotNull('end_time');
            }
        }

        $sessions = $query->paginate(perPage: (int) ($request->integer('per_page') ?: 15));

        return response()->json($sessions);
    }
}