<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('due_collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->foreignId('sale_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('collected_by')->constrained('users')->restrictOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('collection_date');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('collection_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('due_collections');
    }
};
