import { Link } from "react-router-dom";
import { ArrowLeft, Check, Mail, Save, UserRound } from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { useClientEditor } from "@/modules/clients/composables/useClientEditor";
import { clientInitials } from "@/modules/clients/utils";
import type { ClientRecord } from "@/modules/clients/types";

// TYPES
interface ClientFormProps {
  businessId?: number | null;
  client?: ClientRecord;
}

// COMPONENT
export const ClientFormTA = ({ businessId, client }: ClientFormProps) => {
  const { form } = useClientEditor(businessId, client);
  const back = client ? `/admin/clients/${client.id}` : "/admin/clients";

  return (
    <div className="space-y-6 pb-8">
      <ButtonTA
        variant="ghost"
        className="-ml-3"
        render={<Link to={back} />}
        nativeButton={false}
      >
        <ArrowLeft className="size-4" />{" "}
        {client ? "Volver al perfil" : "Volver a clientes"}
      </ButtonTA>
      <ActionHeaderTA
        eyebrow="Directorio / Clientes"
        title={client ? "Editar cliente" : "Nuevo cliente"}
        description={
          client
            ? "Mantén su información al día para ofrecer una atención más personal."
            : "El primer paso para una relación que dure. Completa sus datos de contacto."
        }
      />
      <form
        onSubmit={form.submit}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
      >
        <PanelTA
          title="Información del cliente"
          description="Los campos con * son obligatorios."
        >
          <fieldset
            disabled={form.saving}
            className="space-y-5 px-5 pb-6 md:px-6"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="client-name">
                Nombre completo *
              </label>
              <InputTA
                id="client-name"
                name="name"
                autoComplete="name"
                autoFocus
                required
                maxLength={255}
                placeholder="Ej. Valentina Martínez"
                value={form.values.name}
                onChange={(event) => form.change("name", event.target.value)}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="client-email">
                  Correo electrónico *
                </label>
                <InputTA
                  id="client-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={255}
                  placeholder="nombre@correo.com"
                  value={form.values.email}
                  onChange={(event) => form.change("email", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Usa un correo único para este cliente.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="client-phone">
                  Teléfono
                </label>
                <InputTA
                  id="client-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={50}
                  placeholder="Ej. +57 300 123 4567"
                  value={form.values.phone}
                  onChange={(event) => form.change("phone", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Incluye el indicativo del país.
                </p>
              </div>
            </div>
            <div className="border-t border-border pt-5">
              <label className="text-sm font-medium" htmlFor="client-notes">
                Notas para el equipo
              </label>
              <p
                id="client-notes-help"
                className="mb-3 mt-1 text-xs text-muted-foreground"
              >
                Preferencias de atención o detalles útiles para su próxima
                visita.
              </p>
              <textarea
                id="client-notes"
                name="notes"
                aria-describedby="client-notes-help"
                className="min-h-32 w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                maxLength={2000}
                placeholder="Ej. Prefiere citas por la mañana…"
                value={form.values.notes}
                onChange={(event) => form.change("notes", event.target.value)}
              />
              <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
                {form.values.notes.length} / 2.000
              </p>
            </div>
            {form.error && (
              <p
                className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {form.error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
              <ButtonTA
                variant="outline"
                render={<Link to={back} />}
                nativeButton={false}
              >
                Cancelar
              </ButtonTA>
              <ButtonTA type="submit" disabled={form.saving || !businessId}>
                <Save className="size-4" />
                {form.saving
                  ? "Guardando…"
                  : client
                    ? "Guardar cambios"
                    : "Crear cliente"}
              </ButtonTA>
            </div>
          </fieldset>
        </PanelTA>
        <aside className="space-y-4">
          <PanelTA
            title="Vista del perfil"
            description="Así reconocerás a tu cliente en el directorio."
          >
            <div className="px-5 pb-6 md:px-6">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 font-semibold text-primary">
                  {form.values.name.trim() ? (
                    clientInitials(form.values.name)
                  ) : (
                    <UserRound className="size-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {form.values.name || "Nombre del cliente"}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {form.values.email || "Correo electrónico"}
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3 border-t border-border pt-4 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Check className="size-3.5 text-primary" /> Perfil e historial
                  en un mismo lugar
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="size-3.5 text-primary" /> Acceso directo a
                  sus datos de contacto
                </p>
              </div>
            </div>
          </PanelTA>
        </aside>
      </form>
    </div>
  );
};
