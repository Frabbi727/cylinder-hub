<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Daily at 9:00 AM — notify admins of overdue customers
Schedule::command('notify:overdue')->dailyAt('09:00');

// Daily at 8:00 PM — notify admins of unreconciled salesmen
Schedule::command('notify:unreconciled')->dailyAt('20:00');
