<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salesman_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('cylinder_id')->constrained()->restrictOnDelete();
            $table->date('allocation_date');
            $table->unsignedInteger('qty');
            $table->unsignedInteger('sold_qty')->default(0);
            $table->unsignedInteger('returned_qty')->default(0);
            $table->decimal('collected_amount', 12, 2)->default(0);
            $table->boolean('is_reconciled')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['salesman_id', 'allocation_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_allocations');
    }
};
