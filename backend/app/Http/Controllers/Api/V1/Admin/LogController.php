<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogController extends Controller
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

        $query = ActivityLog::query()->with('user')->latest('timestamp');

        if ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->integer('user_id'));
        }
        if ($request->filled('action_type')) {
            $query->where('action_type', (string) $request->string('action_type'));
        }

        $logs = $query->paginate(perPage: (int) ($request->integer('per_page') ?: 15));

        return response()->json($logs);
    }
}