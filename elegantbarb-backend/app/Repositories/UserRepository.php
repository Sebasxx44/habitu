<?php

namespace App\Repositories;

use App\Models\User;
use App\Modules\People\Models\Client;
use App\Interfaces\Repositories\UserRepositoryInterface;

class UserRepository extends BaseRepository implements UserRepositoryInterface
{
    public function __construct(User $model)
    {
        parent::__construct($model);
    }

    public function findByEmail($email)
    {
        $identifier = strtolower(trim($email));
        return $this->model->whereRaw('LOWER(email) = ?', [$identifier])
            ->orWhereRaw('LOWER(email) = ?', [$identifier . '@elegantbarb.com'])
            ->first();
    }

    public function getFilteredUsers($filters)
    {
        $query = $this->model->with(['barberShop', 'roles.permissions']);

        if (!empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }
        if (!empty($filters['barber_shop_id'])) {
            $query->where('barber_shop_id', $filters['barber_shop_id']);
        }
        if (!empty($filters['search'])) {
            $query->where('name', 'like', '%' . $filters['search'] . '%');
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function createClientProfileForUser($user, $clientData)
    {
        // This handles the specialized client creation for Google Auth
        $client = Client::create(array_merge($clientData, [
            'user_id' => $user->id
        ]));

        $user->update(['cliente_id' => $client->id]);
        $user->cliente_id = $client->id;

        return $user;
    }
}
