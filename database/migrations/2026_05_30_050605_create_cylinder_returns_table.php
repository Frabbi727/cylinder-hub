<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cylinder_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('cylinder_id')->constrained()->restrictOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('qty');
            $table->enum('type', ['empty_return', 'error_correction'])->default('empty_return');
            $table->date('return_date');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('return_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cylinder_returns');
    }
};
