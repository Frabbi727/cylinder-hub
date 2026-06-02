<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refill_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cylinder_id')->constrained()->restrictOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('qty_sent');
            $table->unsignedInteger('qty_received')->default(0);
            $table->date('sent_date');
            $table->date('received_date')->nullable();
            $table->enum('status', ['sent', 'partially_received', 'received'])->default('sent');
            $table->decimal('refill_cost', 12, 2)->nullable();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('sent_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refill_orders');
    }
};
