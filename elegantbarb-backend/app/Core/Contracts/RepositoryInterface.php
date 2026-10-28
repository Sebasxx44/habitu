<?php

namespace App\Core\Contracts;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;

interface RepositoryInterface
{
    public function find(int $id): ?Model;
    public function findOrFail(int $id): Model;
    public function findBy(string $field, mixed $value): ?Model;
    public function all(array $columns = ['*']): Collection;
    public function paginate(int $perPage = 15, array $columns = ['*']): LengthAwarePaginator;
    public function create(array $data): Model;
    public function update(int $id, array $data): bool;
    public function delete(int $id): bool;
    public function with(array $relations): static;
    public function where(array $conditions): static;
    public function orderBy(string $column, string $direction = 'asc'): static;
    public function addCriteria(callable $criteria): static;
    public function resetCriteria(): static;
    public function count(): int;
    public function exists(int $id): bool;
}
