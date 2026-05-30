<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cylinder extends Model
{
    protected $fillable = [
        'name', 'size', 'short_code', 'color1', 'color2',
        'brands', 'status', 'reorder_level', 'capacity',
    ];

    public function stock()
    {
        return $this->hasOne(CylinderStock::class);
    }

    public function purchaseItems()
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function allocations()
    {
        return $this->hasMany(StockAllocation::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
