<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nuevo mensaje</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F7F8F2; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .header { background: linear-gradient(135deg, #171A2B 0%, #293BE0 100%); padding: 30px; text-align: center; }
  .header h1 { color: #D5FA47; margin: 0; font-size: 24px; }
  .content { padding: 30px; color: #171A2B; line-height: 1.6; }
  .message-bubble { background: #F7F8F2; padding: 16px; border-radius: 12px; border-left: 4px solid #D5FA47; margin: 16px 0; font-style: italic; }
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
    <h1>Nuevo mensaje</h1>
  </div>
  <div class="content">
    <p>Hola {{ $recipient_name ?? 'Usuario' }},</p>
    <p><strong>{{ $sender_name ?? 'Alguien' }}</strong> te ha enviado un mensaje:</p>

    <div class="message-bubble">
      "{{ $message_preview ?? '...' }}"
    </div>

    <a href="{{ $chat_url ?? '#' }}" class="btn">Responder mensaje</a>
  </div>
  <div class="footer">
    &copy; {{ date('Y') }} {{ config('brand.name') }}. Todos los derechos reservados.
  </div>
</div>
</body>
</html>
