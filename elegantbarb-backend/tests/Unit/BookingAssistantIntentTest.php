<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Modules\Platform\Services\BookingAssistantIntent;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BookingAssistantIntentTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-03 09:00', 'America/Bogota'));
        config(['services.gemini.key' => null]);
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_current_dental_subject_and_thursday_replace_every_sports_filter_in_both_languages(): void
    {
        $context = ['q' => 'futbol', 'business_id' => 10, 'service_id' => 15, 'branch_id' => 1, 'resource_id' => 2,
            'professional_id' => 8, 'category_id' => 4, 'booking_model' => 'resource', 'sport_type' => 'football_5',
            'resource_type' => 'COURT', 'duration_minutes' => 120, 'participants' => 8, 'date' => '2026-10-05',
            'time_from' => '20:00', 'time_to' => '23:00', 'max_price' => 50000, 'promotions' => true, 'zone' => 'Pereira'];
        foreach (['odontologo el jueves', 'odontóloga el jueves', 'dentist on Thursday', 'dentistry on Thursday', 'no quiero fútbol, quiero odontólogo el jueves'] as $message) {
            $result = app(BookingAssistantIntent::class)->resolve($message, null, [], $context);
            $this->assertSame('dental', $result['filters']['q']);
            $this->assertSame('2026-10-08', $result['filters']['date']);
            $this->assertSame('Pereira', $result['filters']['zone']);
            foreach (array_diff(array_keys($context), ['q', 'date', 'zone']) as $field) $this->assertArrayNotHasKey($field, $result['filters']);
            $this->assertFalse($result['clarification_required']);
        }
        Http::assertNothingSent();
    }

    public function test_provider_cannot_override_the_latest_domain_or_explicit_weekday_with_old_history(): void
    {
        config(['services.gemini.key' => 'fake-test-key']);
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response(['candidates' => [['content' => ['parts' => [[
            'text' => json_encode(['intent' => 'search', 'q' => 'futbol', 'booking_model' => 'resource', 'date' => '2026-10-05', 'duration_minutes' => 120]),
        ]]]]]])]);
        $result = app(BookingAssistantIntent::class)->resolve('odontologo el jueves', null, [['role' => 'user', 'content' => 'fútbol el lunes']], ['q' => 'futbol', 'resource_id' => 5]);
        $this->assertSame('dental', $result['filters']['q']);
        $this->assertSame('2026-10-08', $result['filters']['date']);
        $this->assertArrayNotHasKey('booking_model', $result['filters']);
        $this->assertArrayNotHasKey('duration_minutes', $result['filters']);
        $this->assertArrayNotHasKey('resource_id', $result['filters']);
    }

    public function test_earlier_keeps_dental_scope_and_asks_for_missing_time_instead_of_guessing(): void
    {
        $parser = app(BookingAssistantIntent::class);
        foreach (['más temprano', 'earlier'] as $message) {
            $result = $parser->resolve($message, null, [], ['q' => 'dental', 'date' => '2026-10-08', 'time_from' => '11:00', 'time_to' => '11:00']);
            $this->assertSame('dental', $result['filters']['q']);
            $this->assertSame('2026-10-08', $result['filters']['date']);
            $this->assertSame('10:59', $result['filters']['time_to']);
            $this->assertArrayNotHasKey('time_from', $result['filters']);
            $this->assertFalse($result['clarification_required']);
            $missing = $parser->resolve($message, null, [], ['q' => 'dental', 'date' => '2026-10-08']);
            $this->assertTrue($missing['clarification_required']);
            $this->assertSame('dental', $missing['filters']['q']);
            $this->assertSame('earlier', $missing['clarification_field']);
        }
    }

    public function test_follow_up_keeps_subject_but_an_unspecified_subject_change_requires_clarification(): void
    {
        $parser = app(BookingAssistantIntent::class);
        $result = $parser->resolve('y el viernes?', null, [], ['q' => 'dental', 'date' => '2026-10-08', 'date_to' => '2026-10-10']);
        $this->assertSame('dental', $result['filters']['q']);
        $this->assertSame('2026-10-09', $result['filters']['date']);
        $this->assertArrayNotHasKey('date_to', $result['filters']);
        foreach (['otra cosa el jueves', 'something else on Thursday'] as $message) {
            $result = $parser->resolve($message, null, [], ['q' => 'futbol', 'resource_id' => 1]);
            $this->assertTrue($result['clarification_required']);
            $this->assertArrayNotHasKey('q', $result['filters']);
            $this->assertSame('2026-10-08', $result['filters']['date']);
        }
        $this->assertTrue($parser->resolve('el jueves', null, [], [])['clarification_required']);
        $this->assertSame('urologo', $parser->resolve('urologo el jueves', null, [], ['q' => 'futbol'])['filters']['q']);
    }
}
