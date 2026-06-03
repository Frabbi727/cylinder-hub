<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockAllocation extends Model
{
    protected $fillable = [
        'salesman_id', 'cylinder_id', 'allocation_date',
        'qty', 'sale_price', 'sold_qty', 'returned_qty', 'collected_amount',
        'is_reconciled', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'allocation_date'  => 'date:Y-m-d',
            'qty'              => 'integer',
            'sold_qty'         => 'integer',
            'returned_qty'     => 'integer',
            'sale_price'       => 'decimal:2',
            'collected_amount' => 'decimal:2',
            'is_reconciled'    => 'boolean',
        ];
    }

    public function salesman()
    {
        return $this->belongsTo(User::class, 'salesman_id');
    }

    public function cylinder()
    {
        return $this->belongsTo(Cylinder::class);
    }

    public function scopeForSalesman($query, int $salesmanId)
    {
        return $query->where('salesman_id', $salesmanId);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('allocation_date', today());
    }

    public function getWithSalesmanAttribute(): int
    {
        return $this->qty - $this->sold_qty - $this->returned_qty;
    }
}
