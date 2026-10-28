<?php

namespace Tests\Unit\Modules\OnDemand;

use App\Core\DTOs\ServiceResponse;
use App\Modules\OnDemand\Models\OnDemandAssignment;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\OnDemand\Repositories\OnDemandAssignmentRepository;
use App\Modules\OnDemand\Repositories\OnDemandRequestRepository;
use App\Modules\OnDemand\Services\OnDemandService;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class OnDemandServiceTest extends TestCase
{
    use RefreshDatabase;

    protected OnDemandService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new OnDemandService(
            new OnDemandRequestRepository(new OnDemandRequest()),
            new OnDemandAssignmentRepository(new OnDemandAssignment())
        );
    }

    public function test_request_creates_on_demand_request(): void
    {
        $client = \App\Modules\People\Models\Client::factory()->create();
        $business = \App\Modules\Business\Models\Business::factory()->create();
        $service = \App\Modules\Catalog\Models\Service::factory()->create(['business_id' => $business->id]);

        $response = $this->service->request([
            'client_id' => $client->id,
            'business_id' => $business->id,
            'service_id' => $service->id,
            'description' => 'Necesito un corte urgente',
            'estimated_price' => 35000,
            'client_lat' => 4.8143,
            'client_lng' => -75.6901,
            'client_address' => 'Calle 123',
        ]);

        $this->assertInstanceOf(ServiceResponse::class, $response);
        $this->assertTrue($response->success);
        $this->assertEquals(201, $response->statusCode);
        $this->assertDatabaseHas('on_demand.requests', [
            'client_id' => $client->id,
            'status' => 'SEARCHING',
        ]);
    }

    public function test_cancel_request(): void
    {
        $request = OnDemandRequest::factory()->create(['status' => 'SEARCHING']);
        $user = \App\Models\User::factory()->create();

        $response = $this->service->cancel($request->id, 'Cliente canceló', $user->id);

        $this->assertTrue($response->success);
        $this->assertDatabaseHas('on_demand.requests', [
            'id' => $request->id,
            'status' => 'CANCELLED',
        ]);
    }

    public function test_cannot_cancel_completed_request(): void
    {
        $request = OnDemandRequest::factory()->create(['status' => 'COMPLETED']);
        $user = \App\Models\User::factory()->create();

        $response = $this->service->cancel($request->id, 'Intento de cancelar', $user->id);

        $this->assertFalse($response->success);
    }
}
