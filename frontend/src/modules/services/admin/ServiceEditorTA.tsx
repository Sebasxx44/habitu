import { ArrowLeft, Check, Clock, Save, Scissors } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { BookingPolicyFieldsTA } from "@/modules/services/BookingPolicyFieldsTA";
import { ServiceMediaEditorTA } from "@/modules/services/admin/ServiceMediaEditorTA";
import { useServiceEditor } from "@/modules/services/admin/useServiceEditor";
import { formatCurrency } from "@/i18n/formatters";
import type { Resource, Service } from "@/types/models";

// COMPONENT
export const ServiceEditorTA = ({
  source,
  businessId,
  resources,
  duplicate = false,
  settingsOnly = false,
  categories,
  onSaved,
}: {
  source?: Service;
  businessId: number;
  resources: Resource[];
  duplicate?: boolean;
  settingsOnly?: boolean;
  categories: string[];
  onSaved: (service: Service) => void;
}) => {
  const editor = useServiceEditor(
    businessId,
    onSaved,
    source,
    duplicate,
    settingsOnly,
  );
  const navigate = useNavigate();
  const { value, saving, error, dirty } = editor.form;
  const busy = saving || editor.media.state.pending;
  const back =
    source && !duplicate ? `/admin/services/${source.id}` : "/admin/services";
  return (
    <div className="space-y-6 pb-10">
      <ButtonTA
        variant="ghost"
        onClick={() => navigate(back)}
        disabled={busy}
        className="-ml-3"
      >
        <ArrowLeft className="size-4" />
        {source && !duplicate ? "Volver a la ficha" : "Volver a servicios"}
      </ButtonTA>
      <ActionHeaderTA
        eyebrow="Catálogo · Servicios"
        title={
          settingsOnly
            ? "Configurar reservas"
            : duplicate
              ? "Duplicar servicio"
              : source
                ? "Editar servicio"
                : "Nuevo servicio"
        }
        description={
          settingsOnly
            ? `Define cómo se reserva ${source?.name ?? "este servicio"}.`
            : "Toda la información que tus clientes necesitan para reservar con confianza."
        }
        actions={
          <>
            <ButtonTA
              variant="outline"
              disabled={busy}
              onClick={() => navigate(back)}
            >
              Cancelar
            </ButtonTA>
            <ButtonTA type="submit" form="service-editor" disabled={busy}>
              <Save className="size-4" />
              {saving
                ? "Guardando…"
                : settingsOnly
                  ? "Guardar configuración"
                  : source && !duplicate
                    ? "Guardar cambios"
                    : "Crear servicio"}
            </ButtonTA>
          </>
        }
      />
      {error && (
        <StateTA error title="Revisa el servicio" description={error} />
      )}
      <form
        id="service-editor"
        onSubmit={(event) => {
          event.preventDefault();
          void editor.actions.save();
        }}
      >
        <fieldset
          disabled={busy}
          className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"
        >
          <div className="min-w-0 space-y-6">
            {!settingsOnly && (
              <PanelTA
                title="Información del servicio"
                description="Nombre, precio y duración que aparecerán en tu catálogo."
              >
                <div className="space-y-5 px-5 pb-6 sm:px-6">
                  <label className="block text-sm font-medium">
                    Nombre del servicio{" "}
                    <span className="text-destructive">*</span>
                    <InputTA
                      autoFocus
                      className="mt-2"
                      value={value.name}
                      onChange={(event) =>
                        editor.actions.field("name", event.target.value)
                      }
                      required
                      maxLength={255}
                      placeholder="Ej. Corte y asesoría de estilo"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Descripción
                    <textarea
                      value={value.description}
                      onChange={(event) =>
                        editor.actions.field("description", event.target.value)
                      }
                      maxLength={5000}
                      rows={4}
                      placeholder="Explica qué incluye, para quién es y cómo prepararse."
                      className="mt-2 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm font-normal focus-visible:outline focus-visible:outline-primary"
                    />
                    <span className="mt-1 block text-right text-xs font-normal text-muted-foreground">
                      {value.description.length}/5.000
                    </span>
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium">
                      Precio base (COP){" "}
                      <span className="text-destructive">*</span>
                      <InputTA
                        className="mt-2"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        required
                        value={value.price}
                        onChange={(event) =>
                          editor.actions.field("price", event.target.value)
                        }
                        placeholder="0"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Duración base (minutos){" "}
                      <span className="text-destructive">*</span>
                      <InputTA
                        className="mt-2"
                        type="number"
                        min="1"
                        max="1440"
                        step="1"
                        required
                        value={value.duration}
                        onChange={(event) =>
                          editor.actions.field("duration", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label className="block text-sm font-medium">
                    Categoría
                    <InputTA
                      className="mt-2"
                      list="service-categories"
                      maxLength={120}
                      value={value.category}
                      onChange={(event) =>
                        editor.actions.field("category", event.target.value)
                      }
                      placeholder="General"
                    />
                    <datalist id="service-categories">
                      {categories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                    <span className="mt-2 block text-xs font-normal text-muted-foreground">
                      Elige una existente o escribe una nueva.
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
                    <input
                      type="checkbox"
                      checked={value.is_active}
                      onChange={(event) =>
                        editor.actions.field("is_active", event.target.checked)
                      }
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <span className="text-sm font-medium">
                      Servicio activo
                      <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">
                        Actívalo para permitir nuevas reservas. Puedes
                        mantenerlo inactivo mientras preparas su contenido.
                      </span>
                    </span>
                  </label>
                </div>
              </PanelTA>
            )}
            <BookingPolicyFieldsTA
              policy={editor.booking}
              resources={resources}
              disabled={busy}
            />
            {!settingsOnly && <ServiceMediaEditorTA editor={editor} />}
          </div>
          <aside className="space-y-4 xl:sticky xl:top-6">
            <PanelTA
              title={settingsOnly ? "Servicio" : "Vista previa"}
              description={
                settingsOnly
                  ? "Las reglas se aplican a nuevas reservas."
                  : "Así se presenta la información principal."
              }
            >
              <div className="space-y-4 px-5 pb-5 sm:px-6">
                {value.image_url ? (
                  <img
                    src={value.image_url}
                    alt="Portada"
                    className="aspect-[4/3] w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="grid aspect-[4/3] place-items-center rounded-xl bg-primary/10 text-primary">
                    <Scissors className="size-9" />
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">
                    {value.category || "General"}
                  </p>
                  <h2 className="mt-1 break-words text-lg font-semibold">
                    {value.name || "Nombre del servicio"}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {value.description ||
                      "La descripción de tu servicio aparecerá aquí."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                  <span className="font-semibold">
                    {value.price !== "" && Number.isFinite(Number(value.price))
                      ? formatCurrency(Number(value.price))
                      : "Precio por definir"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    {value.duration || "—"} min
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check className="size-3.5" />
                  {value.is_active
                    ? "Activo para reservas"
                    : "Inactivo para reservas"}
                </p>
              </div>
            </PanelTA>
            <p
              className="px-1 text-xs leading-relaxed text-muted-foreground"
              aria-live="polite"
            >
              {dirty
                ? "Tienes cambios sin guardar. Usa Guardar para aplicarlos."
                : duplicate
                  ? "Esta copia se creará como un servicio nuevo e inactivo. Revisa sus datos antes de guardarla."
                  : "Los cambios se aplican al guardar el formulario."}
            </p>
          </aside>
        </fieldset>
      </form>
    </div>
  );
};
