<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE stock_movements MODIFY COLUMN event_type ENUM(
            'purchase', 'sale', 'sale_delete', 'allocation',
            'allocation_edit', 'reconcile_adjustment',
            'eod_return', 'cylinder_return', 'refill_sent', 'refill_received'
        ) NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE stock_movements MODIFY COLUMN event_type ENUM(
            'purchase', 'sale', 'sale_delete', 'allocation',
            'eod_return', 'cylinder_return', 'refill_sent', 'refill_received'
        ) NOT NULL");
    }
};
