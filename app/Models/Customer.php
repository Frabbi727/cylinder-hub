<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = [
        'name', 'phone', 'address', 'total_due', 'added_by', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'total_due' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function addedBy()
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function dueCollections()
    {
        return $this->hasMany(DueCollection::class);
    }

    public function returns()
    {
        return $this->hasMany(CylinderReturn::class);
    }

    public function scopeWithDue($query)
    {
        return $query->where('total_due', '>', 0);
    }

    public function scopeSearch($query, string $term)
    {
        return $query->where(function ($q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
              ->orWhere('phone', 'like', "%{$term}%");
        });
    }
}
