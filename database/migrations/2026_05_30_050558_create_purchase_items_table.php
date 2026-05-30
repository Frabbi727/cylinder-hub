<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cylinder_id')->constrained()->restrictOnDelete();
            $table->decimal('unit_cost', 10, 2);
            $table->unsignedInteger('qty');
            $table->unsignedInteger('remaining_qty');
            $table->enum('status', ['pending', 'active', 'done', 'inactive'])->default('pending');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['cylinder_id', 'status']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_items');
    }
};
