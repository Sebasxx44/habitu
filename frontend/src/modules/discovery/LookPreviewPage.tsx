import { Camera, Heart, ImagePlus, Save, UserRound } from "lucide-react";
import { useAuth } from "@/App";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { usePreviewCamera } from "@/modules/discovery/composables/usePreviewCamera";
import { useSavedLook } from "@/modules/discovery/composables/useSavedLook";
import { previewStyles } from "@/modules/discovery/previewStyles";
import { cn } from "@/lib/utils";

// COMPONENT
export const LookPreviewPage = () => {
  const { user } = useAuth();
  const { media, actions: camera } = usePreviewCamera();
  const { look, actions } = useSavedLook(user?.id);
  const hasImage = media.active || !!media.photo;
  const controls = [
    { key: "scale", label: "Tamaño", min: 0.4, max: 2, step: 0.05 },
    { key: "x", label: "Posición horizontal", min: -40, max: 40, step: 1 },
    { key: "y", label: "Posición vertical", min: -40, max: 40, step: 1 },
    { key: "opacity", label: "Opacidad", min: 0.1, max: 1, step: 0.05 },
  ] as const;
  return (
    <div className="page-enter mx-auto max-w-6xl space-y-6">
      <ActionHeaderTA
        eyebrow="Tu próximo estilo"
        title="Prueba. Ajusta. Imagínalo."
        description="Vista previa manual con siluetas de cabello y barba. Ajusta la posición sobre tu foto o cámara para explorar una idea con tu profesional."
        actions={
          <ButtonTA onClick={actions.save}>
            <Save className="size-4" /> Guardar ajustes
          </ButtonTA>
        }
      />
      {(media.error || look.error) && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive"
        >
          {media.error || look.error}
        </p>
      )}
      {look.message && (
        <p
          role="status"
          className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm"
        >
          {look.message}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <PanelTA
          title="Tu espejo"
          description="Silueta orientativa, sin análisis facial ni seguimiento automático."
        >
          <div className="px-5 pb-5">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
              <video
                ref={media.videoRef}
                autoPlay
                muted
                playsInline
                aria-label="Cámara en vivo"
                className={cn(
                  "absolute inset-0 size-full object-cover",
                  !media.active && "invisible",
                )}
              />
              {!media.active && media.photo && (
                <img
                  src={media.photo}
                  alt="Tu foto para probar el estilo"
                  className="absolute inset-0 size-full object-cover"
                />
              )}
              {!hasImage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-muted-foreground">
                  <UserRound className="size-20 opacity-30" />
                  <p className="text-sm">
                    Carga una foto o abre la cámara para empezar.
                  </p>
                </div>
              )}
              {hasImage && (
                <svg
                  viewBox="0 0 100 100"
                  aria-label={`Silueta ${look.active.name}`}
                  className="absolute inset-0 size-full pointer-events-none"
                  style={{
                    transform: `translate(${look.settings.x}%, ${look.settings.y}%) scale(${look.settings.scale})`,
                  }}
                >
                  <path
                    d={look.active.path}
                    fill={look.settings.color}
                    opacity={look.settings.opacity}
                  />
                </svg>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <ButtonTA
                variant="outline"
                disabled={media.starting}
                onClick={media.active ? camera.stop : () => void camera.start()}
              >
                <Camera className="size-4" />{" "}
                {media.starting
                  ? "Abriendo cámara…"
                  : media.active
                    ? "Cerrar cámara"
                    : "Abrir cámara"}
              </ButtonTA>
              <label className="relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-input bg-background px-4 text-sm font-medium focus-within:outline focus-within:outline-2 focus-within:outline-primary">
                <ImagePlus className="size-4" /> Cargar foto
                <input
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Cargar foto"
                  onChange={(event) => {
                    camera.upload(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              La foto permanece en esta sesión. Los favoritos y ajustes se
              guardan en este navegador; no se envían a un servidor.
            </p>
          </div>
        </PanelTA>
        <div className="space-y-6">
          <PanelTA
            title="Elige una silueta"
            description="Las formas son ilustraciones para comparar estilos."
          >
            <div className="space-y-2 px-5 pb-5">
              {previewStyles.map((style) => (
                <div
                  key={style.id}
                  className={cn(
                    "flex gap-2 rounded-xl border p-3",
                    look.settings.style === style.id
                      ? "border-primary bg-primary/5"
                      : "border-border",
                  )}
                >
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => actions.update("style", style.id)}
                    aria-pressed={look.settings.style === style.id}
                  >
                    <p className="text-sm font-semibold">{style.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {style.description}
                    </p>
                  </button>
                  <ButtonTA
                    variant="ghost"
                    size="icon"
                    aria-label={`${look.favorites.includes(style.id) ? "Quitar de" : "Agregar a"} favoritos ${style.name}`}
                    aria-pressed={look.favorites.includes(style.id)}
                    onClick={() => actions.favorite(style.id)}
                  >
                    <Heart
                      className={cn(
                        "size-4",
                        look.favorites.includes(style.id) &&
                          "fill-primary text-primary",
                      )}
                    />
                  </ButtonTA>
                </div>
              ))}
            </div>
          </PanelTA>
          <PanelTA title="Ajusta a tu foto">
            <div className="space-y-4 px-5 pb-5">
              <label className="flex items-center justify-between gap-4 text-sm font-medium">
                Color
                <input
                  type="color"
                  value={look.settings.color}
                  onChange={(event) =>
                    actions.update("color", event.target.value)
                  }
                  className="h-11 w-16 rounded-lg border border-input bg-background p-1"
                />
              </label>
              {controls.map((control) => (
                <label
                  key={control.key}
                  className="block space-y-2 text-xs font-medium"
                >
                  <span className="flex justify-between gap-4">
                    {control.label}
                    <span className="text-muted-foreground">
                      {look.settings[control.key]}
                    </span>
                  </span>
                  <input
                    className="w-full accent-primary"
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={look.settings[control.key]}
                    onChange={(event) =>
                      actions.update(control.key, Number(event.target.value))
                    }
                  />
                </label>
              ))}
            </div>
          </PanelTA>
        </div>
      </div>
    </div>
  );
};
