<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingAssistantTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;
    private Service $service;
    private BusinessBranch $branch;
    private Professional $professional;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-10-03 12:00:00', 'UTC'));
        config(['services.gemini.key' => null]);
        Http::preventStrayRequests();
        $business = Business::factory()->create(['name' => 'Estudio Pereira', 'uses_resources' => false]);
        $this->branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Centro', 'address' => 'Pereira', 'is_main_branch' => true, 'is_active' => true]);
        $this->service = Service::factory()->create(['business_id' => $business->id, 'name' => 'Manicure', 'price' => 45000, 'duration_minutes' => 45, 'buffer_minutes' => 15]);
        $this->professional = Professional::create(['business_id' => $business->id, 'name' => 'Profesional de pruebas', 'is_active' => true]);
        DB::table('business.branch_schedules')->insert(['branch_id' => $this->branch->id, 'day' => 'MONDAY', 'open_time' => '09:00', 'close_time' => '18:00']);
        DB::table('catalog.professional_services')->insert(['professional_id' => $this->professional->id, 'service_id' => $this->service->id, 'branch_id' => $this->branch->id, 'is_active' => true]);
        $this->customer = User::factory()->create(['role' => 'CLIENTE']);
        Client::factory()->create(['user_id' => $this->customer->id, 'business_id' => $business->id]);
        Sanctum::actingAs($this->customer);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_start_honours_top_level_locale_and_persists_it_for_follow_up_messages(): void
    {
        $response = $this->postJson('/api/v2/ai-chat/start', ['context_type' => 'BOOKING', 'locale' => 'en'])
            ->assertCreated()->assertJsonPath('data.context_data.locale', 'en');
        $this->assertStringStartsWith('Tell me what you want to book', $response->json('data.messages.0.content'));
        $followUp = $this->postJson('/api/v2/ai-chat/'.$response->json('data.session_id').'/send', ['content' => 'Manicure on Monday'])->assertOk();
        $this->assertStringStartsWith('Catalogue mode:', $followUp->json('data.content'));
        $this->postJson('/api/v2/ai-chat/start', ['locale' => 'fr'])->assertUnprocessable();
        Http::assertNothingSent();
    }

    public function test_catalog_assistant_returns_real_scoped_slots_and_never_creates_a_booking(): void
    {
        $session = $this->start();
        $response = $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content' => 'Quiero reservar manicure el lunes por menos de $50.000 en Pereira']);
        $response->assertOk()->assertJsonPath('data.metadata.source', 'catalog')->assertJsonPath('data.metadata.requires_confirmation', true)
            ->assertJsonPath('data.metadata.cards.0.service_id', $this->service->id)
            ->assertJsonPath('data.metadata.cards.0.professional_id', $this->professional->id)
            ->assertJsonPath('data.metadata.cards.0.price', 45000)->assertJsonPath('data.metadata.cards.0.date', '2026-10-05');
        $this->assertNotEmpty($response->json('data.metadata.cards.0.slots'));
        $this->assertStringStartsWith('/cliente/business/', $response->json('data.metadata.cards.0.url'));
        $this->assertSame(0, Appointment::count());
        Http::assertNothingSent();
    }

    public function test_model_response_is_only_intent_and_cannot_invent_cards_or_run_a_tool(): void
    {
        config(['services.gemini.key' => 'test-key']);
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response(['candidates' => [['content' => ['parts' => [[
            'text' => json_encode(['intent' => 'search', 'q' => 'manicure', 'date' => '2026-10-05', 'cards' => [['service_id' => 999999]], 'tool' => 'createBooking']),
        ]]]]]])]);
        $this->postJson('/api/v2/ai-chat/'.$this->start().'/send', ['content' => 'Reserva el manicure que recomiendes'])
            ->assertOk()->assertJsonPath('data.metadata.source', 'gemini')->assertJsonPath('data.metadata.cards.0.service_id', $this->service->id);
        $this->assertSame(0, Appointment::count());
    }

    public function test_provider_uses_configurable_model_header_and_current_rest_json_schema(): void
    {
        config(['services.gemini.key' => 'fake-http-contract-key']);
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [['content' => ['parts' => [['text' => '{"intent":"search","q":"manicure"}']]]]],
        ])]);
        foreach (['gemini-3.8-flash', 'gemini-3.5-flash-lite'] as $model) {
            config(['services.gemini.model' => $model]);
            $result = app(\App\Modules\Platform\Services\GeminiService::class)->interpret('Quiero manicure', null, []);
            $this->assertSame(['intent' => 'search', 'q' => 'manicure'], $result);
            Http::assertSent(fn (\Illuminate\Http\Client\Request $request) =>
                $request->url() === 'https://generativelanguage.googleapis.com/v1beta/models/'.$model.':generateContent'
                && $request->method() === 'POST'
                && $request->hasHeader('x-goog-api-key', 'fake-http-contract-key')
                && $request->hasHeader('Content-Type', 'application/json')
                && data_get($request->data(), 'contents.0.parts.0.text') === 'Quiero manicure'
                && data_get($request->data(), 'generationConfig.maxOutputTokens') === 4096
                && data_get($request->data(), 'generationConfig.thinkingConfig.thinkingLevel') === 'low'
                && data_get($request->data(), 'generationConfig.responseFormat.text.mimeType') === 'application/json'
                && data_get($request->data(), 'generationConfig.responseFormat.text.schema.type') === 'object'
                && data_get($request->data(), 'generationConfig.responseFormat.text.schema.required') === ['intent']
                && data_get($request->data(), 'generationConfig.responseFormat.text.schema.properties.intent.enum')
                    === ['search', 'availability', 'promotions', 'repeat', 'my_appointments', 'reschedule']
                && ! array_key_exists('responseMimeType', $request['generationConfig'])
                && ! array_key_exists('responseJsonSchema', $request['generationConfig'])
            );
        }
        Http::assertSentCount(2);
    }

    public function test_image_without_provider_is_honest_and_foreign_or_closed_conversation_is_denied(): void
    {
        $session = $this->start();
        $response = $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content' => 'Manicure el lunes', 'image' => 'data:image/png;base64,aGVsbG8=']);
        $response->assertOk();
        $this->assertStringContainsString('No analicé la imagen', $response->json('data.content'));
        $this->postJson('/api/v2/ai-chat/'.$session.'/close')->assertOk();
        $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content' => 'hola'])->assertStatus(409);
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/v2/ai-chat/'.$session)->assertNotFound();
    }

    public function test_repeat_uses_only_owned_completed_appointment_and_inactive_service_is_not_offered(): void
    {
        $own = Client::where('user_id', $this->customer->id)->first();
        $this->appointment($own, '2026-10-01');
        $this->appointment(Client::factory()->create(), '2026-10-02');
        $this->postJson('/api/v2/ai-chat/'.$this->start().'/send', ['content' => 'Mis citas'])
            ->assertOk()->assertJsonCount(1, 'data.metadata.cards');
        $this->postJson('/api/v2/ai-chat/'.$this->start().'/send', ['content' => 'Repetir mi última cita el lunes'])
            ->assertOk()->assertJsonPath('data.metadata.cards.0.service_id', $this->service->id);
        $this->service->update(['is_active' => false]);
        $this->postJson('/api/v2/ai-chat/'.$this->start().'/send', ['content' => 'Repetir mi última cita el lunes'])
            ->assertOk()->assertJsonCount(0, 'data.metadata.cards');
    }

    public function test_resource_intent_and_english_cards_preserve_duration_resource_and_real_price(): void
    {
        $this->service->update(['name' => 'Cancha Fútbol', 'booking_model' => 'resource', 'requires_professional' => false,
            'duration_mode' => 'selectable', 'duration_minutes' => 60, 'duration_options' => [60,120], 'price' => 80000]);
        $resource = \App\Modules\Booking\Models\Resource::create(['business_id' => $this->service->business_id,
            'branch_id' => $this->branch->id, 'name' => 'Cancha Norte', 'type' => 'COURT', 'capacity' => 1, 'is_active' => true]);
        $this->service->resources()->attach($resource->id);
        $intent = $this->getJson('/api/v2/businesses/intent?'.http_build_query(['q' => 'Football on Monday at 10 am for 2 hours', 'locale' => 'en']))->assertOk();
        $intent->assertJsonPath('data.filters.booking_model','resource')->assertJsonPath('data.filters.duration_minutes',120)->assertJsonPath('data.filters.time_from','10:00');
        $session=$this->postJson('/api/v2/ai-chat/start',['context_data'=>['locale'=>'en']])->assertCreated()->json('data.session_id');
        $response=$this->postJson('/api/v2/ai-chat/'.$session.'/send',['content'=>'Football on Monday at 10 am for 2 hours'])->assertOk()
            ->assertJsonPath('data.metadata.cards.0.resource_id',$resource->id)->assertJsonPath('data.metadata.cards.0.professional_id',null)
            ->assertJsonPath('data.metadata.cards.0.duration_minutes',120)->assertJsonPath('data.metadata.cards.0.price',160000);
        $this->assertStringContainsString('resource_id='.$resource->id,$response->json('data.metadata.cards.0.url'));
        $this->assertStringContainsString('Catalogue mode',$response->json('data.content'));
        $this->assertSame(0,Appointment::count());
        Http::assertNothingSent();
    }

    public function test_promotion_prices_are_quoted_by_server_and_invalid_minimum_is_not_claimed(): void
    {
        $promotion = \App\Modules\Marketing\Models\Promotion::create(['business_id'=>$this->service->business_id,
            'title'=>'Ahorra','promo_code'=>'AI10','type'=>'PERCENTAGE','discount'=>10,'start_date'=>'2026-10-01','end_date'=>'2026-10-31','is_active'=>true]);
        $response=$this->postJson('/api/v2/ai-chat/'.$this->start().'/send',['content'=>'Promociones de manicure el lunes'])->assertOk()
            ->assertJsonPath('data.metadata.cards.0.original_price',45000)->assertJsonPath('data.metadata.cards.0.discounted_price',40500);
        $promotion->update(['min_purchase'=>60000]);
        $this->postJson('/api/v2/ai-chat/'.$this->start().'/send',['content'=>'Promociones de manicure el lunes'])->assertOk()
            ->assertJsonMissingPath('data.metadata.cards.0.discounted_price');
    }

    public function test_dentist_after_football_card_selection_searches_thursday_without_old_sports_constraints(): void
    {
        [$court, $dental] = $this->courtAndDentalCatalogue();
        foreach (['odontologo el jueves', 'dentist on Thursday'] as $message) {
            $session = $this->start();
            $first = $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content'=>'Fútbol el lunes por 2 horas'])->assertOk();
            $first->assertJsonPath('data.metadata.cards.0.service_id', $court->id);
            $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content'=>'Ver disponibilidad de este servicio', 'context'=>[
                'business_id'=>$court->business_id, 'branch_id'=>$this->branch->id, 'service_id'=>$court->id,
                'resource_id'=>$court->resources()->first()->id, 'duration_minutes'=>120, 'time_from'=>'15:00',
            ]])->assertOk();
            $response = $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content'=>$message])->assertOk();
            $response->assertJsonCount(1, 'data.metadata.cards')->assertJsonPath('data.metadata.cards.0.service_id', $dental->id)
                ->assertJsonPath('data.metadata.cards.0.date', '2026-10-08')->assertJsonPath('data.metadata.cards.0.duration_minutes', 30)
                ->assertJsonPath('data.metadata.search_context.q', 'dental');
            $filters=\App\Modules\Platform\Models\AIConversation::where('session_id',$session)->firstOrFail()->context_data;
            foreach (['business_id','service_id','branch_id','resource_id','booking_model','duration_minutes','time_from'] as $field) $this->assertArrayNotHasKey($field,$filters);
            $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content'=>'el jueves a las 11'])->assertOk()->assertJsonPath('data.metadata.cards.0.service_id', $dental->id);
            $earlier=$this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content'=>'más temprano'])->assertOk()->assertJsonPath('data.metadata.search_context.q','dental');
            $this->assertLessThan('11:00:00',$earlier->json('data.metadata.cards.0.slots.0.start_time'));
            $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content'=>'y el viernes?'])->assertOk()
                ->assertJsonPath('data.metadata.cards.0.service_id', $dental->id)->assertJsonPath('data.metadata.cards.0.date', '2026-10-09');
        }
        $this->assertSame(0,Appointment::count()); Http::assertNothingSent();
    }

    public function test_ambiguous_change_asks_for_service_and_does_not_return_a_previous_catalogue(): void
    {
        $this->courtAndDentalCatalogue();
        $session=$this->start();
        $this->postJson('/api/v2/ai-chat/'.$session.'/send',['content'=>'Fútbol el lunes'])->assertOk();
        $response=$this->postJson('/api/v2/ai-chat/'.$session.'/send',['content'=>'otra cosa el jueves'])->assertOk()
            ->assertJsonCount(0,'data.metadata.cards')->assertJsonPath('data.metadata.clarification_required',true);
        $this->assertStringContainsString('¿Qué servicio o negocio',$response->json('data.content'));
        $this->assertSame([], $response->json('data.tool_calls'));
        $this->postJson('/api/v2/ai-chat/'.$session.'/send',['content'=>'urologo el jueves'])->assertOk()->assertJsonCount(0,'data.metadata.cards');
    }

    public function test_business_address_or_description_mentions_do_not_make_unrelated_services_relevant(): void
    {
        [$court,$dental]=$this->courtAndDentalCatalogue();
        $dental->update(['is_active'=>false]);
        Business::findOrFail($court->business_id)->update(['description'=>'Canchas frente a la clínica dental']);
        $this->branch->update(['address'=>'Pereira, vía Dental']);
        $this->postJson('/api/v2/ai-chat/'.$this->start().'/send',['content'=>'odontologo el lunes'])->assertOk()->assertJsonCount(0,'data.metadata.cards');
    }

    private function courtAndDentalCatalogue(): array
    {
        $this->service->update(['name'=>'Cancha Fútbol','booking_model'=>'resource','requires_professional'=>false,
            'duration_mode'=>'selectable','duration_minutes'=>60,'duration_options'=>[60,120],'buffer_minutes'=>0]);
        $resource=\App\Modules\Booking\Models\Resource::create(['business_id'=>$this->service->business_id,'branch_id'=>$this->branch->id,'name'=>'Cancha','type'=>'COURT','capacity'=>1,'is_active'=>true]);
        $this->service->resources()->attach($resource->id);
        $business=Business::factory()->create(['name'=>'Odontología del Parque','uses_resources'=>false]);
        $branch=BusinessBranch::create(['business_id'=>$business->id,'name'=>'Consultorio','address'=>'Pereira','is_main_branch'=>true,'is_active'=>true]);
        foreach (['THURSDAY','FRIDAY'] as $day) DB::table('business.branch_schedules')->insert(['branch_id'=>$branch->id,'day'=>$day,'open_time'=>'09:00','close_time'=>'13:00']);
        $dental=Service::factory()->create(['business_id'=>$business->id,'name'=>'Consulta odontológica','price'=>80000,'duration_minutes'=>30,'buffer_minutes'=>0]);
        $professional=Professional::create(['business_id'=>$business->id,'name'=>'Profesional dental','specialty'=>'Odontología','is_active'=>true]);
        DB::table('catalog.professional_services')->insert(['professional_id'=>$professional->id,'service_id'=>$dental->id,'branch_id'=>$branch->id,'is_active'=>true]);
        return [$this->service,$dental];
    }

    private function start(): string
    {
        return $this->postJson('/api/v2/ai-chat/start', ['context_type' => 'BOOKING'])->assertCreated()->json('data.session_id');
    }

    public function test_cards_without_available_slots_respect_branch_tariff_and_budget(): void
    {
        DB::table('business.branch_schedules')->where('branch_id', $this->branch->id)->update(['is_closed' => true]);
        DB::table('catalog.branch_services')->insert(['branch_id' => $this->branch->id, 'service_id' => $this->service->id, 'is_active' => true, 'price_override' => 60000]);
        $this->postJson('/api/v2/ai-chat/'.$this->start().'/send', ['content' => 'Manicure por menos de $50.000'])
            ->assertOk()->assertJsonCount(0, 'data.metadata.cards');
        $this->postJson('/api/v2/ai-chat/'.$this->start().'/send', ['content' => 'Manicure'])
            ->assertOk()->assertJsonPath('data.metadata.cards.0.price', 60000)->assertJsonCount(0, 'data.metadata.cards.0.slots');
    }

    public function test_changing_service_does_not_reuse_the_previous_selected_card(): void
    {
        $haircut = Service::factory()->create(['business_id' => $this->service->business_id, 'name' => 'Corte', 'price' => 30000]);
        DB::table('catalog.professional_services')->insert(['professional_id' => $this->professional->id, 'service_id' => $haircut->id, 'branch_id' => $this->branch->id, 'is_active' => true]);
        $session = $this->start();
        $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content' => 'Manicure el lunes', 'context' => ['service_id' => $this->service->id]])->assertOk();
        $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content' => 'Ahora quiero un corte el lunes'])
            ->assertOk()->assertJsonPath('data.metadata.cards.0.service_id', $haircut->id);
    }

    public function test_rescheduling_preparation_only_opens_owned_upcoming_bookings_without_mutation(): void
    {
        $client = Client::where('user_id', $this->customer->id)->firstOrFail();
        $this->appointment($client, '2026-10-05');
        $own = Appointment::latest('id')->firstOrFail();
        $own->update(['status' => 'CONFIRMED']);
        $this->appointment(Client::factory()->create(), '2026-10-06');
        Appointment::latest('id')->firstOrFail()->update(['status' => 'CONFIRMED']);
        $this->appointment($client, '2026-10-02');
        $response = $this->postJson('/api/v2/ai-chat/'.$this->start().'/send', ['content' => 'Quiero reprogramar mi reserva']);
        $response->assertOk()->assertJsonCount(1, 'data.metadata.cards')
            ->assertJsonPath('data.metadata.cards.0.appointment_id', $own->id)
            ->assertJsonPath('data.metadata.cards.0.prepared_action', 'review_reschedule')
            ->assertJsonPath('data.metadata.requires_confirmation', true);
        $this->assertSame('2026-10-05', $own->fresh()->date->toDateString());
        $this->assertSame(3, Appointment::count());
        Http::assertNothingSent();
    }

    private function appointment(Client $client, string $date): void
    {
        Appointment::create(['business_id' => $this->service->business_id, 'branch_id' => $this->branch->id, 'service_id' => $this->service->id,
            'professional_id' => $this->professional->id, 'client_id' => $client->id, 'date' => $date, 'start_time' => '10:00', 'end_time' => '11:00',
            'status' => 'COMPLETED', 'price' => 45000, 'final_price' => 45000, 'currency' => 'COP']);
    }
}
