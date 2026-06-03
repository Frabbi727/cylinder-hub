<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sale extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'customer_id', 'salesman_id', 'sale_date',
        'total_amount', 'paid_amount', 'payment_type', 'notes',
    ];

    protected $appends = ['due_amount'];

    protected function casts(): array
    {
        return [
            'sale_date'    => 'date:Y-m-d',
            'salesman_id'  => 'integer',
            'customer_id'  => 'integer',
            'total_amount' => 'decimal:2',
            'paid_amount'  => 'decimal:2',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function salesman()
    {
        return $this->belongsTo(User::class, 'salesman_id');
    }

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function dueCollections()
    {
        return $this->hasMany(DueCollection::class);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('sale_date', today());
    }

    public function scopeForSalesman($query, int $salesmanId)
    {
        return $query->where('salesman_id', $salesmanId);
    }

    public function getDueAmountAttribute(): float
    {
        return (float) $this->total_amount - (float) $this->paid_amount;
    }
}
