<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('gateway')->nullable()->after('payment_status');
            $table->string('authority')->nullable()->after('gateway');
            $table->string('reference_id')->nullable()->after('authority');
            $table->string('description')->nullable()->after('reference_id');
            $table->string('callback_url')->nullable()->after('description');
            $table->json('meta')->nullable()->after('callback_url');

            $table->index('gateway');
            $table->index('authority');
            $table->index('reference_id');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['gateway']);
            $table->dropIndex(['authority']);
            $table->dropIndex(['reference_id']);
            $table->dropColumn(['gateway', 'authority', 'reference_id', 'description', 'callback_url', 'meta']);
        });
    }
};