<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CylinderReturn extends Model
{
    protected $fillable = [
        'sale_id', 'customer_id', 'cylinder_id', 'recorded_by',
        'salesman_id', 'allocation_id',
        'qty', 'type', 'return_date', 'notes',
        'is_extra', 'extra_reason', 'is_verified',
    ];

    protected function casts(): array
    {
        return [
            'return_date' => 'date',
            'is_extra'    => 'boolean',
            'is_verified' => 'boolean',
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

    public function salesman()
    {
        return $this->belongsTo(User::class, 'salesman_id');
    }

    public function allocation()
    {
        return $this->belongsTo(StockAllocation::class, 'allocation_id');
    }
}
