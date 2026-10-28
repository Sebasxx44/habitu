import { ArrowLeft, Pause, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { useServiceActions } from "@/modules/services/admin/useServiceActions";
import { formatCurrency } from "@/i18n/formatters";
import type { Service } from "@/types/models";

// COMPONENT
export const ServiceDeleteTA = ({
  service,
  refresh,
}: {
  service: Service;
  refresh: () => Promise<void>;
}) => {
  const navigate = useNavigate();
  const { status, actions } = useServiceActions(service, refresh);
  return (
    <div className="max-w-3xl space-y-6 pb-10">
      <ButtonTA
        variant="ghost"
        className="-ml-3"
        disabled={status.pending}
        onClick={() => navigate(`/admin/services/${service.id}`)}
      >
        <ArrowLeft className="size-4" />
        Volver a la ficha
      </ButtonTA>
      <ActionHeaderTA
        eyebrow="Catálogo · Servicios"
        title="Eliminar servicio"
        description="Revisa el servicio antes de confirmar su eliminación del catálogo."
      />
      {status.error && (
        <StateTA
          error
          title="No se pudo eliminar el servicio"
          description={status.error}
        />
      )}
      <PanelTA
        title={service.name}
        description={`${service.category || "General"} · ${formatCurrency(service.price)} · ${service.duration} min`}
      >
        <div className="space-y-5 px-5 pb-6 sm:px-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            El servicio dejará de estar disponible en tu catálogo. Esta acción
            no se puede deshacer desde esta pantalla.
          </p>
          {service.is_active !== false && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <h2 className="text-sm font-semibold">
                ¿Solo necesitas dejar de recibir reservas?
              </h2>
              <p className="mb-3 mt-1 text-xs leading-relaxed text-muted-foreground">
                Puedes desactivarlo y conservar su ficha para activarlo más
                adelante.
              </p>
              <ButtonTA
                variant="outline"
                disabled={status.pending}
                onClick={() => void actions.toggle()}
              >
                <Pause className="size-4" />
                Desactivar servicio
              </ButtonTA>
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
            <ButtonTA
              variant="outline"
              disabled={status.pending}
              onClick={() => navigate(`/admin/services/${service.id}`)}
            >
              Cancelar
            </ButtonTA>
            <ButtonTA
              variant="destructive"
              disabled={status.pending}
              onClick={() => void actions.remove()}
            >
              <Trash2 className="size-4" />
              {status.pending ? "Procesando…" : "Eliminar servicio"}
            </ButtonTA>
          </div>
        </div>
      </PanelTA>
    </div>
  );
};
