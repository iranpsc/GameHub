<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('action_type');
            $table->timestamp('timestamp')->useCurrent();

            $table->index('action_type');
            $table->index(['user_id', 'timestamp']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logs');
    }
};