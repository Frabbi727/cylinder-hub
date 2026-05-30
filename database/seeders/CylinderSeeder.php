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
                'name' => 'LP Gas', 'size' => '12 kg', 'short_code' => '12',
                'color1' => '#2BB3C0', 'color2' => '#0E7B86',
                'brands' => 'Bashundhara, Omera', 'status' => 'active',
                'reorder_level' => 40, 'capacity' => 200,
                'stock' => ['filled_qty' => 142, 'empty_qty' => 88],
            ],
            [
                'name' => 'LP Gas', 'size' => '35 kg', 'short_code' => '35',
                'color1' => '#5A8DEE', 'color2' => '#2C5FB8',
                'brands' => 'Omera, Jamuna', 'status' => 'active',
                'reorder_level' => 20, 'capacity' => 80,
                'stock' => ['filled_qty' => 34, 'empty_qty' => 19],
            ],
            [
                'name' => 'Petromax', 'size' => 'Small', 'short_code' => 'PX',
                'color1' => '#FF8A5B', 'color2' => '#D2541C',
                'brands' => 'Local refill', 'status' => 'active',
                'reorder_level' => 15, 'capacity' => 60,
                'stock' => ['filled_qty' => 17, 'empty_qty' => 41],
            ],
            [
                'name' => 'Industrial Gas', 'size' => '45 kg', 'short_code' => '45',
                'color1' => '#9AA3AE', 'color2' => '#5B636E',
                'brands' => 'Factory supply', 'status' => 'inactive',
                'reorder_level' => 10, 'capacity' => 30,
                'stock' => ['filled_qty' => 6, 'empty_qty' => 4],
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
