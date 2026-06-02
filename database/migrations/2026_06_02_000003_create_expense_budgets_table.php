<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_budgets', function (Blueprint $table) {
            $table->id();
            $table->enum('category', ['transport', 'salary', 'rent', 'utility', 'other'])->unique();
            $table->decimal('monthly_budget', 12, 2);
            $table->unsignedTinyInteger('alert_threshold')->default(80);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_budgets');
    }
};
