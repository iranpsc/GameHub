<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\V1\UserBalanceController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\Admin\RechargeController as AdminRechargeController;

Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);
Route::post('password/forgot', [AuthController::class, 'forgot']);

// Authenticated logout endpoint
Route::middleware('auth:sanctum')->post('logout', [AuthController::class, 'logout']);

// Expose non-versioned endpoint: /api/user/balance (auth via controller middleware)
Route::get('user/balance', [UserBalanceController::class, 'show']);

Route::prefix('v1')->group(function () {
    Route::get('health', [HealthController::class, 'index']);
    Route::apiResource('users', UserController::class);

    // Versioned endpoint: /api/v1/user/balance (auth via controller middleware)
    Route::get('user/balance', [UserBalanceController::class, 'show']);
});

// Payment endpoints (non-versioned for callback compatibility)
Route::post('payment/start', [PaymentController::class, 'start']);
Route::post('payment/callback', [PaymentController::class, 'callback']);

// Admin recharge
Route::post('admin/recharge', [AdminRechargeController::class, 'store']);