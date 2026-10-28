# Exportaciones masivas

Laravel autoriza y guarda la solicitud; Redis Streams entrega el trabajo al servicio Go. El worker lee PostgreSQL como flujo, escribe CSV de forma atómica y publica `resource.changed` en el canal privado del solicitante. El navegador descarga el archivo directamente con una URL firmada de dos minutos, sin cargarlo completo en JavaScript.

Límites: tres solicitudes simultáneas por usuario, tres intentos, diez minutos por intento, un millón de filas y 366 días. Los archivos vencen a las 24 horas. Una caída se recupera mediante `XAUTOCLAIM` después de once minutos; el worker recupera también entregas interrumpidas entre PostgreSQL y Redis. La vista interactiva admite hasta 10.000 registros.

## Desarrollo local

Desde la raíz, después de instalar las dependencias PHP:

```sh
cd elegantbarb-backend
php artisan migrate
cd ..
mkdir -p elegantbarb-backend/storage/app/private/reports
REPORT_WORKER_UID=$(id -u) REPORT_WORKER_GID=$(id -g) docker compose up -d --build redis soketi report-worker
```

En `elegantbarb-backend/.env`, con Laravel ejecutándose en el host:

```dotenv
REDIS_HOST=127.0.0.1
REDIS_PORT=6381
REDIS_CLIENT=predis
QUEUE_CONNECTION=redis
REPORT_REDIS_HOST=127.0.0.1
REPORT_REDIS_PORT=6381
REPORT_REDIS_DB=2
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=habitu-local
PUSHER_APP_KEY=habitu-local-key
PUSHER_APP_SECRET=habitu-local-secret
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001
PUSHER_SCHEME=http
```

En `frontend/.env.local`, añade `VITE_PUSHER_APP_KEY=habitu-local-key`, `VITE_PUSHER_HOST=localhost`, `VITE_PUSHER_PORT=6001` y `VITE_PUSHER_SCHEME=http`, y reinicia Vite. La clave pública debe coincidir con Soketi; el secreto permanece únicamente en los procesos del servidor.

Para entregar los eventos de Laravel, deja activo otro proceso desde `elegantbarb-backend`:

```sh
php artisan queue:work redis --queue=realtime,default --sleep=1 --tries=3 --timeout=90
```

El compose del backend configura estos hosts para la red de Docker y comparte el volumen `reportsdata` entre Laravel y Go. Los valores `habitu-local-*` son exclusivos de desarrollo; configura credenciales propias para despliegues. El directorio debe ser legible por Laravel y escribible por el worker. `REPORT_STREAM` y `REPORT_REDIS_DB` deben coincidir en ambos procesos. La cola no comparte prefijos ni base Redis con la caché.

Las exportaciones son instantáneas de las citas al comenzar la consulta: valor de servicios y pagos completados se muestran separados; no se inventan comisiones ni ganancia neta. Cada descarga vuelve a comprobar permisos y negocios autorizados.

## Validación aislada

```sh
docker compose -p habitu-report-tests -f services/report-worker/compose.test.yml up --abort-on-container-exit --exit-code-from tests
docker compose -p habitu-report-tests -f services/report-worker/compose.test.yml down -v
```

No publica puertos ni utiliza la base de desarrollo. Prueba cola, generación real, aislamiento de negocios/monedas, pagos, fórmulas CSV, duplicados y reintentos. Los contratos HTTP se verifican en `ReportExportsTest` con la suite aislada de Laravel.

Referencias: [Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/), [Pusher HTTP API](https://pusher.com/docs/channels/library_auth_reference/rest-api/), [pgxpool](https://pkg.go.dev/github.com/jackc/pgx/v5/pgxpool).
