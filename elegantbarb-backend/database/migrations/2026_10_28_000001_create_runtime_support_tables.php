<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform.runtime_cache', fn (Blueprint $table) => $this->cacheColumns($table));
        Schema::create('platform.runtime_cache_locks', fn (Blueprint $table) => $this->lockColumns($table));
        Schema::create('platform.runtime_sessions', fn (Blueprint $table) => $this->sessionColumns($table));
        Schema::create('platform.runtime_jobs', fn (Blueprint $table) => $this->jobColumns($table));
        Schema::create('platform.runtime_failed_jobs', fn (Blueprint $table) => $this->failedJobColumns($table));
        Schema::create('platform.runtime_job_batches', fn (Blueprint $table) => $this->batchColumns($table));
    }

    public function down(): void
    {
        foreach (['job_batches', 'failed_jobs', 'jobs', 'sessions', 'cache_locks', 'cache'] as $table) {
            Schema::dropIfExists('platform.runtime_'.$table);
        }
    }

    private function cacheColumns(Blueprint $table): void
    {
        $table->string('key')->primary();
        $table->mediumText('value');
        $table->integer('expiration')->index();
    }

    private function lockColumns(Blueprint $table): void
    {
        $table->string('key')->primary();
        $table->string('owner');
        $table->integer('expiration')->index();
    }

    private function sessionColumns(Blueprint $table): void
    {
        $table->string('id')->primary();
        $table->unsignedBigInteger('user_id')->nullable()->index();
        $table->string('ip_address', 45)->nullable();
        $table->text('user_agent')->nullable();
        $table->longText('payload');
        $table->integer('last_activity')->index();
    }

    private function jobColumns(Blueprint $table): void
    {
        $table->bigIncrements('id');
        $table->string('queue')->index();
        $table->longText('payload');
        $table->unsignedTinyInteger('attempts');
        $table->unsignedInteger('reserved_at')->nullable();
        $table->unsignedInteger('available_at');
        $table->unsignedInteger('created_at');
    }

    private function failedJobColumns(Blueprint $table): void
    {
        $table->id();
        $table->string('uuid')->unique();
        $table->text('connection');
        $table->text('queue');
        $table->longText('payload');
        $table->longText('exception');
        $table->timestamp('failed_at')->useCurrent();
    }

    private function batchColumns(Blueprint $table): void
    {
        $table->string('id')->primary();
        $table->string('name');
        $table->integer('total_jobs');
        $table->integer('pending_jobs');
        $table->integer('failed_jobs');
        $table->longText('failed_job_ids');
        $table->mediumText('options')->nullable();
        $table->integer('cancelled_at')->nullable();
        $table->integer('created_at');
        $table->integer('finished_at')->nullable();
    }
};

