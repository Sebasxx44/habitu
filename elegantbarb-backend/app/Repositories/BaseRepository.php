<?php

namespace App\Repositories;

use App\Core\Contracts\RepositoryInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;

abstract class BaseRepository implements RepositoryInterface
{
    protected Model $model;
    protected array $criteria = [];
    protected array $with = [];
    protected array $where = [];
    protected ?string $orderByColumn = null;
    protected string $orderByDirection = 'asc';

    public function __construct(Model $model)
    {
        $this->model = $model;
    }

    public function find(int $id): ?Model
    {
        return $this->applyQueryModifiers()->find($id);
    }

    public function findOrFail(int $id): Model
    {
        return $this->applyQueryModifiers()->findOrFail($id);
    }

    public function findBy(string $field, mixed $value): ?Model
    {
        return $this->applyQueryModifiers()->where($field, $value)->first();
    }

    public function all(array $columns = ['*']): Collection
    {
        return $this->applyQueryModifiers()->get($columns);
    }

    public function paginate(int $perPage = 15, array $columns = ['*']): LengthAwarePaginator
    {
        return $this->applyQueryModifiers()->paginate($perPage, $columns);
    }

    public function create(array $data): Model
    {
        return $this->model->create($data);
    }

    public function update(int $id, array $data): bool
    {
        $record = $this->find($id);
        if (! $record) {
            return false;
        }
        return $record->update($data);
    }

    public function delete(int $id): bool
    {
        $record = $this->find($id);
        if (! $record) {
            return false;
        }
        return $record->delete();
    }

    public function with(array $relations): static
    {
        $this->with = array_merge($this->with, $relations);
        return $this;
    }

    public function where(array $conditions): static
    {
        $this->where = array_merge($this->where, $conditions);
        return $this;
    }

    public function orderBy(string $column, string $direction = 'asc'): static
    {
        $this->orderByColumn = $column;
        $this->orderByDirection = $direction;
        return $this;
    }

    public function addCriteria(callable $criteria): static
    {
        $this->criteria[] = $criteria;
        return $this;
    }

    public function resetCriteria(): static
    {
        $this->criteria = [];
        $this->with = [];
        $this->where = [];
        $this->orderByColumn = null;
        return $this;
    }

    public function count(): int
    {
        return $this->applyQueryModifiers()->count();
    }

    public function exists(int $id): bool
    {
        return $this->model->where('id', $id)->exists();
    }

    protected function applyQueryModifiers(): Builder
    {
        $query = $this->model->newQuery();

        if (! empty($this->with)) {
            $query->with($this->with);
        }

        if (! empty($this->where)) {
            foreach ($this->where as $field => $value) {
                if (is_array($value)) {
                    $query->whereIn($field, $value);
                } else {
                    $query->where($field, $value);
                }
            }
        }

        foreach ($this->criteria as $criterion) {
            $criterion($query);
        }

        if ($this->orderByColumn) {
            $query->orderBy($this->orderByColumn, $this->orderByDirection);
        }

        return $query;
    }
}
