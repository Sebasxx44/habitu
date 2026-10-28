FROM node:22-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
# Native canvas is used only by tests; the Vite build needs no install scripts.
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM php:8.3-fpm-alpine AS runtime
RUN apk add --no-cache nginx supervisor gettext libpq libpng libjpeg-turbo libwebp freetype libzip oniguruma \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS postgresql-dev libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev libzip-dev oniguruma-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) pdo_pgsql mbstring gd zip exif opcache pcntl \
    && apk del .build-deps
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www
COPY elegantbarb-backend/composer.json elegantbarb-backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist --no-progress
COPY elegantbarb-backend/ ./
COPY --from=frontend /build/dist/ ./public/
COPY deploy/ /opt/habitu/
RUN mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache /run/nginx \
    && composer dump-autoload --no-dev --classmap-authoritative --no-interaction \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x /opt/habitu/entrypoint.sh /opt/habitu/release.sh \
    && cp /opt/habitu/php.ini /usr/local/etc/php/conf.d/production.ini
ENV APP_ENV=production APP_DEBUG=false LOG_CHANNEL=stderr LOG_LEVEL=warning PORT=8080 \
    CACHE_DRIVER=database SESSION_DRIVER=database QUEUE_CONNECTION=database BROADCAST_DRIVER=log \
    SESSION_SECURE_COOKIE=true REALTIME_ENABLED=false
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:${PORT}/api/health || exit 1
ENTRYPOINT ["/opt/habitu/entrypoint.sh"]
CMD ["supervisord", "-c", "/opt/habitu/supervisord.conf"]

