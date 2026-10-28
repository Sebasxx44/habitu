#!/bin/sh
set -eu
cd /var/www

if [ -z "${APP_KEY:-}" ]; then
    echo 'Falta APP_KEY persistente; generar una sola vez con php artisan key:generate --show.' >&2
    exit 1
fi
case "${PORT:-8080}" in
    *[!0-9]*|'') echo 'PORT debe ser un número.' >&2; exit 1 ;;
esac
export PORT="${PORT:-8080}"

mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
if [ "${RUN_MIGRATIONS_ON_START:-false}" = true ]; then
    /opt/habitu/release.sh
fi
php artisan storage:link --no-interaction
php artisan config:cache --no-interaction
php artisan view:cache --no-interaction
envsubst '${PORT}' < /opt/habitu/nginx.conf.template > /etc/nginx/nginx.conf
nginx -t
exec "$@"

