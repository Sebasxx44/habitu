<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Models\Resource;
use App\Modules\Booking\Models\Waitlist;
use App\Modules\Booking\Services\AppointmentService;
use App\Modules\Booking\Services\WaitlistService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\Platform\Services\GoogleCalendarService;
use App\Modules\Platform\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingModelsTest extends TestCase
{
    use RefreshDatabase;
    private array $data;
    private Service $service;
    private Resource $resource;
    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-10-03 12:00:00', 'UTC'));
        $this->mock(WhatsAppService::class, fn ($m) => $m->shouldReceive('sendBookingConfirmation','sendCancellationNotification')->andReturn(null));
        $this->mock(GoogleCalendarService::class, fn ($m) => $m->shouldReceive('pushAppointmentToCalendar','deleteCalendarEvent')->andReturn(null));
        $business = Business::factory()->create(['uses_professionals' => false, 'uses_resources' => true]);
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Norte', 'address' => 'Pereira', 'is_active' => true]);
        DB::table('business.branch_schedules')->insert(['branch_id' => $branch->id, 'day' => 'MONDAY', 'open_time' => '09:00', 'close_time' => '18:00']);
        $this->service = Service::factory()->create(['business_id' => $business->id, 'booking_model' => 'resource', 'requires_professional' => false,
            'duration_minutes' => 60, 'duration_mode' => 'selectable', 'duration_options' => [60,120,180], 'price' => 80000, 'slot_interval_minutes' => 60, 'requires_confirmation' => false]);
        $this->resource = Resource::create(['business_id' => $business->id, 'branch_id' => $branch->id, 'name' => 'Cancha', 'type' => 'COURT', 'capacity' => 1, 'is_active' => true]);
        $this->service->resources()->attach($this->resource->id);
        $this->customer = User::factory()->create(['role' => 'CLIENTE']);
        Client::factory()->create(['user_id' => $this->customer->id]);
        Sanctum::actingAs($this->customer);
        $this->data = ['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $this->service->id, 'date' => '2026-10-05', 'start_time' => '10:00', 'duration_minutes' => 120];
    }

    protected function tearDown(): void { Carbon::setTestNow(); parent::tearDown(); }

    public function test_resource_duration_resolves_without_professional_and_blocks_consecutive_hours(): void
    {
        $this->postJson('/api/v2/appointments/quote', $this->data)->assertOk()->assertJsonPath('data.total',160000)->assertJsonPath('data.professional',null)->assertJsonPath('data.resource.id',$this->resource->id);
        $id=$this->postJson('/api/v2/appointments',$this->data)->assertCreated()->assertJsonPath('data.status','CONFIRMED')->assertJsonPath('data.duration_minutes',120)->json('data.id');
        $this->assertSame('12:00',Appointment::findOrFail($id)->end_time->format('H:i'));
        Sanctum::actingAs(User::factory()->create(['role'=>'CLIENTE']));
        $this->postJson('/api/v2/appointments',array_replace($this->data,['start_time'=>'11:00','duration_minutes'=>60]))->assertUnprocessable();
        $this->postJson('/api/v2/appointments',array_replace($this->data,['start_time'=>'12:00','duration_minutes'=>60]))->assertCreated();
        $this->postJson('/api/v2/appointments/quote',array_replace($this->data,['start_time'=>'15:00','duration_minutes'=>90]))->assertUnprocessable();
    }

    public function test_resource_binding_and_discovery_filters_are_real(): void
    {
        $this->resource->update(['attributes'=>['sport_type'=>'football_5','surface'=>'synthetic','covered'=>true]]);
        $query=['per_page'=>12,'booking_model'=>'resource','duration_minutes'=>120,'resource_id'=>$this->resource->id,'covered'=>1];
        $this->getJson('/api/v2/businesses/search?'.http_build_query($query))->assertOk()->assertJsonPath('data.total',1)->assertJsonPath('data.data.0.price_from',160000)->assertJsonPath('data.data.0.next_available.resource_id',$this->resource->id);
        $foreign=Resource::create(['business_id'=>$this->data['business_id'],'branch_id'=>$this->data['branch_id'],'name'=>'No vinculada','capacity'=>1]);
        $this->postJson('/api/v2/appointments/quote',$this->data+['resource_id'=>$foreign->id])->assertUnprocessable();
    }

    public function test_unbound_resources_are_rejected_for_professional_optional_and_legacy_models(): void
    {
        $professional=\App\Modules\People\Models\Professional::create(['business_id'=>$this->data['business_id'],'name'=>'Profesional compatible','is_active'=>true]);
        DB::table('catalog.professional_services')->insert(['professional_id'=>$professional->id,'service_id'=>$this->service->id,'branch_id'=>$this->data['branch_id'],'is_active'=>true]);
        $foreign=Resource::create(['business_id'=>$this->data['business_id'],'branch_id'=>$this->data['branch_id'],'name'=>'Recurso de otro servicio','capacity'=>1,'is_active'=>true]);
        foreach (['professional','optional_professional'] as $model) {
            $this->service->update(['booking_model'=>$model]);
            $data=$this->data+['professional_id'=>$professional->id,'resource_id'=>$foreign->id];
            $this->postJson('/api/v2/appointments/quote',$data)->assertUnprocessable()->assertJsonValidationErrors('resource_id');
            $this->postJson('/api/v2/appointments',$data)->assertUnprocessable()->assertJsonValidationErrors('resource_id');
        }
        Business::findOrFail($this->data['business_id'])->update(['uses_resources'=>false,'uses_professionals'=>false]);
        $this->service->update(['booking_model'=>null,'requires_professional'=>false]);
        $this->postJson('/api/v2/appointments',$this->data+['resource_id'=>$foreign->id])->assertUnprocessable()->assertJsonValidationErrors('resource_id');
        $this->assertSame(0,Appointment::count());
    }

    public function test_rescheduling_preserves_resource_duration_and_agreed_price(): void
    {
        $id=$this->postJson('/api/v2/appointments',$this->data)->assertCreated()->json('data.id');
        $this->service->update(['price'=>200000]);
        $this->postJson('/api/v2/appointments/'.$id.'/reschedule',['date'=>'2026-10-05','start_time'=>'14:00','duration_minutes'=>60])->assertUnprocessable();
        $this->postJson('/api/v2/appointments/'.$id.'/reschedule',['date'=>'2026-10-05','start_time'=>'14:00'])->assertOk();
        $appointment=Appointment::findOrFail($id);
        $this->assertSame(120,$appointment->duration_minutes);
        $this->assertSame('16:00',$appointment->end_time->format('H:i'));
        $this->assertSame('160000.00',$appointment->price);
        $this->assertSame('160000.00',$appointment->final_price);
        $this->assertSame($this->resource->id,$appointment->resource_id);
    }

    public function test_rescheduling_keeps_capacity_and_checks_every_reserved_seat(): void
    {
        $this->service->update(['booking_model'=>'capacity','duration_mode'=>'fixed','booking_capacity'=>5,'price'=>10000]);
        $data=array_replace($this->data,['duration_minutes'=>60,'participants'=>3]);
        $id=$this->postJson('/api/v2/appointments',$data)->assertCreated()->json('data.id');
        Sanctum::actingAs(User::factory()->create(['role'=>'CLIENTE']));
        $this->postJson('/api/v2/appointments',array_replace($data,['start_time'=>'14:00']))->assertCreated();
        Sanctum::actingAs($this->customer);
        $this->postJson('/api/v2/appointments/'.$id.'/reschedule',['date'=>'2026-10-05','start_time'=>'14:00'])->assertUnprocessable();
        $this->postJson('/api/v2/appointments/'.$id.'/reschedule',['date'=>'2026-10-05','start_time'=>'15:00','participants'=>1])->assertUnprocessable();
        $this->postJson('/api/v2/appointments/'.$id.'/reschedule',['date'=>'2026-10-05','start_time'=>'15:00'])->assertOk();
        $appointment=Appointment::findOrFail($id);
        $this->assertSame(3,$appointment->participants);
        $this->assertSame('30000.00',$appointment->final_price);
        $this->assertSame(60,$appointment->duration_minutes);
    }

    public function test_optional_professional_uses_the_assigned_professional_duration_override(): void
    {
        $this->service->update(['booking_model'=>'optional_professional','duration_mode'=>'fixed']);
        $professional=\App\Modules\People\Models\Professional::create(['business_id'=>$this->data['business_id'],'name'=>'Profesional de 45 minutos','is_active'=>true]);
        DB::table('catalog.professional_services')->insert(['professional_id'=>$professional->id,'service_id'=>$this->service->id,'branch_id'=>$this->data['branch_id'],'duration_override'=>45,'is_active'=>true]);
        $data=array_diff_key($this->data,array_flip(['duration_minutes']));
        $this->getJson('/api/v2/appointments/availability?'.http_build_query($data))->assertOk()->assertJsonPath('data.slots.0.duration_minutes',45);
        $this->postJson('/api/v2/appointments/quote',$data)->assertOk()->assertJsonPath('data.duration_minutes',45)->assertJsonPath('data.professional.id',$professional->id);
        $id=$this->postJson('/api/v2/appointments',$data+['duration_minutes'=>45,'professional_id'=>$professional->id])->assertCreated()->json('data.id');
        $this->assertSame(45,Appointment::findOrFail($id)->duration_minutes);
        $this->assertSame('10:45',Appointment::findOrFail($id)->end_time->format('H:i'));
    }

    public function test_fixture_binding_repair_only_inserts_named_links_and_preserves_appointments_and_disabled_links(): void
    {
        $id=$this->postJson('/api/v2/appointments',$this->data)->assertCreated()->json('data.id');
        $before=Appointment::findOrFail($id)->getAttributes();
        Business::findOrFail($this->data['business_id'])->update(['name'=>'Estudio Norte · Demo','slug'=>'demo-estudio-norte']);
        $this->service->update(['name'=>'Corte de autor']);
        $this->resource->update(['name'=>'Sillón 1 Demo']);
        $this->service->resources()->updateExistingPivot($this->resource->id,['is_active'=>false]);
        $compatible=Resource::create(['business_id'=>$this->data['business_id'],'branch_id'=>$this->data['branch_id'],'name'=>'Sillón 2 Demo','is_active'=>true]);
        Resource::create(['business_id'=>$this->data['business_id'],'branch_id'=>$this->data['branch_id'],'name'=>'Sillón no incluido','is_active'=>true]);
        $seeder=new \Database\Seeders\Demo\RepairDemoResourceBindingsSeeder(); $seeder->run();
        $rows=DB::table('catalog.resource_services')->orderBy('id')->get()->toJson(); $seeder->run();
        $this->assertSame($rows,DB::table('catalog.resource_services')->orderBy('id')->get()->toJson());
        $this->assertSame($before,Appointment::findOrFail($id)->getAttributes());
        $this->assertFalse((bool)DB::table('catalog.resource_services')->where('resource_id',$this->resource->id)->value('is_active'));
        $this->assertSame([$compatible->id],$this->service->resources()->pluck('booking.resources.id')->all());
    }

    public function test_named_spa_repair_binds_massage_rooms_but_not_sauna_or_unrelated_services(): void
    {
        Business::findOrFail($this->data['business_id'])->update(['name'=>'Serenity Spa & Wellness','slug'=>'serenity-spa-wellness']);
        $this->service->update(['name'=>'Masaje Descontracturante']);
        $this->resource->update(['name'=>'Sala de Masajes 2']);
        $this->service->resources()->detach();
        Resource::create(['business_id'=>$this->data['business_id'],'branch_id'=>$this->data['branch_id'],'name'=>'Sauna & Jacuzzi','is_active'=>true]);
        $unrelated=Service::factory()->create(['business_id'=>$this->data['business_id'],'name'=>'Facial Hidratante']);
        (new \Database\Seeders\Demo\RepairDemoResourceBindingsSeeder())->run();
        $this->assertSame([$this->resource->id],$this->service->resources()->pluck('booking.resources.id')->all());
        $this->assertSame(0,$unrelated->resources()->count());
    }

    public function test_resource_fixture_repair_preserves_legacy_professional_only_when_rescheduling_that_booking(): void
    {
        $professional=\App\Modules\People\Models\Professional::create(['business_id'=>$this->data['business_id'],'name'=>'Asignación anterior','is_active'=>true]);
        $this->service->update(['booking_model'=>'professional','requires_professional'=>true]);
        $id=$this->postJson('/api/v2/appointments',$this->data+['professional_id'=>$professional->id,'resource_id'=>$this->resource->id])->assertCreated()->json('data.id');
        $before=Appointment::findOrFail($id)->getAttributes();
        Business::findOrFail($this->data['business_id'])->update(['name'=>'Canchas Arena · Demo','slug'=>'demo-canchas-arena']);
        $this->service->update(['name'=>'Reserva cancha fútbol 5']);
        $this->resource->update(['name'=>'Cancha 1 Demo']);
        $repair=new \Database\Seeders\Demo\RepairResourceBookingSeeder(); $repair->run();
        $this->assertSame($before,Appointment::findOrFail($id)->getAttributes());
        $this->assertSame('resource',$this->service->fresh()->booking_model);
        $this->assertFalse($this->service->fresh()->resource_professional_optional);
        $availability=$this->data+['professional_id'=>$professional->id,'resource_id'=>$this->resource->id,'appointment_id'=>$id];
        $this->getJson('/api/v2/appointments/availability?'.http_build_query($availability))->assertOk()->assertJsonPath('data.slots.0.duration_minutes',120);
        $this->postJson('/api/v2/appointments/quote',array_replace($availability,['start_time'=>'14:00']))->assertUnprocessable();
        $this->postJson('/api/v2/appointments',array_replace($this->data,['start_time'=>'14:00']))->assertCreated()->assertJsonPath('data.professional_id',null);
        $this->postJson('/api/v2/appointments/'.$id.'/reschedule',['date'=>'2026-10-05','start_time'=>'12:00'])->assertOk();
        $appointment=Appointment::findOrFail($id);
        $this->assertSame($professional->id,$appointment->professional_id);
        $this->assertSame($this->resource->id,$appointment->resource_id);
        $this->assertSame('160000.00',$appointment->final_price);
        $this->assertSame(120,$appointment->duration_minutes);
    }

    public function test_catalog_reseed_preserves_existing_bookings_and_creates_courts_without_professionals(): void
    {
        $seeder=new \Database\Seeders\Demo\DemoCatalogSeeder(); $seeder->run();
        $arena=Business::where('slug','demo-canchas-arena')->firstOrFail();
        $ids=$arena->services()->whereIn('name',array_keys(\Database\Seeders\Demo\RepairResourceBookingSeeder::ARENA_POLICIES))->pluck('id');
        $bookings=Appointment::whereIn('service_id',$ids)->get();
        $this->assertNotEmpty($bookings);
        $this->assertTrue($bookings->every(fn ($booking)=>$booking->professional_id===null && $booking->booking_model==='resource' && $booking->duration_minutes>0));
        $appointment=$bookings->first(); $appointment->update(['notes'=>'Conservar edición manual','price'=>12345,'final_price'=>12345]);
        $before=$appointment->fresh()->getAttributes(); $count=Appointment::count();
        $seeder->run();
        $this->assertSame($before,$appointment->fresh()->getAttributes());
        $this->assertSame($count,Appointment::count());
        $this->assertSame(0,DB::table('booking.appointments as a')->where('a.source','demo')->whereNotNull('a.resource_id')->whereNotExists(fn ($q)=>$q->selectRaw('1')->from('catalog.resource_services as rs')->whereColumn('rs.service_id','a.service_id')->whereColumn('rs.resource_id','a.resource_id')->where('rs.is_active',true))->count());
    }

    public function test_capacity_consumes_participants_and_direct_has_a_real_limit(): void
    {
        $this->service->update(['booking_model'=>'capacity','duration_mode'=>'fixed','booking_capacity'=>5,'price'=>10000]);
        $data=array_replace($this->data,['duration_minutes'=>60,'participants'=>3]);
        $this->postJson('/api/v2/appointments',$data)->assertCreated()->assertJsonPath('data.final_price','30000.00');
        Sanctum::actingAs(User::factory()->create(['role'=>'CLIENTE']));
        $this->postJson('/api/v2/appointments/quote',array_replace($data,['participants'=>2]))->assertOk()->assertJsonPath('data.remaining_capacity',2);
        $this->postJson('/api/v2/appointments',array_replace($data,['participants'=>3]))->assertUnprocessable();
        $this->postJson('/api/v2/appointments',array_replace($data,['participants'=>2]))->assertCreated();
        $this->service->update(['booking_model'=>'direct','booking_capacity'=>1]);
        $this->postJson('/api/v2/appointments',array_replace($data,['participants'=>1,'start_time'=>'14:00']))->assertCreated();
        Sanctum::actingAs(User::factory()->create(['role'=>'CLIENTE']));
        $this->postJson('/api/v2/appointments',array_replace($data,['participants'=>1,'start_time'=>'14:00']))->assertUnprocessable();
    }

    public function test_customer_rules_are_enforced_in_actions_and_mutations(): void
    {
        $id=$this->postJson('/api/v2/appointments',$this->data)->assertCreated()->json('data.id');
        $this->service->update(['allow_cancellation'=>false,'allow_reschedule'=>false]);
        $this->getJson('/api/v2/appointments/'.$id)->assertOk()->assertJsonPath('data.allowed_actions.cancel',false)->assertJsonPath('data.allowed_actions.reschedule',false);
        $this->postJson('/api/v2/appointments/'.$id.'/cancel')->assertUnprocessable();
        $this->postJson('/api/v2/appointments/'.$id.'/reschedule',['date'=>'2026-10-05','start_time'=>'14:00'])->assertUnprocessable();
        $this->service->update(['min_advance_minutes'=>10000]);
        $this->postJson('/api/v2/appointments/quote',array_replace($this->data,['start_time'=>'14:00']))->assertUnprocessable();
    }

    public function test_waitlist_rechecks_duration_notifies_once_and_supports_opt_out_without_auto_booking(): void
    {
        $id=$this->postJson('/api/v2/appointments',$this->data)->assertCreated()->json('data.id');
        $waiting=User::factory()->create(['role'=>'CLIENTE']); Client::factory()->create(['user_id'=>$waiting->id]); Sanctum::actingAs($waiting);
        $criteria=array_diff_key($this->data,array_flip(['date','start_time']))+['resource_id'=>$this->resource->id,'preferred_date'=>'2026-10-05','preferred_time_start'=>'10:00','preferred_time_end'=>'10:00'];
        $entry=$this->postJson('/api/v2/waitlist',$criteria)->assertCreated()->json('data.id');
        $this->postJson('/api/v2/waitlist',$criteria)->assertOk()->assertJsonPath('data.id',$entry);
        $this->getJson('/api/v2/waitlist')->assertOk()->assertJsonCount(1,'data')
            ->assertJsonPath('data.0.branch.id',$this->data['branch_id'])
            ->assertJsonPath('data.0.resource.name',$this->resource->name);
        $this->assertSame(0,app(WaitlistService::class)->scanPending());
        Sanctum::actingAs($this->customer);
        $this->postJson('/api/v2/appointments/'.$id.'/cancel')->assertOk();
        $this->assertSame('NOTIFIED',Waitlist::findOrFail($entry)->status);
        $this->assertSame(0,app(WaitlistService::class)->scanPending());
        $this->assertSame(1,DB::table('booking.notification_deliveries')->where('waitlist_id',$entry)->count());
        $payload=json_decode(DB::table('booking.notification_deliveries')->where('waitlist_id',$entry)->value('payload'),true);
        $this->assertStringStartsWith('/cliente/business/',$payload['url']);
        $this->assertStringContainsString('book=1',$payload['url']);
        $this->assertSame(1,Appointment::count());
        $this->postJson('/api/v2/waitlist/'.$entry.'/cancel')->assertForbidden();
        Sanctum::actingAs($waiting);
        $this->postJson('/api/v2/waitlist/'.$entry.'/cancel')->assertOk();
    }
    public function test_waitlist_requires_the_entire_duration_and_cancellation_suppresses_pending_mail(): void
    {
        config(['booking.email_enabled'=>true]);
        $first=$this->postJson('/api/v2/appointments',array_replace($this->data,['duration_minutes'=>60]))->assertCreated()->json('data.id');
        $other=User::factory()->create(['role'=>'CLIENTE']); Sanctum::actingAs($other);
        $second=$this->postJson('/api/v2/appointments',array_replace($this->data,['duration_minutes'=>60,'start_time'=>'11:00']))->assertCreated()->json('data.id');
        $waiting=User::factory()->create(['role'=>'CLIENTE']); Sanctum::actingAs($waiting);
        $this->getJson('/api/v2/waitlist')->assertOk()->assertJsonCount(0,'data');
        $criteria=array_diff_key($this->data,array_flip(['date','start_time']))+['preferred_date'=>'2026-10-05','preferred_time_start'=>'10:00','preferred_time_end'=>'10:00'];
        $entry=$this->postJson('/api/v2/waitlist',$criteria)->assertCreated()->json('data.id');
        Sanctum::actingAs($this->customer); $this->postJson('/api/v2/appointments/'.$first.'/cancel')->assertOk();
        $this->assertSame('PENDING',Waitlist::findOrFail($entry)->status);
        Sanctum::actingAs($other); $this->postJson('/api/v2/appointments/'.$second.'/cancel')->assertOk();
        $this->assertSame('NOTIFIED',Waitlist::findOrFail($entry)->status);
        Sanctum::actingAs($waiting); $this->postJson('/api/v2/waitlist/'.$entry.'/cancel')->assertOk();
        $this->assertSame('SUPPRESSED',DB::table('booking.notification_deliveries')->where('waitlist_id',$entry)->value('status'));
    }

    public function test_demo_resource_repair_is_idempotent_and_does_not_modify_other_businesses(): void
    {
        $other=Service::factory()->create(['name'=>'No modificar','price'=>12345]); $before=$other->fresh()->getAttributes();
        Business::findOrFail($this->data['business_id'])->update(['name'=>'Canchas La 10','slug'=>'canchas-la-10']);
        $this->service->update(['name'=>'Cancha Fútbol 7 (1h)','requires_professional'=>true,'duration_mode'=>'fixed']);
        $this->resource->update(['name'=>'Cancha 3 - Fútbol 7']);
        $seeder=new \Database\Seeders\Demo\RepairResourceBookingSeeder(); $seeder->run();
        $first=$this->service->fresh()->getAttributes(); $count=DB::table('catalog.resource_services')->count(); $seeder->run();
        $this->assertSame($first,$this->service->fresh()->getAttributes());
        $this->assertSame($count,DB::table('catalog.resource_services')->count());
        $this->assertSame($before,$other->fresh()->getAttributes());
        $this->assertSame([60,120,180],$this->service->fresh()->duration_options);
        $this->assertFalse($this->service->fresh()->requires_professional);
    }

}
