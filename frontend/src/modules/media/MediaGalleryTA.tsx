import { useState } from "react";
import { Images } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PremiumModal } from "@/components/premium/PremiumModal";
import type { GalleryMedia } from "@/modules/media/mediaTypes";

// VALIDATION
export const isPublicMediaUrl = (url: string): boolean =>
  /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]+|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+|data:video\/(mp4|webm);base64,[A-Za-z0-9+/=]+)$/.test(
    url,
  );

// COMPONENT
export const MediaGalleryTA = ({
  items,
  title,
}: {
  items: GalleryMedia[];
  title?: string;
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<GalleryMedia | null>(null);
  const media = items.filter((item) => isPublicMediaUrl(item.url));
  if (!media.length) return null;
  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Images className="size-4" />
        {title ?? t("media.title")}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {media.map((item, index) => (
          <figure key={`${item.url.slice(0, 80)}:${index}`} className="min-w-0">
            <ButtonTA
              variant="ghost"
              className="h-auto w-full overflow-hidden rounded-xl p-0"
              onClick={() => setSelected(item)}
              aria-label={t("media.view", { number: index + 1 })}
            >
              {item.type === "video" ? (
                <video
                  src={item.url}
                  preload="none"
                  className="aspect-square w-full object-cover"
                  aria-label={item.caption || t("media.video")}
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.caption ?? ""}
                  width={480}
                  height={480}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover"
                />
              )}
            </ButtonTA>
            {item.caption && (
              <figcaption className="mt-2 text-xs text-muted-foreground">
                {item.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
      <PremiumModal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.caption || title || t("media.title")}
        maxWidth="sm:max-w-3xl"
      >
        {selected?.type === "video" ? (
          <video
            key={selected.url}
            src={selected.url}
            controls
            preload="metadata"
            className="max-h-[70vh] w-full rounded-xl"
          />
        ) : (
          selected && (
            <img
              src={selected.url}
              alt={selected.caption ?? title ?? ""}
              decoding="async"
              className="max-h-[70vh] w-full rounded-xl object-contain"
            />
          )
        )}
      </PremiumModal>
    </section>
  );
};
