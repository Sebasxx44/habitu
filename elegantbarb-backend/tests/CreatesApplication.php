<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;

trait CreatesApplication
{
    /**
     * Creates the application.
     */
    public function createApplication(): Application
    {
        $app = require __DIR__.'/../bootstrap/app.php';

        $app->make(Kernel::class)->bootstrap();

        if (! $app->environment('testing') || config('database.connections.pgsql.database') !== 'elegantbarb_test'
            || (string) config('database.connections.pgsql.port') !== '55439'
            || config('database.default') !== 'pgsql') {
            throw new \RuntimeException('Tests require the isolated elegantbarb_test database on port 55439. Clear cached configuration before testing.');
        }

        return $app;
    }
}
