<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CylinderReturn extends Model
{
    protected $fillable = [
        'sale_id', 'customer_id', 'cylinder_id', 'recorded_by',
        'qty', 'type', 'return_date', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'return_date' => 'date',
        ];
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function cylinder()
    {
        return $this->belongsTo(Cylinder::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
