<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SearchService
{
    private ?string $meilisearchHost;
    private ?string $meilisearchKey;

    public function __construct()
    {
        $this->meilisearchHost = config('scout.meilisearch.host', env('MEILISEARCH_HOST'));
        $this->meilisearchKey = config('scout.meilisearch.key', env('MEILISEARCH_KEY'));
    }

    public function search(string $index, string $query, array $filters = [], int $limit = 20): array
    {
        if ($this->meilisearchHost && $this->meilisearchKey && extension_loaded('curl')) {
            return $this->searchMeilisearch($index, $query, $filters, $limit);
        }

        return $this->searchPostgres($index, $query, $filters, $limit);
    }

    protected function searchMeilisearch(string $index, string $query, array $filters, int $limit): array
    {
        try {
            $ch = curl_init("{$this->meilisearchHost}/indexes/{$index}/search");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $this->meilisearchKey,
                'Content-Type: application/json',
            ]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'q' => $query,
                'limit' => $limit,
                'filter' => $filters,
            ]));
            $response = curl_exec($ch);
            curl_close($ch);

            $result = json_decode($response, true);
            return $result['hits'] ?? [];
        } catch (\Throwable $e) {
            Log::warning('Meilisearch failed, falling back to Postgres', ['error' => $e->getMessage()]);
            return $this->searchPostgres($index, $query, $filters, $limit);
        }
    }

    protected function searchPostgres(string $index, string $query, array $filters, int $limit): array
    {
        if ($index === 'businesses') {
            return $this->searchBusinessesPostgres($query, $filters, $limit);
        }

        if ($index === 'services') {
            return $this->searchServicesPostgres($query, $filters, $limit);
        }

        if ($index === 'professionals') {
            return $this->searchProfessionalsPostgres($query, $filters, $limit);
        }

        return [];
    }

    protected function searchBusinessesPostgres(string $query, array $filters, int $limit): array
    {
        $sql = DB::table('business.businesses')
            ->select('id', 'name', 'slug', 'type', 'address', 'phone')
            ->where(function ($q) use ($query) {
                $q->whereRaw("name ILIKE ?", ["%{$query}%"])
                  ->orWhereRaw("address ILIKE ?", ["%{$query}%"])
                  ->orWhereRaw("description ILIKE ?", ["%{$query}%"]);
            })
            ->whereNull('deleted_at');

        if (! empty($filters['type'])) {
            $sql->where('type', $filters['type']);
        }
        if (! empty($filters['city'])) {
            $sql->whereRaw("address ILIKE ?", ["%{$filters['city']}%"]);
        }

        return $sql->limit($limit)->get()->toArray();
    }

    protected function searchServicesPostgres(string $query, array $filters, int $limit): array
    {
        $sql = DB::table('catalog.services')
            ->select('id', 'name', 'description', 'price', 'duration_minutes', 'business_id')
            ->where(function ($q) use ($query) {
                $q->whereRaw("name ILIKE ?", ["%{$query}%"])
                  ->orWhereRaw("description ILIKE ?", ["%{$query}%"]);
            })
            ->whereNull('deleted_at');

        if (! empty($filters['business_id'])) {
            $sql->where('business_id', $filters['business_id']);
        }

        return $sql->limit($limit)->get()->toArray();
    }

    protected function searchProfessionalsPostgres(string $query, array $filters, int $limit): array
    {
        $sql = DB::table('people.professionals')
            ->select('id', 'name', 'bio', 'specialty', 'business_id')
            ->where(function ($q) use ($query) {
                $q->whereRaw("name ILIKE ?", ["%{$query}%"])
                  ->orWhereRaw("bio ILIKE ?", ["%{$query}%"])
                  ->orWhereRaw("specialty ILIKE ?", ["%{$query}%"]);
            })
            ->where('is_active', true)
            ->whereNull('deleted_at');

        if (! empty($filters['business_id'])) {
            $sql->where('business_id', $filters['business_id']);
        }

        return $sql->limit($limit)->get()->toArray();
    }

    public function indexBusinesses(): void
    {
        if (! $this->meilisearchHost) return;
        // In production, this would sync all businesses to Meilisearch
        Log::info('Businesses index sync triggered for Meilisearch');
    }
}
