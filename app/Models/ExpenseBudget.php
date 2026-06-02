<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExpenseBudget extends Model
{
    protected $fillable = ['category', 'monthly_budget', 'alert_threshold'];

    protected function casts(): array
    {
        return ['monthly_budget' => 'decimal:2'];
    }
}
