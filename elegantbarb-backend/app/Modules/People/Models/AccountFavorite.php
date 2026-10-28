<?php

namespace App\Modules\People\Models;

use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\Service;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountFavorite extends Model
{
    protected $table = 'people.account_favorites';
    protected $guarded = ['id'];

    public function business(): BelongsTo { return $this->belongsTo(Business::class); }
    public function service(): BelongsTo { return $this->belongsTo(Service::class); }
    public function professional(): BelongsTo { return $this->belongsTo(Professional::class); }
}
