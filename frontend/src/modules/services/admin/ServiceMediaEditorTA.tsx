import { ImagePlus, Trash2 } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import type { ServiceEditorState } from "@/modules/services/admin/types";

// COMPONENT
export const ServiceMediaEditorTA = ({
  editor,
}: {
  editor: ServiceEditorState;
}) => (
  <PanelTA
    title="Imágenes y videos"
    description="Muestra el resultado del servicio. Hasta 12 elementos en la galería."
  >
    <div className="space-y-5 px-5 pb-5 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        {editor.form.value.image_url ? (
          <img
            src={editor.form.value.image_url}
            alt="Portada del servicio"
            className="aspect-[4/3] w-full rounded-xl object-cover"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-border bg-muted/30">
            <ImagePlus className="size-7 text-muted-foreground" />
          </div>
        )}
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="service-cover">
            Portada
          </label>
          <p className="text-xs text-muted-foreground">
            JPG, PNG o WebP. Máximo 8 MB.
          </p>
          <InputTA
            id="service-cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="py-2 text-xs"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void editor.actions.cover(file);
              event.target.value = "";
            }}
          />
          {editor.form.value.image_url && (
            <ButtonTA
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => editor.actions.field("image_url", "")}
            >
              <Trash2 className="size-3.5" />
              Quitar portada
            </ButtonTA>
          )}
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <label htmlFor="service-gallery" className="text-sm font-medium">
          Galería · {editor.form.value.media_gallery.length}/12
        </label>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">
          Imágenes hasta 8 MB; videos MP4 o WebM hasta 2 MB.
        </p>
        <InputTA
          id="service-gallery"
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          multiple
          className="py-2 text-xs"
          disabled={editor.form.value.media_gallery.length >= 12}
          onChange={(event) => {
            void editor.actions.gallery(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>
      {editor.media.state.pending && (
        <p className="text-sm text-primary" role="status">
          Procesando contenido multimedia…
        </p>
      )}
      {editor.media.state.error && (
        <p className="text-sm text-destructive" role="alert">
          {editor.media.state.error}
        </p>
      )}
      {!!editor.form.value.media_gallery.length && (
        <div className="grid gap-4 sm:grid-cols-2">
          {editor.form.value.media_gallery.map((item, index) => (
            <div
              key={index}
              className="space-y-2 rounded-xl border border-border p-3"
            >
              {item.type === "video" ? (
                <video
                  src={item.url}
                  controls
                  preload="metadata"
                  className="aspect-video w-full rounded-lg bg-muted object-contain"
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.caption || `Imagen ${index + 1}`}
                  loading="lazy"
                  className="aspect-video w-full rounded-lg object-cover"
                />
              )}
              <InputTA
                aria-label={`Descripción del elemento ${index + 1}`}
                placeholder="Descripción de la imagen o video"
                value={item.caption ?? ""}
                maxLength={300}
                onChange={(event) =>
                  editor.actions.caption(index, event.target.value)
                }
              />
              <ButtonTA
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.actions.removeMedia(index)}
                aria-label={`Quitar elemento ${index + 1}`}
              >
                <Trash2 className="size-3.5" />
                Quitar
              </ButtonTA>
            </div>
          ))}
        </div>
      )}
    </div>
  </PanelTA>
);
