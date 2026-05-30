<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DueCollection extends Model
{
    protected $fillable = [
        'customer_id', 'sale_id', 'collected_by',
        'amount', 'collection_date', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'collection_date' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function collectedBy()
    {
        return $this->belongsTo(User::class, 'collected_by');
    }
}
