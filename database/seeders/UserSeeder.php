<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name'            => 'Abdul Hakim',
            'email'           => 'admin@cylinderhub.com',
            'password'        => 'password',
            'role'            => 'admin',
            'avatar_initials' => 'AH',
            'phone'           => '01700-000000',
            'is_active'       => true,
        ]);

        $salesmen = [
            ['name' => 'Karim Uddin',   'email' => 'karim@cylinderhub.com', 'avatar_initials' => 'KU', 'phone' => '01711-203040'],
            ['name' => 'Rafiq Hossain', 'email' => 'rafiq@cylinderhub.com', 'avatar_initials' => 'RH', 'phone' => '01822-556677'],
            ['name' => 'Jamal Mia',     'email' => 'jamal@cylinderhub.com', 'avatar_initials' => 'JM', 'phone' => '01933-889900'],
        ];

        foreach ($salesmen as $s) {
            User::create([
                'name'            => $s['name'],
                'email'           => $s['email'],
                'password'        => '12345678',
                'role'            => 'salesman',
                'avatar_initials' => $s['avatar_initials'],
                'phone'           => $s['phone'],
                'is_active'       => true,
            ]);
        }

    }
}
