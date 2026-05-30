<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $fillable = [
        'name', 'type', 'phone', 'address', 'total_due', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'total_due' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }

    public function duePayments()
    {
        return $this->hasMany(DuePayment::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeWithDue($query)
    {
        return $query->where('total_due', '>', 0);
    }
}
