<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'phone', 'avatar_initials', 'role', 'is_active',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isSalesman(): bool
    {
        return $this->role === 'salesman';
    }

    public function sales()
    {
        return $this->hasMany(Sale::class, 'salesman_id');
    }

    public function allocations()
    {
        return $this->hasMany(StockAllocation::class, 'salesman_id');
    }

    public function customers()
    {
        return $this->hasMany(Customer::class, 'added_by');
    }
}
