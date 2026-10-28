import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { useCalendarConnection } from "@/modules/connections/composables/useCalendarConnection";

// COMPONENT
export const CalendarConnectionTA = () => {
  // COMPOSABLES
  const { i18n } = useTranslation();
  const { data, selection, actions } = useCalendarConnection();
  // COMPUTED
  const english = i18n.language.startsWith("en");
  // RENDER
  return (
    <PanelTA
      title="Google Calendar"
      description={
        english
          ? "Import private busy intervals to prevent conflicts. Your existing bookings are never moved automatically."
          : "Importa intervalos ocupados privados para evitar conflictos. Tus reservas existentes nunca se mueven automáticamente."
      }
      action={
        <ButtonTA
          variant="ghost"
          onClick={() => void actions.refresh()}
          disabled={data.loading}
        >
          {english ? "Refresh" : "Actualizar"}
        </ButtonTA>
      }
    >
      <div className="space-y-4 px-5 pb-5 md:px-6">
        {data.professionals.length > 0 && (
          <label className="block text-sm">
            {english ? "Professional" : "Profesional"}
            <select
              className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3"
              value={selection.professionalId ?? ""}
              onChange={(event) =>
                selection.setProfessionalId(Number(event.target.value))
              }
            >
              {data.professionals.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <p role="status" className="text-sm">
          {data.loading
            ? english
              ? "Loading…"
              : "Cargando…"
            : data.status?.configured
              ? data.status.connected
                ? english
                  ? "Connected"
                  : "Conectado"
                : english
                  ? "Not connected"
                  : "Sin conectar"
              : english
                ? "Unavailable: Google Calendar credentials are not configured."
                : "No disponible: faltan credenciales de Google Calendar."}
        </p>
        {data.status?.connected && (
          <dl className="space-y-2 text-xs text-muted-foreground">
            <div>
              <dt>
                {english
                  ? "Last successful import"
                  : "Última importación correcta"}
              </dt>
              <dd>
                {data.status.last_synced_at
                  ? new Date(data.status.last_synced_at).toLocaleString(
                      i18n.language,
                    )
                  : english
                    ? "Not synced yet"
                    : "Aún sin sincronizar"}
              </dd>
            </div>
            <div>
              <dt>{english ? "Busy intervals" : "Intervalos ocupados"}</dt>
              <dd>{data.status.busy_count}</dd>
            </div>
            <div>
              <dt>{english ? "Live update channel" : "Canal de cambios"}</dt>
              <dd>
                {data.status.channel_expires_at
                  ? `${english ? "Expires" : "Vence"}: ${new Date(data.status.channel_expires_at).toLocaleString(i18n.language)}`
                  : english
                    ? "Periodic and manual sync"
                    : "Sincronización periódica y manual"}
              </dd>
            </div>
          </dl>
        )}
        <div className="flex flex-wrap gap-2">
          {data.status?.connected ? (
            <>
              <ButtonTA
                onClick={() => void actions.sync()}
                disabled={data.busy}
              >
                {english
                  ? "Import busy intervals"
                  : "Importar horarios ocupados"}
              </ButtonTA>
              <ButtonTA
                variant="outline"
                onClick={() => void actions.exportAppointments()}
                disabled={data.busy}
              >
                {english
                  ? "Export my upcoming bookings"
                  : "Exportar mis próximas reservas"}
              </ButtonTA>
              <ButtonTA
                variant="outline"
                onClick={() => void actions.disconnect()}
                disabled={data.busy}
              >
                {english ? "Disconnect" : "Desconectar"}
              </ButtonTA>
            </>
          ) : (
            <ButtonTA
              onClick={() => void actions.connect()}
              disabled={data.busy || !data.status?.configured}
            >
              {english ? "Connect with Google" : "Conectar con Google"}
            </ButtonTA>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {english
            ? "Imports store only start/end times, never event titles or attendees. Export updates habitu-created events only. Conflicts remain visible for review."
            : "La importación guarda solo inicio y fin, nunca títulos ni asistentes. La exportación actualiza únicamente eventos creados por habitu. Los conflictos requieren revisión."}
        </p>
        {(data.error || data.status?.sync_error) && (
          <p role="alert" className="text-sm text-destructive">
            {english
              ? "Sync failed. The last successful import remains in place; retry or reconnect."
              : "Falló la sincronización. Se conserva la última importación correcta; reintenta o vuelve a conectar."}
          </p>
        )}
      </div>
    </PanelTA>
  );
};
