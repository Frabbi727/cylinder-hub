<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Purchase extends Model
{
    use SoftDeletes;

    protected $appends = ['total_qty', 'total_remaining_qty'];

    protected $fillable = [
        'supplier_id', 'recorded_by', 'purchase_date',
        'total_amount', 'paid_amount', 'due_amount', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'purchase_date' => 'date:Y-m-d',
            'total_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'due_amount' => 'decimal:2',
        ];
    }

    public function getTotalQtyAttribute(): int
    {
        if (! $this->relationLoaded('items')) return 0;
        return (int) $this->items->sum('qty');
    }

    public function getTotalRemainingQtyAttribute(): int
    {
        if (! $this->relationLoaded('items')) return 0;
        return (int) $this->items->sum('remaining_qty');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function items()
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('purchase_date', today());
    }
}
