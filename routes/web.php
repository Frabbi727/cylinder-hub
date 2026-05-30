<?php

use Illuminate\Support\Facades\Route;

// Catch-all: serve the React SPA for any web request
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
