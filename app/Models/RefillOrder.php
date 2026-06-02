<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RefillOrder extends Model
{
    protected $fillable = [
        'cylinder_id', 'supplier_id', 'qty_sent', 'qty_received',
        'sent_date', 'received_date', 'status', 'refill_cost',
        'recorded_by', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'sent_date'     => 'date:Y-m-d',
            'received_date' => 'date:Y-m-d',
            'refill_cost'   => 'decimal:2',
        ];
    }

    public function cylinder()
    {
        return $this->belongsTo(Cylinder::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
