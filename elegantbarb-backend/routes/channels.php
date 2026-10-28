<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// On-Demand request channel — client or assigned professional
Broadcast::channel('on-demand.{requestId}', function ($user, $requestId) {
    $request = \App\Modules\OnDemand\Models\OnDemandRequest::find($requestId);
    if (! $request) return false;
    
    if (\App\Modules\People\Models\Client::where('user_id', $user->id)->whereKey($request->client_id)->exists()) return true;
    
    if (\App\Modules\People\Models\Professional::where('user_id', $user->id)->whereKey($request->professional_id)->exists()) return true;
    
    return false;
});

// Client personal channel
Broadcast::channel('client.{clientId}', function ($user, $clientId) {
    return \App\Modules\People\Models\Client::where('user_id', $user->id)->whereKey((int) $clientId)->exists();
});

// Professional personal channel
Broadcast::channel('professional.{professionalId}', function ($user, $professionalId) {
    return \App\Modules\People\Models\Professional::where('user_id', $user->id)->whereKey((int) $professionalId)->exists();
});

// Business searching channel (for professionals to listen to new requests)
Broadcast::channel('on-demand.searching.{businessId}', function ($user, $businessId) {
    $professional = \App\Modules\People\Models\Professional::where('user_id', $user->id)
        ->where('business_id', (int) $businessId)
        ->first();
    return $professional !== null;
});

// Chat conversation channel
Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    return \App\Modules\Chat\Models\ConversationParticipant::where('conversation_id', (int) $conversationId)
        ->where('user_id', $user->id)
        ->exists();
});

// Tracking channel (public for clients to track their professional)
Broadcast::channel('tracking.professional.{professionalId}', function ($user, $professionalId) {
    // Any authenticated user can track if they have an active appointment or on-demand with this professional
    $hasActiveBooking = \App\Modules\Booking\Models\Appointment::where('professional_id', (int) $professionalId)
        ->whereIn('client_id', function ($q) use ($user) {
            $q->select('id')->from('people.clients')->where('user_id', $user->id);
        })
        ->whereDate('date', today())
        ->whereIn('status', ['PENDING', 'CONFIRMED'])
        ->exists();
    
    $hasActiveOnDemand = \App\Modules\OnDemand\Models\OnDemandRequest::where('professional_id', (int) $professionalId)
        ->whereIn('client_id', function ($q) use ($user) {
            $q->select('id')->from('people.clients')->where('user_id', $user->id);
        })
        ->whereIn('status', ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'])
        ->exists();
    
    return $hasActiveBooking || $hasActiveOnDemand;
});

// Application-wide invalidations carry no record payload; all reads retain HTTP authorization.
Broadcast::channel('user.{id}', fn (\App\Models\User $user, string $id): bool => (int) $user->id === (int) $id);
Broadcast::channel('platform', fn (\App\Models\User $user): bool => $user->role === \App\Models\User::ROLE_SUPERADMIN);
Broadcast::channel('business.{id}', fn (\App\Models\User $user, string $id): bool =>
    $user->role === \App\Models\User::ROLE_SUPERADMIN || in_array((int) $id, app(\App\Services\BusinessAccessService::class)->businessIds($user), true));

Broadcast::channel('accounts', fn (\App\Models\User $user): bool => $user->exists);
