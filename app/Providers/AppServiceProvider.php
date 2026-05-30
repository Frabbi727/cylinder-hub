<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // Only admin users can perform admin-only actions
        Gate::define('admin-only', fn ($user) => $user->isAdmin());
    }
}
