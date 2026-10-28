<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Actualización de solicitud</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F7F8F2; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .header { background: linear-gradient(135deg, #171A2B 0%, #293BE0 100%); padding: 30px; text-align: center; }
  .header h1 { color: #D5FA47; margin: 0; font-size: 24px; }
  .content { padding: 30px; color: #171A2B; line-height: 1.6; }
  .status { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
  .status-searching { background: #fef3c7; color: #92400e; }
  .status-accepted { background: #d1fae5; color: #065f46; }
  .status-on_the_way { background: #dbeafe; color: #1e40af; }
  .status-in_progress { background: #e0e7ff; color: #3730a3; }
  .status-completed { background: #d1fae5; color: #065f46; }
  .status-cancelled { background: #fee2e2; color: #991b1b; }
  .detail { background: #F7F8F2; padding: 16px; border-radius: 8px; margin: 16px 0; }
  .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
  .detail-row:last-child { border-bottom: none; }
  .btn { display: inline-block; background: #3B4DFF; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
  .footer { padding: 20px 30px; text-align: center; font-size: 12px; color: #657087; background: #F7F8F2; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div style="background: #FFFFFF; border-radius: 12px; padding: 14px 20px; display: inline-block; margin-bottom: 16px;">
      <img src="{{ rtrim(config('app.frontend_url'), '/') . config('brand.email_logo') }}" alt="{{ config('brand.name') }}" width="160" style="display: block; height: auto; border: 0;">
    </div>
    <h1>Solicitud {{ $request_code ?? '' }}</h1>
  </div>
  <div class="content">
    <span class="status status-{{ strtolower($status ?? 'searching') }}">{{ $status_label ?? $status ?? 'Buscando' }}</span>
    <p>Hola {{ $client_name ?? 'Cliente' }},</p>
    <p>Tu solicitud de servicio a domicilio ha sido actualizada.</p>

    <div class="detail">
      <div class="detail-row"><span>Servicio:</span> <strong>{{ $service_name ?? 'N/A' }}</strong></div>
      <div class="detail-row"><span>Precio estimado:</span> <strong>${{ number_format($estimated_price ?? 0, 0, ',', '.') }} COP</strong></div>
      <div class="detail-row"><span>Dirección:</span> <strong>{{ $address ?? 'N/A' }}</strong></div>
      @if($professional_name)
      <div class="detail-row"><span>Profesional:</span> <strong>{{ $professional_name }}</strong></div>
      @endif
      @if($status === 'ON_THE_WAY' && $eta_minutes)
      <div class="detail-row"><span>Tiempo estimado:</span> <strong>{{ $eta_minutes }} min</strong></div>
      @endif
    </div>

    <a href="{{ $tracking_url ?? '#' }}" class="btn">Ver seguimiento en vivo</a>
  </div>
  <div class="footer">
    &copy; {{ date('Y') }} {{ config('brand.name') }}. Todos los derechos reservados.
  </div>
</div>
</body>
</html>
