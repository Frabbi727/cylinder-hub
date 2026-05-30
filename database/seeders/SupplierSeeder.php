<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            ['name' => 'Omera Petroleum', 'type' => 'dealer', 'total_due' => 20800],
            ['name' => 'Bashundhara LP',  'type' => 'dealer', 'total_due' => 0],
            ['name' => 'Jamuna Dealer',   'type' => 'dealer', 'total_due' => 0],
            ['name' => 'Self',            'type' => 'self',   'total_due' => 400],
        ];

        foreach ($suppliers as $s) {
            Supplier::create($s);
        }
    }
}
