import { Building2, Clock, MapPin, Save } from "lucide-react";
import { PremiumModal } from "@/components/premium/PremiumModal";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { branchDays } from "@/modules/branches/composables/useBranchEditor";
import type { BranchEditorState } from "@/modules/branches/types";

// COMPONENT
export const BranchEditorTA = ({
  editor,
}: {
  editor: BranchEditorState["editor"];
}) => (
  <PremiumModal
    open={editor.open}
    onOpenChange={(open) => {
      if (!open) editor.close();
    }}
    title={editor.branch ? "Editar sucursal" : "Nueva sucursal"}
    maxWidth="sm:max-w-3xl"
  >
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void editor.save();
      }}
    >
      <fieldset disabled={editor.saving} className="space-y-4">
        <legend className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Building2 className="size-4 text-primary" />
          Información de la sede
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            Nombre de la sucursal
            <InputTA
              required
              maxLength={255}
              value={editor.form.name}
              onChange={(event) => editor.update("name", event.target.value)}
              placeholder="Ej. Sede Centro"
            />
          </label>
          <label className="space-y-2 text-sm">
            Dirección
            <InputTA
              required
              maxLength={500}
              value={editor.form.address}
              onChange={(event) => editor.update("address", event.target.value)}
              placeholder="Calle, número y referencia"
            />
          </label>
          <label className="space-y-2 text-sm">
            Teléfono
            <InputTA
              type="tel"
              maxLength={50}
              value={editor.form.phone}
              onChange={(event) => editor.update("phone", event.target.value)}
              placeholder="+57 300 000 0000"
            />
          </label>
          <label className="space-y-2 text-sm">
            Correo de la sede
            <InputTA
              type="email"
              maxLength={255}
              value={editor.form.email}
              onChange={(event) => editor.update("email", event.target.value)}
              placeholder="sede@negocio.com"
            />
          </label>
        </div>
        <details className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            <MapPin className="mr-2 inline size-4" />
            Ubicación en el mapa
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Las coordenadas ayudan a tus clientes a encontrar la sede correcta.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              Latitud
              <InputTA
                type="number"
                step="any"
                min={-90}
                max={90}
                value={editor.form.lat}
                onChange={(event) => editor.update("lat", event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm">
              Longitud
              <InputTA
                type="number"
                step="any"
                min={-180}
                max={180}
                value={editor.form.lng}
                onChange={(event) => editor.update("lng", event.target.value)}
              />
            </label>
          </div>
        </details>
        <div className="flex flex-wrap gap-5 rounded-xl bg-secondary/40 p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editor.form.is_active}
              onChange={(event) =>
                editor.update("is_active", event.target.checked)
              }
              className="size-4 accent-primary"
            />
            Disponible para reservas
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editor.form.is_main_branch}
              onChange={(event) =>
                editor.update("is_main_branch", event.target.checked)
              }
              className="size-4 accent-primary"
            />
            Sede principal
          </label>
        </div>
        {editor.branch &&
          !editor.form.is_active &&
          editor.branch.metrics.upcoming > 0 && (
            <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              Esta sede tiene {editor.branch.metrics.upcoming} citas futuras.
              Desactivarla evita nuevas reservas; gestiona las existentes desde
              la agenda.
            </p>
          )}
      </fieldset>
      <fieldset disabled={editor.saving} className="space-y-2">
        <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Clock className="size-4 text-primary" />
          Horario semanal
        </legend>
        <p className="pb-2 text-xs text-muted-foreground">
          Define cuándo se pueden reservar servicios. El equipo y los recursos
          conservan su propia disponibilidad.
        </p>
        {editor.form.schedules.map((row) => (
          <div
            key={row.day}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
          >
            <label className="flex w-32 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={!row.is_closed}
                onChange={(event) =>
                  editor.schedule(row.day, { is_closed: !event.target.checked })
                }
              />
              {branchDays[row.day]}
            </label>
            {row.is_closed ? (
              <span className="text-xs text-muted-foreground">Cerrado</span>
            ) : (
              <div className="flex items-center gap-2">
                <InputTA
                  aria-label={`Apertura ${branchDays[row.day]}`}
                  type="time"
                  required
                  value={row.open_time}
                  onChange={(event) =>
                    editor.schedule(row.day, { open_time: event.target.value })
                  }
                  className="w-32"
                />
                <span className="text-xs text-muted-foreground">a</span>
                <InputTA
                  aria-label={`Cierre ${branchDays[row.day]}`}
                  type="time"
                  required
                  value={row.close_time}
                  onChange={(event) =>
                    editor.schedule(row.day, { close_time: event.target.value })
                  }
                  className="w-32"
                />
              </div>
            )}
          </div>
        ))}
      </fieldset>
      {editor.error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          {editor.error}
        </p>
      )}
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card py-4">
        <ButtonTA
          type="button"
          variant="outline"
          disabled={editor.saving}
          onClick={editor.close}
        >
          Cancelar
        </ButtonTA>
        <ButtonTA type="submit" disabled={editor.saving}>
          <Save className="size-4" />
          {editor.saving ? "Guardando…" : "Guardar sucursal"}
        </ButtonTA>
      </div>
    </form>
  </PremiumModal>
);
