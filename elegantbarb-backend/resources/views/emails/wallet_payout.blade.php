<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pago recibido</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F7F8F2; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .header { background: linear-gradient(135deg, #171A2B 0%, #293BE0 100%); padding: 30px; text-align: center; }
  .header h1 { color: #D5FA47; margin: 0; font-size: 24px; }
  .content { padding: 30px; color: #171A2B; line-height: 1.6; }
  .amount { font-size: 36px; font-weight: 700; color: #171A2B; text-align: center; margin: 20px 0; }
  .amount span { font-size: 16px; color: #657087; display: block; margin-top: 4px; }
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
    <h1>Pago recibido</h1>
  </div>
  <div class="content">
    <p>Hola {{ $professional_name ?? 'Profesional' }},</p>
    <p>Se ha acreditado un nuevo pago a tu wallet.</p>

    <div class="amount">
      ${{ number_format($amount ?? 0, 0, ',', '.') }} COP
      <span>Balance actual: ${{ number_format($balance ?? 0, 0, ',', '.') }} COP</span>
    </div>

    <div class="detail">
      <div class="detail-row"><span>Concepto:</span> <strong>{{ $description ?? 'Servicio completado' }}</strong></div>
      <div class="detail-row"><span>Fecha:</span> <strong>{{ $date ?? now()->format('d/m/Y H:i') }}</strong></div>
      <div class="detail-row"><span>ID transacción:</span> <strong>{{ $transaction_id ?? 'N/A' }}</strong></div>
    </div>

    <a href="{{ $dashboard_url ?? '#' }}" class="btn">Ver mi wallet</a>
  </div>
  <div class="footer">
    &copy; {{ date('Y') }} {{ config('brand.name') }}. Todos los derechos reservados.
  </div>
</div>
</body>
</html>
