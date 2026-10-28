<?php

namespace App\Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceCategory extends Model
{
    protected $table = 'catalog.service_categories';
    protected $fillable = ['business_id', 'name'];
}
