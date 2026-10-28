<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bienvenido a {{ config('brand.name') }}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F7F8F2; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .header { background: linear-gradient(135deg, #171A2B 0%, #293BE0 100%); padding: 40px 30px; text-align: center; }
  .header h1 { color: #D5FA47; margin: 0; font-size: 28px; }
  .header p { color: #ccc; margin: 8px 0 0; font-size: 14px; }
  .content { padding: 30px; color: #171A2B; line-height: 1.6; }
  .content h2 { color: #171A2B; font-size: 20px; margin-top: 0; }
  .btn { display: inline-block; background: #3B4DFF; color: #FFFFFF; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
  .footer { padding: 20px 30px; text-align: center; font-size: 12px; color: #657087; background: #F7F8F2; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div style="background: #FFFFFF; border-radius: 12px; padding: 14px 20px; display: inline-block; margin-bottom: 16px;">
      <img src="{{ rtrim(config('app.frontend_url'), '/') . config('brand.email_logo') }}" alt="{{ config('brand.name') }}" width="160" style="display: block; height: auto; border: 0;">
    </div>
    <h1>{{ config('brand.name') }}</h1>
    <p>{{ config('brand.tagline') }}</p>
  </div>
  <div class="content">
    <h2>¡Hola {{ $name ?? 'Usuario' }}!</h2>
    <p>Bienvenido a <strong>{{ config('brand.name') }}</strong>. Tu cuenta ha sido creada exitosamente.</p>
    <p>Con {{ config('brand.name') }} puedes:</p>
    <ul>
      <li>Reservar servicios de belleza, fitness, deportes y más</li>
      <li>Solicitar servicios a domicilio en tiempo real</li>
      <li>Acumular puntos de fidelidad y obtener recompensas</li>
      <li>Chatear directamente con los profesionales</li>
    </ul>
    <a href="{{ $dashboard_url ?? '#' }}" class="btn">Ir a mi cuenta</a>
  </div>
  <div class="footer">
    &copy; {{ date('Y') }} {{ config('brand.name') }}. Todos los derechos reservados.
  </div>
</div>
</body>
</html>
