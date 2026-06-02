<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cylinder_id')->constrained()->restrictOnDelete();
            $table->enum('event_type', [
                'purchase', 'sale', 'sale_delete', 'allocation',
                'eod_return', 'cylinder_return', 'refill_sent', 'refill_received',
            ]);
            $table->integer('change_qty');
            $table->unsignedInteger('balance_after');
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->string('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['cylinder_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
