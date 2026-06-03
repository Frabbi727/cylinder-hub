<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cylinder_returns', function (Blueprint $table) {
            $table->boolean('is_extra')->default(false)->after('type');
            $table->string('extra_reason')->nullable()->after('is_extra');
            $table->boolean('is_verified')->nullable()->after('extra_reason');
        });
    }

    public function down(): void
    {
        Schema::table('cylinder_returns', function (Blueprint $table) {
            $table->dropColumn(['is_extra', 'extra_reason', 'is_verified']);
        });
    }
};
