#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="elegantbarb-tests-$$"
docker run --detach --rm --name "$container" --publish 127.0.0.1:55439:5432 \
  --env POSTGRES_USER=elegantbarb_test --env POSTGRES_PASSWORD=isolated_test_only \
  --env POSTGRES_DB=elegantbarb_test --tmpfs /var/lib/postgresql/data postgres:16-alpine >/dev/null
trap 'docker stop "$container" >/dev/null' EXIT
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U elegantbarb_test -d elegantbarb_test >/dev/null 2>&1; then
    php artisan test "$@"
    exit $?
  fi
  sleep 1
done
printf '%s\n' 'PostgreSQL de pruebas no está disponible.' >&2
exit 1
