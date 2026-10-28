<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

final class DatabaseErrorResponseTest extends TestCase
{
    public function test_database_errors_hide_queries_and_connection_details_even_with_debug_enabled(): void
    {
        config(['app.debug' => true]);
        Route::get('/api/database-error-test', fn () => DB::table('loyalty.exception_handler_test_missing_table')->get());

        $this->getJson('/api/database-error-test')
            ->assertStatus(500)
            ->assertExactJson([
                'success' => false,
                'message' => 'No pudimos completar la solicitud. Intenta de nuevo en unos momentos.',
                'error' => 'DATA_ACCESS_ERROR',
            ]);
    }

    public function test_api_database_errors_stay_json_without_an_accept_header(): void
    {
        config(['app.debug' => true]);
        Route::get('/api/database-error-test', fn () => DB::table('loyalty.exception_handler_test_missing_table')->get());

        $this->get('/api/database-error-test')
            ->assertStatus(500)
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonPath('error', 'DATA_ACCESS_ERROR')
            ->assertJsonMissingPath('exception')
            ->assertJsonMissingPath('trace');
    }

    public function test_validation_errors_preserve_their_actionable_messages(): void
    {
        Route::post('/api/database-validation-test', fn () => request()->validate(['name' => 'required|string']));

        $this->postJson('/api/database-validation-test')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }
}
