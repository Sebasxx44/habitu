<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'photo_url' => $this->photo_url,
            'barber_shop_id' => $this->barber_shop_id,
            'total_visits' => $this->total_visits ?? 0,
            'last_visit_date' => $this->last_visit_date ?? ($this->appointments->first() ? $this->appointments->first()->date : null),
            'last_visit_service' => $this->last_visit_service ?? ($this->appointments->first() && $this->appointments->first()->service ? $this->appointments->first()->service->name : null),
            'appointments' => $this->whenLoaded('appointments'),
            'created_at' => $this->created_at,
        ];
    }
}
