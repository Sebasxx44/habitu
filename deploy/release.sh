#!/bin/sh
set -eu
cd /var/www
: "${APP_KEY:?Falta APP_KEY persistente}"
: "${APP_URL:?Falta APP_URL HTTPS}"
case "$APP_URL" in
    https://*) ;;
    *) echo 'APP_URL debe usar HTTPS en producción.' >&2; exit 1 ;;
esac
if [ "${APP_ENV:-production}" != production ] || [ "${APP_DEBUG:-false}" != false ]; then
    echo 'El despliegue requiere APP_ENV=production y APP_DEBUG=false.' >&2
    exit 1
fi
php artisan config:clear --no-interaction
php artisan migrate --force --no-interaction
php artisan db:seed --class=ProductionCatalogSeeder --force --no-interaction
php artisan app:bootstrap-superadmin --if-configured --no-interaction

