<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DueCollection extends Model
{
    protected $fillable = [
        'customer_id', 'sale_id', 'collected_by',
        'amount', 'collection_date', 'notes',
        'reconciled_allocation_id',
    ];

    protected function casts(): array
    {
        return [
            'collection_date' => 'date',
            'amount'          => 'decimal:2',
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

    public function reconciledAllocation()
    {
        return $this->belongsTo(StockAllocation::class, 'reconciled_allocation_id');
    }

    public function scopePending($query)
    {
        return $query->whereNull('reconciled_allocation_id');
    }
}
