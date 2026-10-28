import { brand } from '@/config/brand';
import { useTranslation } from 'react-i18next';
import { AvailabilityPreviewTA } from '@/modules/marketplace/components/AvailabilityPreviewTA';
import { formatCurrency, formatDate, formatNumber, formatTime } from '@/i18n/formatters';
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Heart,
  MapPin,
  Star,
  Clock3,
  Scissors,
  Sparkles,
  Dumbbell,
  Flower2,
  Activity,
  Smile,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { cn } from "@/lib/utils";
import { discoveryBookingLink } from "@/modules/discovery/query";
import type { DiscoveryBusiness } from "@/modules/discovery/searchTypes";

// TYPES
interface BusinessCardProps {
  business: DiscoveryBusiness;
  source?: "marketplace" | "express";
  selected: boolean;
  favorite: boolean;
  busy: boolean;
  onSelect: () => void;
  onFavorite: () => void;
}

// HELPERS
const categoryIcon = (name: string) => {
  const text = name.toLocaleLowerCase("es");
  if (/barb|peluq/.test(text)) return Scissors;
  if (/gym|gimn|deport|entren/.test(text)) return Dumbbell;
  if (/spa|bienestar|masaj/.test(text)) return Flower2;
  if (/fisio|salud/.test(text)) return Activity;
  if (/odont|dental/.test(text)) return Smile;
  return Sparkles;
};

// COMPONENT
export const BusinessCardTA = ({
  business,
  source = "marketplace",
  selected,
  favorite,
  busy,
  onSelect,
  onFavorite,
}: BusinessCardProps) => {
  const { t } = useTranslation('marketplace');
  const { t: ui } = useTranslation('discoveryUi');
  const money = (amount: number) => formatCurrency(amount, business.currency ?? 'COP');
  const [expanded, setExpanded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const image = business.banner_url || business.logo_url;
  const category = business.category?.name || ui("experiences");
  const Icon = categoryIcon(category);
  const slot = business.next_available;
  const slotDay = slot ? formatDate(slot.date, { year: undefined, weekday: 'short' }) : '';
  const address =
    business.main_branch?.address ||
    business.address ||
    business.branches?.[0]?.address;
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      id={`discovery-business-${business.id}`}
      className={cn(
        "surface-card group min-w-0 overflow-hidden rounded-2xl border bg-card shadow-[0_4px_18px_hsl(var(--foreground)/0.04)] transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none",
        selected
          ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]"
          : "border-border/75 hover:border-primary/30 hover:shadow-[var(--shadow-soft)]",
      )}
      onMouseEnter={onSelect}
      onFocus={onSelect}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Link
          to={`/cliente/business/${business.id}`}
          aria-label={ui("viewBusiness", { name: business.name })}
          className="block h-full focus-visible:outline focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-primary"
        >
          {image && !imageFailed ? (
            <img
              src={image}
              alt={business.name}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
            />
          ) : (
            <div className="discovery-card-art flex h-full flex-col justify-between p-6">
              <span className="relative text-[10px] font-semibold uppercase tracking-[0.2em]">
                {brand.name} · {category}
              </span>
              <Icon
                className="absolute bottom-6 right-6 size-16 stroke-[1.1] opacity-70"
                aria-hidden="true"
              />
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={onFavorite}
          disabled={busy}
          aria-pressed={favorite}
          aria-label={ui(favorite ? "removeFavorite" : "saveFavorite", { name: business.name })}
          className={cn("absolute right-3 top-3 grid size-10 place-items-center rounded-full border shadow-sm backdrop-blur-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50", favorite ? "border-primary bg-primary text-primary-foreground" : "border-white/40 bg-black/50 text-white hover:bg-primary")}
        >
          <Heart
            className={cn("size-5", favorite && "fill-white text-white")}
          />
        </button>
        {business.active_promotion && (
          <span className="absolute bottom-3 left-3 max-w-[85%] truncate rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold text-accent-foreground shadow-sm">
            {business.active_promotion.type === "PERCENTAGE"
              ? ui("percentDiscount", { value: formatNumber(Number(business.active_promotion.discount)) })
              : ui("amountDiscount", { value: money(Number(business.active_promotion.discount)) })}
          </span>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {category}
            </p>
            <Link
              to={`/cliente/business/${business.id}`}
              className="line-clamp-2 text-base font-bold tracking-tight hover:text-primary"
            >
              {business.name}
            </Link>
          </div>
          {(business.reviews_count ?? 0) > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
              {formatNumber(Number(business.rating), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              <span className="font-normal text-muted-foreground">
                ({business.reviews_count})
              </span>
            </span>
          )}
        </div>
        <p className="flex min-h-8 items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          <span className="line-clamp-2">
            {address || ui("checkAddress")}
            {business.distance_km != null &&
              ` · ${formatNumber(Number(business.distance_km), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`}
          </span>
        </p>
        <div className="flex min-h-6 flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {(business.service_previews ?? [])
            .slice(0, 2)
            .map((service, index) => (
              <Link
                key={service.id}
                className="underline-offset-4 hover:text-primary hover:underline"
                to={discoveryBookingLink(business, service.id, source)}
              >
                {index > 0 && (
                  <span aria-hidden="true" className="mr-2">
                    ·
                  </span>
                )}
                {service.name}
              </Link>
            ))}
        </div>
        {slot ? (
          <p className="flex items-center gap-1.5 rounded-xl bg-accent/35 px-3 py-2 text-[11px] font-medium text-foreground">
            <Clock3 className="size-3.5" />
            {t('express.availableAt', { date: slotDay, time: formatTime(slot.start_time) })}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {ui("otherDates")}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <div>
            {business.price_from != null ? (
              <>
                <span className="block text-[10px] text-muted-foreground">
                  {ui("servicesFrom")}
                </span>
                <strong className="text-sm">
                  {money(Number(business.price_from))}
                </strong>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                {ui("viewServices")}
              </span>
            )}
          </div>
          <ButtonTA
            render={<Link to={discoveryBookingLink(business, undefined, source)} />}
            nativeButton={false}
            className="gap-2 rounded-xl px-4 text-xs"
          >
            {t('discovery.reserve')} <ArrowUpRight className="size-3.5" />
          </ButtonTA>
        </div>
        {!!business.service_previews?.length && <ButtonTA className="w-full text-xs" variant="ghost" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{t(expanded ? 'discovery.hideTimes' : 'discovery.showTimes')}</ButtonTA>}
        {expanded && <AvailabilityPreviewTA business={business} source={source} />}
      </div>
    </motion.article>
  );
};
