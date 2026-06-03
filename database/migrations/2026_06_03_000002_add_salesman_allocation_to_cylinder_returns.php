<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cylinder_returns', function (Blueprint $table) {
            $table->foreignId('salesman_id')->nullable()->after('recorded_by')
                ->constrained('users')->nullOnDelete();
            $table->foreignId('allocation_id')->nullable()->after('salesman_id')
                ->constrained('stock_allocations')->nullOnDelete();

            $table->index(['salesman_id', 'return_date']);
            $table->index('allocation_id');
        });
    }

    public function down(): void
    {
        Schema::table('cylinder_returns', function (Blueprint $table) {
            $table->dropForeign(['salesman_id']);
            $table->dropForeign(['allocation_id']);
            $table->dropIndex(['salesman_id', 'return_date']);
            $table->dropIndex(['allocation_id']);
            $table->dropColumn(['salesman_id', 'allocation_id']);
        });
    }
};
