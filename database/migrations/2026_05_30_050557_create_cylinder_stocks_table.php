<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cylinder_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cylinder_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('filled_qty')->default(0);
            $table->unsignedInteger('empty_qty')->default(0);
            $table->unsignedInteger('capacity')->default(100);
            $table->timestamps();

            $table->unique('cylinder_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cylinder_stocks');
    }
};
