<?php

namespace App\Modules\Realtime\Http\Middleware;

use App\Modules\Realtime\Services\ResourceChangePublisher;
use Closure;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class PublishResourceChanges
{
    public function __construct(private ResourceChangePublisher $publisher) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (!config('realtime.enabled') || in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) return $next($request);
        $this->publisher->begin();
        $tables = [];
        $active = true;
        DB::listen(static function (QueryExecuted $query) use (&$tables, &$active): void {
            if (!$active || !preg_match('/^\s*(?:insert\s+into|update|delete\s+from)\s+(["\w.]+)/i', $query->sql, $match)) return;
            $table = str_replace('"', '', $match[1]);
            if (array_key_exists($table, config('realtime.tables', []))) $tables[] = $table;
        });
        try {
            $response = $next($request);
            $active = false;
            $this->publisher->finish($response->getStatusCode() < 400, $request->user(), $tables);
            return $response;
        } catch (\Throwable $error) {
            $active = false;
            $this->publisher->finish(false);
            throw $error;
        }
    }
}
