import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { useAdDelivery } from "@/modules/ads/composables/useAdDelivery";

// COMPONENT
export const SponsoredBannerTA = ({ placement }: { placement: string }) => {
  // COMPOSABLES
  const { t } = useTranslation("ads");
  const { display, actions } = useAdDelivery(placement);
  const current = display.ads[display.index];
  if (display.loading)
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
  if (!current) return null;
  return (
    <div
      ref={display.container}
      className="relative overflow-hidden rounded-2xl border border-border bg-card"
    >
      <ButtonTA
        variant="ghost"
        className="relative block h-44 w-full overflow-hidden rounded-none p-0 text-left"
        aria-label={t("open", { title: current.title })}
        onClick={() => void actions.open(current)}
      >
        {current.image_url ? (
          <img
            className="h-full w-full object-cover"
            src={current.image_url}
            alt=""
          />
        ) : (
          <div className="h-full bg-primary" />
        )}
        {current.image_url && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/95 px-2.5 py-1 text-[11px] font-semibold text-foreground">
          {t("sponsored")}
        </span>
        <div className="absolute bottom-4 left-4 right-4 whitespace-normal text-white">
          <p className="text-base font-semibold">{current.title}</p>
          {current.description && (
            <p className="mt-1 line-clamp-2 text-xs text-white/85">
              {current.description}
            </p>
          )}
        </div>
      </ButtonTA>
      {display.ads.length > 1 && (
        <div className="flex justify-center gap-2 p-2">
          {display.ads.map((ad, index) => (
            <ButtonTA
              key={ad.id}
              variant={index === display.index ? "default" : "outline"}
              size="sm"
              aria-label={t("select", { number: index + 1 })}
              aria-pressed={index === display.index}
              onClick={() => actions.select(index)}
            >
              {index + 1}
            </ButtonTA>
          ))}
        </div>
      )}
    </div>
  );
};
