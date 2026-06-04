<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('due_collections', function (Blueprint $table) {
            $table->foreignId('reconciled_allocation_id')
                  ->nullable()
                  ->after('notes')
                  ->constrained('stock_allocations')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('due_collections', function (Blueprint $table) {
            $table->dropForeignIfExists(['reconciled_allocation_id']);
            $table->dropColumn('reconciled_allocation_id');
        });
    }
};
