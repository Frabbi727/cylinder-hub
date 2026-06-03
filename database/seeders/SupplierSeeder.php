<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            [
                'name'      => 'Omera Gas One Ltd',
                'type'      => 'dealer',
                'phone'     => '02-55042600',
                'address'   => 'Bashundhara City, Dhaka',
                'total_due' => 0,
                'is_active' => true,
            ],
            [
                'name'      => 'Bashundhara LP Gas',
                'type'      => 'dealer',
                'phone'     => '01847-110011',
                'address'   => 'Bashundhara R/A, Dhaka',
                'total_due' => 0,
                'is_active' => true,
            ],
            [
                'name'      => 'Jamuna Gas Ltd',
                'type'      => 'dealer',
                'phone'     => '01711-223344',
                'address'   => 'Tejgaon, Dhaka',
                'total_due' => 0,
                'is_active' => true,
            ],
            [
                'name'      => 'Padma Gas Co.',
                'type'      => 'dealer',
                'phone'     => '01811-334455',
                'address'   => 'Narayanganj, Dhaka',
                'total_due' => 0,
                'is_active' => true,
            ],
        ];

        foreach ($suppliers as $s) {
            Supplier::create($s);
        }
    }
}
