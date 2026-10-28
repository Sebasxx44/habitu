import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { usePushConnection } from "@/modules/connections/composables/usePushConnection";

// COMPONENT
export const PushConnectionTA = () => {
  // COMPOSABLES
  const { i18n } = useTranslation();
  const { data, preferences, actions } = usePushConnection();
  // COMPUTED
  const english = i18n.language.startsWith("en");
  const labels = english
    ? {
        unsupported: "Not supported in this browser or connection",
        denied: "Permission blocked in browser settings",
        default: "Permission not requested",
        granted: "Browser permission granted",
      }
    : {
        unsupported: "No compatible en este navegador o conexión",
        denied: "Permiso bloqueado en ajustes del navegador",
        default: "Permiso aún no solicitado",
        granted: "Permiso del navegador concedido",
      };
  // RENDER
  return (
    <PanelTA
      title={
        english ? "Device notifications" : "Notificaciones del dispositivo"
      }
      description={
        english
          ? "Choose what you receive. Browser permission is requested only after enabling notifications."
          : "Elige qué deseas recibir. El permiso del navegador se solicita solo al activar las notificaciones."
      }
    >
      <div className="space-y-4 px-5 pb-5 md:px-6">
        <p role="status" className="text-sm">
          {labels[data.permission]}
        </p>
        <p className="text-xs text-muted-foreground">
          {data.status?.configured
            ? data.registeredHere
              ? english
                ? "This device is registered."
                : "Este dispositivo está registrado."
              : english
                ? "This device is not registered."
                : "Este dispositivo no está registrado."
            : english
              ? "Push delivery is unavailable: provider configuration is incomplete."
              : "El envío push no está disponible: falta configurar el proveedor."}
        </p>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={preferences.transactional}
            onChange={(event) =>
              preferences.setTransactional(event.target.checked)
            }
          />
          {english
            ? "Booking and service updates"
            : "Novedades de reservas y servicios"}
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={preferences.promotions}
            onChange={(event) =>
              preferences.setPromotions(event.target.checked)
            }
          />
          {english
            ? "Promotions (also requires marketing consent)"
            : "Promociones (requiere además consentimiento comercial)"}
        </label>
        <div className="flex flex-wrap gap-2">
          <ButtonTA
            onClick={() => void actions.enable()}
            disabled={
              data.busy ||
              !data.status?.configured ||
              data.permission === "unsupported" ||
              data.permission === "denied"
            }
          >
            {data.registeredHere
              ? english
                ? "Save preferences"
                : "Guardar preferencias"
              : english
                ? "Enable on this device"
                : "Activar en este dispositivo"}
          </ButtonTA>
          {data.registeredHere && (
            <ButtonTA
              variant="outline"
              disabled={data.busy}
              onClick={() => void actions.disable()}
            >
              {english
                ? "Disable on this device"
                : "Desactivar en este dispositivo"}
            </ButtonTA>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {english
            ? "Delivery depends on the browser and connection. Your in-app inbox remains available."
            : "La entrega depende del navegador y la conexión. Tu bandeja dentro de la aplicación sigue disponible."}
        </p>
        {data.error && (
          <p role="alert" className="text-sm text-destructive">
            {english
              ? "Could not update notifications. Check browser permissions and try again."
              : "No se pudieron actualizar las notificaciones. Revisa los permisos y vuelve a intentar."}
          </p>
        )}
      </div>
    </PanelTA>
  );
};
