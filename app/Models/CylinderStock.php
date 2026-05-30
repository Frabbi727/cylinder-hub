<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CylinderStock extends Model
{
    protected $fillable = [
        'cylinder_id', 'filled_qty', 'empty_qty', 'capacity',
    ];

    public function cylinder()
    {
        return $this->belongsTo(Cylinder::class);
    }

    public function incrementFilled(int $qty): void
    {
        $this->increment('filled_qty', $qty);
    }

    public function decrementFilled(int $qty): void
    {
        $this->decrement('filled_qty', $qty);
    }

    public function incrementEmpty(int $qty): void
    {
        $this->increment('empty_qty', $qty);
    }

    public function decrementEmpty(int $qty): void
    {
        $this->decrement('empty_qty', $qty);
    }
}
