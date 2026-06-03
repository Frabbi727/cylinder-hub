<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'admin')->first();

        $customers = [
            ['Hotel Sonar Bangla', '01700-111222', 'Motijheel, Dhaka'],
            ['Rahela Store',       '01800-333444', 'Dhanmondi, Dhaka'],
            ['Padma Restaurant',   '01900-555666', 'Gulshan-1, Dhaka'],
            ['Nodi General Store', '01711-777888', 'Mirpur-10, Dhaka'],
            ['Green Valley Hotel', '01955-447788', 'Banani, Dhaka'],
            ['City Garments Ltd',  '01833-773344', 'Mirpur DOHS, Dhaka'],
            ["Mitu's Kitchen",     '01733-221144', 'Mohammadpur, Dhaka'],
            ['Dhaka Sweet House',  '01722-661122', 'Dhanmondi, Dhaka'],
            ['Raju Tea Stall',     '01611-559900', 'Farmgate, Dhaka'],
            ['Salam Furniture',    '01844-335566', 'Gulshan-2, Dhaka'],
        ];

        foreach ($customers as [$name, $phone, $address]) {
            Customer::create([
                'name'      => $name,
                'phone'     => $phone,
                'address'   => $address,
                'total_due' => 0,
                'added_by'  => $admin?->id,
                'is_active' => true,
            ]);
        }
    }
}
