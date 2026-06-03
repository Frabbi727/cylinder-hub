<?php

namespace Database\Seeders;

use App\Models\Cylinder;
use App\Models\CylinderStock;
use Illuminate\Database\Seeder;

class CylinderSeeder extends Seeder
{
    public function run(): void
    {
        $cylinders = [
            [
                'name'          => 'Omera',
                'size'          => '12kg',
                'short_code'    => 'O12',
                'color1'        => '#2BB3C0',
                'color2'        => '#0E7B86',
                'brands'        => 'Omera Gas One Ltd',
                'status'        => 'active',
                'reorder_level' => 30,
                'capacity'      => 300,
                'stock'         => ['filled_qty' => 100, 'empty_qty' => 20],
            ],
            [
                'name'          => 'Omera',
                'size'          => '35kg',
                'short_code'    => 'O35',
                'color1'        => '#0B9CAA',
                'color2'        => '#086A75',
                'brands'        => 'Omera Gas One Ltd',
                'status'        => 'active',
                'reorder_level' => 15,
                'capacity'      => 100,
                'stock'         => ['filled_qty' => 50, 'empty_qty' => 10],
            ],
            [
                'name'          => 'Jamuna',
                'size'          => '35kg',
                'short_code'    => 'J35',
                'color1'        => '#5A8DEE',
                'color2'        => '#2C5FB8',
                'brands'        => 'Jamuna Gas Ltd',
                'status'        => 'active',
                'reorder_level' => 15,
                'capacity'      => 120,
                'stock'         => ['filled_qty' => 60, 'empty_qty' => 15],
            ],
            [
                'name'          => 'Basundhara',
                'size'          => '12kg',
                'short_code'    => 'B12',
                'color1'        => '#FF8A5B',
                'color2'        => '#D2541C',
                'brands'        => 'Bashundhara LP Gas',
                'status'        => 'active',
                'reorder_level' => 20,
                'capacity'      => 200,
                'stock'         => ['filled_qty' => 80, 'empty_qty' => 25],
            ],
            [
                'name'          => 'Basundhara',
                'size'          => '35kg',
                'short_code'    => 'B35',
                'color1'        => '#E8733A',
                'color2'        => '#B04E20',
                'brands'        => 'Bashundhara LP Gas',
                'status'        => 'active',
                'reorder_level' => 10,
                'capacity'      => 80,
                'stock'         => ['filled_qty' => 40, 'empty_qty' => 8],
            ],
            [
                'name'          => 'Padma',
                'size'          => '45kg',
                'short_code'    => 'P45',
                'color1'        => '#9AA3AE',
                'color2'        => '#5B636E',
                'brands'        => 'Padma Gas Co.',
                'status'        => 'active',
                'reorder_level' => 5,
                'capacity'      => 50,
                'stock'         => ['filled_qty' => 20, 'empty_qty' => 5],
            ],
        ];

        foreach ($cylinders as $data) {
            $stock = $data['stock'];
            unset($data['stock']);
            $cylinder = Cylinder::create($data);
            CylinderStock::create([
                'cylinder_id' => $cylinder->id,
                'filled_qty'  => $stock['filled_qty'],
                'empty_qty'   => $stock['empty_qty'],
                'capacity'    => $data['capacity'],
            ]);
        }
    }
}
