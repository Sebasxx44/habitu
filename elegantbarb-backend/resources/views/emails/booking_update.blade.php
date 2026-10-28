@component('mail::message')
# {{ $details['title'] }}

{{ $details['message'] }}

@component('mail::panel')
@if($details['booking_code'])
**Reserva:** {{ $details['booking_code'] }}
@endif  
**Servicio:** {{ $details['service'] }}  
**Fecha y hora:** {{ $details['date'] }} · {{ $details['time'] }} ({{ $details['timezone'] }})  
**Sede:** {{ $details['branch'] }}  
@if($details['professional'])
**Profesional:** {{ $details['professional'] }}
@endif
@endcomponent

@component('mail::button', ['url' => $bookingUrl])
{{ $details['event_type'] === 'waitlist_available' ? 'Ver disponibilidad' : 'Consultar reserva' }}
@endcomponent

Consulta el estado actual y las acciones disponibles en tu cuenta.

{{ config('brand.name') }}
@endcomponent
