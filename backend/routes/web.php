<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Minimal route for password reset URL generation in tests
Route::get('/reset-password/{token}', function ($token) {
    return "Reset token: {$token}";
})->name('password.reset');
