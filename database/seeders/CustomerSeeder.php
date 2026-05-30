<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            ['name' => 'Hotel Sonar Bangla', 'phone' => '01700-111222', 'total_due' => 5800],
            ['name' => 'Rahela Store',        'phone' => '01800-333444', 'total_due' => 12000],
            ['name' => 'Padma Restaurant',    'phone' => '01900-555666', 'total_due' => 3400],
            ['name' => 'Nodi General Store',  'phone' => '01711-777888', 'total_due' => 0],
        ];

        foreach ($customers as $c) {
            Customer::create($c);
        }
    }
}
