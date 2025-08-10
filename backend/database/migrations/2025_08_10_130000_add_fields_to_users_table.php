<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('mobile')->nullable()->after('email');
            $table->decimal('credit_balance', 12, 2)->default(0);
            $table->unsignedInteger('remaining_time')->default(0);

            $table->unique('mobile');
            $table->index('remaining_time');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['mobile']);
            $table->dropIndex(['remaining_time']);
            $table->dropColumn(['mobile', 'credit_balance', 'remaining_time']);
        });
    }
};