<?php

namespace App\Interfaces;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;

interface IBaseRepository
{
    public function all(array $filters = [], ?callable $buildExtra = null): Collection|null|LengthAwarePaginator|int;

    public function find($id, array $filters = [], bool $failOnMissing = false): ?Model;

    public function existsById($id, bool $failOnMissing = false): bool;

    public function create(array $data): Model;

    public function firstOrCreate(array $data): Model;

    public function update($id, array $data): Model;

    public function delete($id): ?bool;

    public function findBy(array $conditions = [], array $whereInConditions = [], array $params = []): ?Collection;

    public function chunk(int $chunkSize, callable $toExecute, array $filters = []): bool;

    public function updateWithConditions(array $data, array $conditions = [], array $whereInConditions = []): bool;

    public function transaction(callable $content): mixed;

    public function truncate(): void;

    public function insert(array $data, ?int $chunkSize = null): void;

    public function countBy(array $conditions = [], array $whereInConditions = [], array $params = []): int;

    public function getPreparedQuery(array $filters): Builder;

    public function usePreparedQuery(array $filters, callable $content);

    public function useModel(callable $content);

    public function getTableName(): string;

    public function getColumnType(array $columnParts, $model = null);

    public function getKeyByUniqueColumn(string $column, mixed $value): ?int;

    public function getKeysByUniqueColumn(string $column, array $values): array;
}