<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'purchase_id', 'cylinder_id', 'unit_cost', 'qty', 'remaining_qty', 'status',
    ];

    protected function casts(): array
    {
        return [
            'unit_cost' => 'decimal:2',
        ];
    }

    public function purchase()
    {
        return $this->belongsTo(Purchase::class);
    }

    public function cylinder()
    {
        return $this->belongsTo(Cylinder::class);
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    // Returns active/pending lots oldest-first for FIFO consumption
    public function scopeFifoQueue($query, int $cylinderId)
    {
        return $query
            ->where('cylinder_id', $cylinderId)
            ->whereIn('status', ['pending', 'active'])
            ->where('remaining_qty', '>', 0)
            ->orderBy('created_at', 'asc');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
