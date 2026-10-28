@component('mail::message')
# Hola, {{ $appointment->client->name }}!

Tu cita en **{{ $appointment->barberShop->name }}** ha sido reagendada por el administrador.

### Nuevos Detalles de la Cita:
- **Fecha:** {{ $appointment->date->format('d/m/Y') }}
- **Hora:** {{ $appointment->time }}
- **Barbero:** {{ $appointment->barber->name }}
- **Servicio:** {{ $appointment->service->name }}

@component('mail::button', ['url' => config('app.url')])
Ver mi cita
@endcomponent

Si tienes alguna duda, por favor contáctanos directamente.

Gracias,<br>
El equipo de {{ config('brand.name') }}
@endcomponent
