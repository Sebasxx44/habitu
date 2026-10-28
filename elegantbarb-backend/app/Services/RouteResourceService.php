<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class RouteResourceService
{
    private const MODELS = [
        'promotions' => \App\Modules\Marketing\Models\Promotion::class,
        'subscriptions' => \App\Modules\Subscriptions\Models\UserSubscription::class,
        'businesses' => \App\Modules\Business\Models\Business::class,
        'branches' => \App\Modules\Business\Models\BusinessBranch::class,
        'professionals' => \App\Modules\People\Models\Professional::class,
        'clients' => \App\Modules\People\Models\Client::class,
        'services' => \App\Modules\Catalog\Models\Service::class,
        'resources' => \App\Modules\Booking\Models\Resource::class,
        'appointments' => \App\Modules\Booking\Models\Appointment::class,
        'reviews' => \App\Modules\Reviews\Models\Review::class,
        'loyalty' => \App\Modules\Loyalty\Models\LoyaltyProgram::class,
        'campaigns' => \App\Models\Campaign::class,
        'on-demand' => \App\Modules\OnDemand\Models\OnDemandRequest::class,
        'waitlist' => \App\Modules\Booking\Models\Waitlist::class,
        'dynamic-pricing' => \App\Modules\Catalog\Models\DynamicPricingRule::class,
        'smart-queues' => \App\Modules\Booking\Models\SmartQueue::class,
    ];

    public function resolve(Request $request, string $module): ?Model
    {
        $id = $request->route('id') ?? $request->route('queueId') ?? $request->route('appointmentId');
        $class = self::MODELS[$module] ?? null;
        if ($module === 'automation') {
            $id = $request->route('requestId') ?? $request->route('appointmentId');
            $class = $request->route('requestId') ? self::MODELS['on-demand'] : self::MODELS['appointments'];
        }
        if ($module === 'bnpl') {
            $class = $request->route('appointmentId') ? self::MODELS['appointments'] : \App\Modules\Finance\Models\BNPLApplication::class;
            if (str_contains($request->path(), '/installments/')) {
                return \App\Modules\Finance\Models\BNPLInstallment::findOrFail($id)->application;
            }
        }
        if ($module === 'split-payments') {
            $class = $request->route('appointmentId') ? self::MODELS['appointments'] : null;
            if (str_contains($request->path(), '/participants/')) {
                return \App\Modules\Finance\Models\SplitPaymentParticipant::findOrFail($id);
            }
        }
        if ($module === 'memberships' && $id) {
            $class = str_contains($request->path(), '/plans/')
                ? \App\Modules\Subscriptions\Models\MembershipPlan::class
                : \App\Modules\Subscriptions\Models\ClientMembership::class;
        }
        if ($request->route('entryId')) {
            return \App\Modules\Booking\Models\SmartQueueEntry::findOrFail($request->route('entryId'));
        }
        return $class && $id ? $class::findOrFail($id) : null;
    }

    public function businessRecord(Model $record): Model
    {
        return match (true) {
            $record instanceof \App\Modules\Finance\Models\BNPLApplication => \App\Modules\Booking\Models\Appointment::findOrFail($record->appointment_id),
            $record instanceof \App\Modules\Finance\Models\SplitPaymentParticipant => $record->splitPayment->appointment,
            $record instanceof \App\Modules\Booking\Models\SmartQueueEntry => $record->queue,
            $record instanceof \App\Modules\Subscriptions\Models\ClientMembership => $record->plan,
            default => $record,
        };
    }
}
