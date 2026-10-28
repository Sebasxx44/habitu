<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/login', function () {
    return response()->json(['message' => 'Use API to login'], 401);
})->name('login');

Route::get('/docs/openapi.yaml', function () {
    $path = base_path('openapi.yaml');
    if (! file_exists($path)) {
        return response()->json(['error' => 'OpenAPI spec not found'], 404);
    }
    return response()->file($path, ['Content-Type' => 'application/x-yaml']);
});

Route::get('/docs', function () {
    return redirect('/docs/openapi.yaml');
});
