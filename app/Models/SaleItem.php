<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    protected $appends = ['line_total'];

    protected $fillable = [
        'sale_id', 'purchase_item_id', 'cylinder_id',
        'qty', 'unit_price', 'unit_cost', 'profit',
    ];

    protected function casts(): array
    {
        return [
            'unit_price' => 'decimal:2',
            'unit_cost' => 'decimal:2',
            'profit' => 'decimal:2',
        ];
    }

    public function getLineTotalAttribute(): float
    {
        return round($this->qty * $this->unit_price, 2);
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function purchaseItem()
    {
        return $this->belongsTo(PurchaseItem::class);
    }

    public function cylinder()
    {
        return $this->belongsTo(Cylinder::class);
    }
}
