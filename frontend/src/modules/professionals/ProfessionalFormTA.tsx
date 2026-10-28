import { Link } from "react-router-dom";
import { ArrowLeft, ImagePlus, Save } from "lucide-react";
import { useAuth } from "@/App";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { BARBER_SPECIALTIES } from "@/constants/enums";
import { ProfessionalAvatarTA } from "@/modules/professionals/ProfessionalPrimitivesTA";
import { useProfessionalForm } from "@/modules/professionals/useProfessionalForm";

// COMPONENT
export const ProfessionalFormTA = ({ id }: { id?: number }) => {
  // COMPOSABLES
  const { user } = useAuth();
  const { form, request } = useProfessionalForm(user?.barber_shop_id, id);
  const cancelPath = id ? `/admin/professionals/${id}` : "/admin/professionals";

  // RENDER
  return (
    <div className="space-y-6 pb-8">
      <ButtonTA
        variant="ghost"
        className="-ml-3"
        nativeButton={false}
        render={<Link to={cancelPath} />}
      >
        <ArrowLeft />
        {id ? "Volver al perfil" : "Volver al equipo"}
      </ButtonTA>
      <ActionHeaderTA
        eyebrow="Profesionales · Configuración"
        title={id ? "Editar profesional" : "Nuevo profesional"}
        description="Completa el perfil y define su comisión. Los campos con * son obligatorios."
      />
      {request.loading ? (
        <StateTA
          title="Cargando perfil"
          description="Estamos recuperando los datos del profesional."
        />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void request.save();
          }}
          className="space-y-6"
        >
          {request.error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {request.error}
            </p>
          )}
          <fieldset
            disabled={request.saving}
            className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
          >
            <div className="space-y-6">
              <PanelTA
                title="Información del profesional"
                description="Estos datos te ayudan a identificar y contactar a tu equipo."
              >
                <div className="grid gap-5 px-5 pb-6 md:grid-cols-2 md:px-6">
                  <label className="space-y-2 text-sm font-medium md:col-span-2">
                    <span>Nombre completo *</span>
                    <InputTA
                      value={form.value.name}
                      onChange={(event) =>
                        form.setField("name", event.target.value)
                      }
                      required
                      maxLength={255}
                      autoComplete="name"
                      placeholder="Ej. María Rodríguez"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    <span>Correo electrónico</span>
                    <InputTA
                      type="email"
                      value={form.value.email}
                      onChange={(event) =>
                        form.setField("email", event.target.value)
                      }
                      maxLength={255}
                      autoComplete="email"
                      placeholder="nombre@correo.com"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    <span>Teléfono</span>
                    <InputTA
                      type="tel"
                      value={form.value.phone}
                      onChange={(event) =>
                        form.setField("phone", event.target.value)
                      }
                      maxLength={50}
                      autoComplete="tel"
                      placeholder="+57 300 000 0000"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium md:col-span-2">
                    <span>Especialidad principal</span>
                    <InputTA
                      list="professional-specialties"
                      value={form.value.specialty}
                      onChange={(event) =>
                        form.setField("specialty", event.target.value)
                      }
                      maxLength={255}
                      placeholder="Selecciona o escribe una especialidad"
                    />
                    <datalist id="professional-specialties">
                      {BARBER_SPECIALTIES.map((specialty) => (
                        <option key={specialty} value={specialty} />
                      ))}
                    </datalist>
                  </label>
                  <label className="space-y-2 text-sm font-medium md:col-span-2">
                    <span>Biografía profesional</span>
                    <textarea
                      className="min-h-32 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      value={form.value.bio}
                      onChange={(event) =>
                        form.setField("bio", event.target.value)
                      }
                      maxLength={5000}
                      placeholder="Experiencia, formación y especialidades del profesional."
                    />
                    <span className="block text-right text-xs font-normal text-muted-foreground">
                      {form.value.bio.length} / 5000
                    </span>
                  </label>
                </div>
              </PanelTA>
              <PanelTA
                title="Condiciones y estado"
                description="Gestiona la comisión y la disponibilidad del perfil."
              >
                <div className="space-y-5 px-5 pb-6 md:px-6">
                  <label className="block max-w-xs space-y-2 text-sm font-medium">
                    <span>Comisión (%) *</span>
                    <InputTA
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      required
                      value={form.value.commission_percentage}
                      onChange={(event) =>
                        form.setField(
                          "commission_percentage",
                          event.target.value,
                        )
                      }
                    />
                    <span className="block text-xs font-normal text-muted-foreground">
                      Porcentaje pactado con el profesional, de 0 a 100.
                    </span>
                  </label>
                  {id && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
                      <input
                        className="mt-1 size-4 accent-primary"
                        type="checkbox"
                        checked={form.value.is_active}
                        onChange={(event) =>
                          form.setField("is_active", event.target.checked)
                        }
                      />
                      <span>
                        <span className="block text-sm font-medium">
                          Profesional activo
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          Desactiva el perfil cuando deje de recibir nuevas
                          reservas. Sus datos permanecen guardados.
                        </span>
                      </span>
                    </label>
                  )}
                </div>
              </PanelTA>
            </div>
            <div className="space-y-4">
              <PanelTA
                title="Foto del perfil"
                description="Una imagen facilita reconocer al profesional."
              >
                <div className="space-y-5 px-6 pb-6">
                  <ProfessionalAvatarTA
                    name={form.value.name}
                    photo={form.value.photo_url}
                    large
                  />
                  <div>
                    <label
                      htmlFor="professional-photo"
                      className="mb-2 flex items-center gap-2 text-sm font-medium"
                    >
                      <ImagePlus className="size-4" />
                      Cargar imagen
                    </label>
                    <InputTA
                      id="professional-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        form.uploadPhoto(event.target.files?.[0])
                      }
                      className="min-h-14 py-2 text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-secondary file:px-2 file:py-1.5 file:text-xs"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      JPG, PNG o WebP. Máximo 2 MB.
                    </p>
                  </div>
                  {request.photoError && (
                    <p role="alert" className="text-xs text-destructive">
                      {request.photoError}
                    </p>
                  )}
                  {form.value.photo_url && (
                    <ButtonTA
                      variant="outline"
                      type="button"
                      onClick={() => form.setField("photo_url", "")}
                    >
                      Quitar foto
                    </ButtonTA>
                  )}
                </div>
              </PanelTA>
              <div className="rounded-xl bg-primary/5 p-5 text-sm leading-relaxed text-muted-foreground">
                El perfil se guarda al finalizar. Podrás consultar su agenda y
                actividad desde la ficha del profesional.
              </div>
            </div>
          </fieldset>
          <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
            <ButtonTA
              variant="outline"
              disabled={request.saving}
              nativeButton={false}
              render={<Link to={cancelPath} />}
            >
              {" "}
              Cancelar
            </ButtonTA>
            <ButtonTA
              type="submit"
              disabled={
                request.saving ||
                Boolean(id && request.error && !form.value.name)
              }
            >
              <Save />
              {request.saving
                ? "Guardando…"
                : id
                  ? "Guardar cambios"
                  : "Crear profesional"}
            </ButtonTA>
          </div>
        </form>
      )}
    </div>
  );
};
