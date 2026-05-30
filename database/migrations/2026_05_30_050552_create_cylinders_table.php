<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cylinders', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('size');
            $table->string('short_code', 5);
            $table->string('color1', 10)->default('#2BB3C0');
            $table->string('color2', 10)->default('#0E7B86');
            $table->string('brands')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->unsignedInteger('reorder_level')->default(10);
            $table->unsignedInteger('capacity')->default(100);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cylinders');
    }
};
