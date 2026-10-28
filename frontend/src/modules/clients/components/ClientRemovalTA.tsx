import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, Trash2 } from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { useClientRemoval } from "@/modules/clients/composables/useClientRemoval";
import { clientInitials } from "@/modules/clients/utils";
import type { ClientRecord } from "@/modules/clients/types";

// TYPES
interface ClientRemovalProps {
  client: ClientRecord;
}

// COMPONENT
export const ClientRemovalTA = ({ client }: ClientRemovalProps) => {
  const { removal } = useClientRemoval(client.id);
  return (
    <div className="max-w-3xl space-y-6 pb-8">
      <ButtonTA
        variant="ghost"
        className="-ml-3"
        render={<Link to={`/admin/clients/${client.id}`} />}
        nativeButton={false}
      >
        <ArrowLeft className="size-4" /> Volver al perfil
      </ButtonTA>
      <ActionHeaderTA
        eyebrow="Directorio / Eliminar cliente"
        title="Eliminar cliente"
        description="Revisa el perfil seleccionado antes de continuar."
      />
      <PanelTA
        title="Este cliente dejará de aparecer en el directorio"
        description="Podrás seguir gestionando las reservas existentes desde el calendario."
      >
        <div className="space-y-5 px-5 pb-6 md:px-6">
          <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 font-semibold text-primary">
              {clientInitials(client.name)}
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{client.name}</p>
              <p className="break-all text-sm text-muted-foreground">
                {client.email || client.phone || "Sin datos de contacto"}
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
            <p className="text-sm leading-relaxed">
              Eliminar el perfil no cancela sus reservas. Si necesitas
              cancelarlas, revísalas primero en el calendario.
            </p>
          </div>
          {removal.error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
            >
              {removal.error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
            <ButtonTA
              variant="outline"
              render={<Link to={`/admin/clients/${client.id}`} />}
              nativeButton={false}
            >
              Conservar cliente
            </ButtonTA>
            <ButtonTA
              variant="destructive"
              disabled={removal.saving}
              onClick={removal.submit}
            >
              <Trash2 className="size-4" />
              {removal.saving ? "Eliminando…" : "Eliminar cliente"}
            </ButtonTA>
          </div>
        </div>
      </PanelTA>
    </div>
  );
};
