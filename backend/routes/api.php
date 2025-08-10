<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\AuthController;

Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);
Route::post('password/forgot', [AuthController::class, 'forgot']);

Route::prefix('v1')->group(function () {
    Route::get('health', [HealthController::class, 'index']);
    Route::apiResource('users', UserController::class);
});