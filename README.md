# ElegantBarb / HABITÜ

Plataforma de reservas para negocios, profesionales y clientes.

## Arquitectura activa

| Capa | Implementación |
| --- | --- |
| Frontend | `frontend`: React 18, TypeScript, Vite 7, Tailwind, componentes TA y Recharts |
| API | `elegantbarb-backend`: Laravel 12, Sanctum 4, PHP 8.2+ |
| Datos | PostgreSQL: esquemas business, people, catalog, booking, finance, marketing, subscriptions y platform |
| Procesos | Colas Laravel en Redis, WebSockets con soketi y exportaciones masivas en Go |
| Comunicación | HTTP `/api`, autenticación Bearer; canales privados cuando Pusher está configurado |
| Prototipo | `frontend-nuxt` no es el cliente conectado a esta API |

Roles: SUPERADMIN, ADMIN_BARBERIA, BARBERO (PROFESSIONAL en el cliente) y CLIENTE. El backend valida roles, permisos efectivos y pertenencia al negocio; la navegación aplica las mismas restricciones. `routes/api.php` conserva compatibilidad y `routes/modules.php` expone los módulos v2.

Los módulos principales cubren negocios/sedes, catálogo, profesionales/clientes, citas/recursos, billetera/pagos, fidelización, suscripciones, campañas, notificaciones y reportes. También existen colas, atención a domicilio, chat e integraciones opcionales. Los paquetes y vales cerrados se gestionan en Benefits; las solicitudes de reembolso conservan estados independientes del saldo de billetera. La confirmación externa depende de evidencia del proveedor.

## Desarrollo

Requisitos: Node 22.12+, PHP 8.2+ con pdo_pgsql, Composer y PostgreSQL. Docker permite ejecutar PostgreSQL/Redis y las pruebas aisladas.

Backend, desde `elegantbarb-backend`:

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Configura las credenciales de tu base local en `.env`. Para una base nueva ejecuta `php artisan migrate`; revisa y respalda una instalación con datos antes de aplicar migraciones. Después inicia `php artisan serve --host=127.0.0.1 --port=8000`. En desarrollo sin workers puedes usar `CACHE_DRIVER=file` y `QUEUE_CONNECTION=sync`; para envío real de campañas se requiere el worker configurado.

Frontend, desde `frontend`:

```bash
npm ci
npm run dev
```

Vite sirve `http://localhost:5173` y dirige `/api` al puerto 8000. La preferencia claro/oscuro/sistema persiste en el navegador. La zona horaria de reservas se configura con `BOOKING_TIMEZONE` (por defecto America/Bogota).

## Datos de demostración

Desde `elegantbarb-backend`, ejecuta `php artisan db:seed` (equivale a `--class=AppDemoSeeder`). Sólo admite `local/testing`: agrega datos relacionados sin vaciar tablas y se puede repetir sin duplicar registros ni recargar saldos o recompensas consumidas. Las citas se distribuyen alrededor de la fecha de ejecución; no se realizan cobros ni envíos externos.

En `/login`, las cuentas `superadmin.demo@elegantbarb.test`, `admin.demo@elegantbarb.test`, `profesional.demo@elegantbarb.test` y `cliente.demo@elegantbarb.test` usan la contraseña local `Demo2026!Elegante`. El administrador, profesional y cliente principales pertenecen a **Estudio Norte · Demo**.

Para añadir únicamente los nuevos ejemplos: `php artisan db:seed --class='Database\Seeders\Demo\BenefitsDemoSeeder'` y `php artisan db:seed --class='Database\Seeders\Demo\DemoPricingProfileSeeder'`. Incluyen seis ofertas, seis tarjetas/programas de fidelidad, nueve planes y una membresía gratuita, más una tarifa de mañana entre semana. Repetirlos conserva canjes, límites consumidos y cancelaciones. Explóralos en `/cliente/benefits` y `/admin/dynamic-pricing`.

El seeder incluye 12 referencias públicas de Pereira: 13 sedes, 48 servicios, 26 profesionales ficticios, 24 promociones, 234 citas y 39 reseñas de demostración. Para añadir sólo este catálogo sobre las cuentas existentes: `php artisan db:seed --class='Database\Seeders\Demo\PereiraDemoSeeder'`. Las fuentes están en `database/seeders/Demo/PereiraReferences.php`; coordenadas de sector aproximadas y datos operativos DEMO, sin relación comercial con los establecimientos. Repetir este seeder conserva cualquier edición de sus registros.

## Mapas, asistente y avisos de reserva

El mapa utiliza OpenStreetMap por defecto, con atribución visible, caché normal del navegador y sin precarga de tiles. `VITE_MAP_PROVIDER=carto` requiere `VITE_CARTO_BASEMAP_KEY`, una clave pública de Basemaps restringida a los dominios de la aplicación; una credencial privada de CARTO no debe incluirse en Vite. El aviso «API KEY REQUIRED» provenía de los tiles de CARTO sin clave. Configuración: `frontend/.env.example`. Fuentes: [CARTO Basemaps](https://www.carto.com/basemaps/apikey/) y [política de tiles OSM](https://operations.osmfoundation.org/policies/tiles/).

La búsqueda usa filtros y paginación de servidor; la ubicación se aplica sólo al solicitarla. Las reservas revalidan horarios, profesionales, sede, precio y promociones con bloqueo transaccional e idempotencia. El asistente devuelve tarjetas del catálogo y sólo abre el resumen: siempre se requiere confirmar. Para interpretación generativa configura `GEMINI_API_KEY` y `GEMINI_MODEL` exclusivamente en backend; sin proveedor se identifica como búsqueda del catálogo, sin simular respuestas de IA.

Las notificaciones dentro de la app se guardan con el evento de reserva. Para correo real configura SMTP y `BOOKING_EMAIL_ENABLED=true`; ejecuta `php artisan queue:work database --queue=booking` y el scheduler de Laravel (`php artisan schedule:work` en desarrollo). Los recordatorios se configuran con `BOOKING_REMINDER_MINUTES` y se deduplican por cita/horario/ventana. El outbox diferencia correo desactivado, pendiente, enviado, preview y fallo; los drivers `log/array` nunca se marcan como envío real. Los seeders no envían mensajes externos.

## Reservas y descubrimiento

Cada servicio define su modelo de reserva: profesional, recurso, directa, profesional opcional o cupos. El administrador configura recursos compatibles, duraciones, anticipación y políticas; disponibilidad, cotización y confirmación revalidan las mismas reglas. Las duraciones seleccionables se cobran proporcionalmente a la duración base y los cupos multiplican ese importe. Reprogramar conserva duración, cupos y precio de la cita original.

«Para ahora» ofrece ventanas de tiempo y disponibilidad real; las tarjetas permiten consultar horarios sin perder filtros. Lúa abre reservas preseleccionadas, pero nunca confirma por el usuario. Su nombre se configura con `VITE_CONCIERGE_NAME`. El selector ES/EN guarda la preferencia y traduce la interfaz; los nombres y descripciones aportados por negocios conservan su idioma original.

Las alertas de disponibilidad persisten en `/cliente/on-demand`, pueden cancelarse y requieren scheduler para revisar aperturas. Los favoritos admiten negocios, servicios y profesionales. Sólo citas completadas propias permiten reseñar; las galerías usan medios guardados del servicio.

`AppDemoSeeder` incluye reparaciones idempotentes de «Canchas La 10» y «Canchas Arena · Demo». Para actualizar sólo sus modelos de reserva: `php artisan db:seed --class='Database\Seeders\Demo\RepairResourceBookingSeeder'`; no borra citas. `RepairDemoResourceBindingsSeeder` añade únicamente vínculos explícitos entre los servicios y recursos de los fixtures conocidos, conservando los vínculos desactivados. Las reservas anteriores al cambio de modelo siguen siendo reprogramables sin perder su asignación histórica ni su precio.

## Analítica y privacidad

Las vistas completas de negocio y plataforma usan períodos, monedas explícitas y exportación CSV. La medición del recorrido requiere consentimiento desde Explorar; por defecto está desactivada. No se guardan búsquedas libres, conversaciones ni coordenadas precisas en eventos analíticos. Las cohortes geográficas pequeñas se agrupan para proteger privacidad.

Las métricas de embudo sólo existen desde que se recolectan eventos consentidos. La ocupación histórica y la demografía sin datos legítimos se muestran como no disponibles; no se reconstruyen ni se infieren. Si falta el catálogo geográfico, se indica en el reporte.

## Calidad

Frontend: `npm run typecheck`, `npm test`, `npm run lint` y `npm run build`. El lint se limita a archivos nuevos; no aplica formateo masivo a código existente.

Backend: `bash scripts/test-isolated.sh` desde `elegantbarb-backend`. Crea PostgreSQL temporal en `127.0.0.1:55439`, ejecuta PHPUnit y elimina el contenedor. El bootstrap de pruebas rechaza otras bases/puertos. No ejecutes suites simultáneas contra esa misma base.

Auditorías: `composer audit` y `npm audit` / `npm audit --omit=dev`. El override de UUID para ExcelJS conserva su consumo de `v4` y evita la versión vulnerable transitiva. La auditoría de producción quedó sin avisos; persisten avisos de desarrollo por `braces` sin parche en la cadena Tailwind/shadcn. CI bloquea vulnerabilidades de producción y muestra separadamente las de herramientas.

## Cambios y prioridades

- **P0:** autenticación Google y 2FA verificadas, aislamiento entre negocios, pagos y suscripciones transaccionales, webhooks firmados, autorización de canales privados y preservación de tablas legacy.
- **P1:** disponibilidad real, conflictos/concurrencia, reprogramación, billetera/retiros, canjes idempotentes y reportes con moneda explícita.
- **P2:** dashboard por rol, tokens/temas, navegación responsive, estados de carga/error/vacío, gráficos, exportaciones y notificaciones persistidas.
- **P3:** logros, colas y atención a domicilio conectados a registros reales. Las funciones que requieren proveedores externos necesitan configuración válida; no simulan éxito.

Las migraciones `2026_10_03_*` añaden integridad e idempotencia sin limpiar datos históricos. Los nuevos CHECK `NOT VALID` protegen escrituras nuevas; antes de validarlos sobre todo el histórico hay que revisar los registros existentes.

El dashboard separa ingresos estimados de citas completadas y pagos efectivamente registrados. Los canjes utilizan reglas/sellos del negocio; XP e insignias son un registro distinto. Las membresías por negocio se activan mediante pago verificado con Wompi; las suscripciones generales pagadas utilizan la billetera.

## Integraciones y entrega

Google, Wompi, MercadoPago, WhatsApp, correo, Pusher y webhooks externos requieren sus variables de entorno. Los secretos permanecen en el backend. Los webhooks salientes sólo permiten dominios HTTPS configurados explícitamente. La vista pública se obtiene por slug activo y las estadísticas privadas requieren autorización.

Wompi: configura en `elegantbarb-backend/.env` las variables `WOMPI_ENVIRONMENT=test`, `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` y `APP_FRONTEND_URL`. Registra en Wompi la URL pública HTTPS de `/api/v2/webhooks/wompi` (localhost requiere un túnel). El backend firma el checkout, verifica el evento y consulta la transacción en la API privada antes de acreditar saldo o activar una membresía, una sola vez. El retorno del navegador nunca confirma pagos. Para producción utiliza las cuatro llaves de producción y `WOMPI_ENVIRONMENT=prod`; Sandbox está deshabilitado cuando `APP_ENV=production`.

Las pruebas automatizadas validan migraciones en bases temporales. Se verificaron en navegador local la búsqueda, filtros, reserva, detalle, cancelación y navegación de notificaciones, además de las vistas móviles. Las pruebas con credenciales reales de Gemini y SMTP siguen pendientes antes de publicar esas integraciones.

### Tiempo real y reportes masivos

Una conexión WebSocket por sesión actualiza los módulos por recurso; las consultas comparten caché en memoria y se invalidan tras cambios. Las pestañas ocultas suspenden refrescos y la desconexión activa recuperación periódica. Los canales privados conservan el aislamiento de usuarios y negocios; disponibilidad y pagos vuelven a validarse en servidor.

Las citas y sucursales incluyen gestión operativa, gráficos y recomendaciones basadas en datos del período y moneda. Domicilios permite ubicar la dirección en mapa, recuperar solicitudes y seguir estados sin inventar precios ni tiempos de llegada. Consulta [configuración y pruebas del servicio Go](services/report-worker/README.md) para colas, WebSockets y descargas masivas.


## Incremento marketplace — 4 de octubre de 2026

Contraste del backlog `HABITU_SIGUIENTE_NIVEL_CODEX.md` con el repositorio e implementación. Las referencias de backend son relativas a `elegantbarb-backend/app/Modules`; las vistas están en `frontend/src/modules`.

| Epic | Base contrastada | Resultado y evidencia |
| --- | --- | --- |
| E01 | Parcial: reservas y órdenes Wompi independientes | `Finance/Services/ReservationCheckoutService.php` + `checkout`: política explícita, anticipo/total/presencial, bloqueo, snapshot, idempotencia, conciliación, aprobación tardía y solicitud de devolución. |
| E02 | Existente: solicitudes y ofertas a domicilio | `OnDemand/Services/OnDemandEligibilityService.php`: agenda/bloqueos, pausa, caducidad, aceptación atómica, rechazo y reasignación supervisada. Las estimaciones de cobertura no se presentan como ETA de rutas. |
| E03 | Parcial: chat y seguimiento | `Chat`, `Tracking` y `reservation-lifecycle`: conversación por reserva, adjuntos privados, PIN limitado, alternativa autorizada y casos con responsable/plazo. |
| E04 | Propuesto | `Booking/Services/GroupCoordinationService.php` + `groups`: invitación revocable, aforo, votación, privacidad y reserva compatible. El organizador asume el pago; no se cobran aportes individuales. |
| E05 | Existente: repetición y membresías; rutinas/vales propuestos | `Booking/Services/BookingRoutineService.php`, `Benefits/Services/ServicePackageService.php` + `routines`, `commerce`: ocurrencias, pausa/omisión, paquetes consecutivos y canje auditable. Vales otorgados por el negocio, sin inventar una compra cobrada. |
| E06 | Existente: catálogo/disponibilidad en Lúa | `Platform/Services/OperationalAssistantTools.php`, `BookingAssistantTools.php` + `assistant`: agenda por rol, alternativas, repetición/reprogramación preparada, caducidad, historial acotado y borrado. La ejecución sigue en el flujo normal con confirmación. |
| E07 | Parcial: CRUD de personas y recursos | `People/Http/Controllers/ProfessionalOperationsController.php` + `operations`: vista Hoy, servicios, jornadas, descansos, ausencias, cierres/mantenimiento y condiciones de pago. |
| E08 | Parcial: lista de espera, precios, campañas y webhooks | `Marketing/Services/RetentionRecipeService.php`, `Platform/Services/MarketplaceOutbox.php` + `automation`, `webhooks`: propuestas aprobables, consentimiento/ventana/frecuencia, deduplicación, eventos firmados, reintentos y reproducción autorizada. |
| E09 | Existente: jornada, ubicación y ganancias | `operations`, `connections`, `reservation-lifecycle`: disponibilidad propia, pausas, calendario entrante, ofertas, cotización de extras aceptada y duración real. |
| E10 | Parcial: retiro solicitado | `Finance/Services/WithdrawalService.php` y `PayoutSandboxService.php`: reserva de saldo, historial, reversión y eventos; ensayo sandbox con destinatario sintético, snapshot cifrado, conciliación y límite de idempotencia de 24 h. El ensayo no modifica el retiro ni confirma una transferencia real. |
| E11 | Existente: informes; nuevos indicadores y control propuestos | `Analytics/Services/MarketplaceHealth.php`, `OperationalDiagnostics.php`, `Platform/Services/ProviderReviewService.php` + `analytics/health`, `provider-reviews`: cohortes por primera atención completada, denominadores, exclusión demo/test, clasificación auditada, flags y comprobaciones con vigencia/evidencia privada. |
| E12 | Parcial: registro API, código de referido local y anuncios | `auth`, `referrals`, `ads`, `distribution`: acceso/recuperación, atribución servidor y recompensa personal, moderación y etiqueta Patrocinado, QR local y widget con orígenes HTTPS explícitos. |

La medición de retención atribuye al último aviso abierto del mismo negocio dentro de siete días, sólo con consentimiento analítico; cuenta reservas completadas y excluye demo/sandbox. Se distingue aviso creado, leído y clic: no se afirma entrega de correo/WhatsApp ni incremento causal. Los anuncios conservan sus propias reglas de atribución y no se mezclan con recomendaciones orgánicas.

### Configuración y puesta en marcha

- Aplicar las migraciones nuevas `2026_10_04_000041` en adelante sobre una copia respaldada antes de desplegar el código. Esta ejecución sólo migró bases desechables de pruebas; no modificó la base de uso ni ejecutó seeders.
- En **Operación de hoy → Pagos**, cada negocio define modalidades, anticipo, vencimiento y cancelación. No hay cobro online sin configuración válida de Wompi; no se guardan tarjetas. Resolver responsable del cobro, comisiones, financiación de reembolsos y habilitación comercial antes de operar con dinero real.
- Mantener un scheduler de Laravel y workers para las colas utilizadas por la instalación (`default`, `booking`). El scheduler concilia pagos, libera bloqueos vencidos, despacha la outbox, procesa elegibilidad de referidos, prepara recetas y poda datos según retención. **Salud → Operación** muestra evidencia de ejecución y backlog; ausencia de señal no se convierte en un estado saludable.
- El ensayo `/superadmin/payouts` exige `WOMPI_PAYOUTS_SANDBOX_ENABLED` y llaves/cuenta/banco sandbox documentados en `.env.example`. Está apagado por defecto y no existe modo productivo; la fuente se valida antes de preparar y la respuesta se concilia por referencia, importe, lote y destinatario.
- Calendar usa `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` y `GOOGLE_CALENDAR_REDIRECT_URI`; conectar desde **Conexiones**. Los intervalos entrantes no guardan títulos ni mueven reservas existentes.
- FCM está apagado por defecto. Configurar las variables `PUSH_ENABLED`, `FCM_*` y `FIREBASE_*` documentadas en `.env.example`, dominio HTTPS y el service worker existente. Las preferencias transaccionales y promocionales son independientes. Cada entrega conserva dispositivo/evento y distingue aceptación del proveedor de lectura; un reintento omite los dispositivos ya aceptados.
- Configurar `WEBHOOK_ALLOWED_HOSTS` con destinos HTTPS específicos. El receptor verifica HMAC del cuerpo y deduplica `payload.id`; los reintentos conservan ese ID. Pausar un destino suprime entregas pendientes, sin deshacer la reserva.
- En **Salud**, clasificar explícitamente negocios como producción/demo/test y configurar rollout de grupos/rutinas por negocio/categoría. Los registros históricos quedan `UNCLASSIFIED` hasta revisión; no se adivina su origen. Las recetas y programas de referidos permanecen desactivados hasta configurarlos.
- Documentos de comprobación y adjuntos permanecen privados; las respuestas públicas sólo muestran comprobaciones vigentes y su alcance. La marca `verified` heredada no acredita una comprobación nueva ni garantiza calidad/seguridad.

### Límites operativos y reversión

No se habilitaron proveedores, dominios de terceros, cobros, transferencias, correos ni push reales. Los [reembolsos publicados por Wompi](https://docs.wompi.co/docs/colombia/reembolsos-sandbox/) se documentan como Sandbox; la devolución automática productiva requiere validar método, cuenta y contrato. La [dispersión de fondos](https://docs.wompi.co/docs/colombia/introduccion-pagos-a-terceros/) requiere cuenta origen, fondeo y habilitación propios. Un resultado de prueba nunca confirma recepción real.

La segunda expansión (convenios empresariales, compra multi-negocio, aportes individuales, métodos guardados y nuevos países) conserva las condiciones y dependencias del documento; no se activa por la mera presencia de una pantalla. No se integró una API de rutas sin resolver proveedor/costos/condiciones, ni se presenta una conversión de distancia lineal como duración real de viaje.

Para reversión operativa, pausar recetas/webhooks y desactivar flags/pagos online antes de volver a una versión compatible. Conservar órdenes, ledger, eventos y casos para conciliación. Las migraciones `down` están destinadas a la base descartable o a una reversión revisada **antes de generar datos**: eliminar sus tablas en una instalación operada perdería evidencia. No ejecutar un rollback destructivo automático de datos financieros.


### Validación ejecutada en este incremento

- Backend completo: **326 pruebas, 2.524 aserciones**, todas aprobadas con PostgreSQL temporal. Incluye carrera de reserva entre procesos, idempotencia, permisos entre negocios, estados financieros, privacidad, fallos/reintentos y reversión/reaplicación de las migraciones nuevas.
- Frontend: **76 pruebas** aprobadas, TypeScript y build de producción correctos. ESLint/Prettier se ejecutaron únicamente sobre archivos nuevos. Persisten avisos de tamaño de chunks en el build, sin errores de compilación.
- Wompi, Calendar y FCM se validaron con respuestas controladas/fakes; no se ejecutaron cobros, transferencias ni envíos reales. El ensayo de payout permanece apagado.
- Pendientes: E2E visual/capturas claro-oscuro-móvil (no había navegador disponible), dispositivos/PWA reales y validación con cuentas sandbox de los proveedores antes de habilitar operación externa. Las migraciones todavía deben aplicarse a la base de la instalación.
