<?php

namespace Tests\Unit;

use App\Core\Enums\ResourceType;
use App\Modules\Booking\Models\Resource;
use PHPUnit\Framework\TestCase;

class ResourceTypeTest extends TestCase
{
    public function test_catalog_resource_types_can_be_serialized_without_losing_legacy_values(): void
    {
        foreach (['FIELD','ROOM','CHAIR','CABIN','MACHINE','SPACE','COURT','STATION','TABLE','EQUIPMENT','OTHER'] as $type) {
            $resource = new Resource(['type' => $type]);
            $this->assertSame($type, $resource->toArray()['type']);
            $this->assertNotEmpty(ResourceType::from($type)->label());
        }
    }
}
