import { brand } from '@/config/brand';
import { useDiscoveryOrigin } from "@/modules/discovery/composables/useDiscoveryOrigin";
import { useTranslation } from 'react-i18next';
import { AvailabilityPreviewTA } from '@/modules/marketplace/components/AvailabilityPreviewTA';
import { formatCurrency, formatDate, formatNumber, formatTime } from '@/i18n/formatters';
import { useId, useState } from "react";
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
  PawPrint,
  PenTool,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { cn } from "@/lib/utils";
import { discoveryBookingLink } from "@/modules/discovery/query";
import type { DiscoveryBusiness } from "@/modules/discovery/searchTypes";
import { isExternalBooking } from "@/modules/businesses/booking";
import { ExternalBookingButtonTA } from "@/modules/businesses/components/ExternalBookingButtonTA";

// TYPES
interface BusinessCardProps {
  business: DiscoveryBusiness;
  source?: "marketplace" | "express";
  selected: boolean;
  favorite: boolean;
  busy: boolean;
  updating?: boolean;
  onSelect: () => void;
  onFavorite: () => void;
}

// HELPERS
const categoryIcon = (name: string) => {
  const text = name.toLocaleLowerCase("es");
  if (/veterin|mascot/.test(text)) return PawPrint;
  if (/tattoo|tatuaj/.test(text)) return PenTool;
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
  updating = false,
  onSelect,
  onFavorite,
}: BusinessCardProps) => {
  const { navigation } = useDiscoveryOrigin();
  const { t } = useTranslation('marketplace');
  const { t: ui } = useTranslation('discoveryUi');
  const money = (amount: number) => formatCurrency(amount, business.currency ?? 'COP');
  const [expanded, setExpanded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const headingId = useId();
  const availabilityId = useId();
  const image = business.banner_url || business.logo_url;
  const category = business.category?.name || ui("experiences");
  const Icon = categoryIcon(category);
  const external = isExternalBooking(business);
  const slot = external || updating ? null : business.next_available;
  const slotDay = slot ? formatDate(slot.date, { year: undefined, weekday: 'short' }) : '';
  const address =
    business.main_branch?.address ||
    business.address ||
    business.branches?.[0]?.address;
  return (
    <article
      id={`discovery-business-${business.id}`}
      aria-labelledby={headingId}
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
          state={navigation.state}
          to={`/cliente/business/${business.id}`}
          aria-label={ui("viewBusiness", { name: business.name })}
          className="block h-full focus-visible:outline focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-primary"
        >
          {image && !imageFailed ? (
            <img
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              width={800}
              height={500}
              onError={() => setImageFailed(true)}
              className="size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full flex-col justify-between bg-secondary p-6 text-secondary-foreground">
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
        <ButtonTA
          type="button"
          size="icon"
          variant="outline"
          onClick={onFavorite}
          disabled={busy}
          aria-pressed={favorite}
          aria-label={ui(favorite ? "removeFavorite" : "saveFavorite", { name: business.name })}
          className={cn("absolute right-3 top-3 size-11 min-h-11 min-w-11 rounded-full border shadow-sm", favorite ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary")}
        >
          <Heart
            className={cn("size-5", favorite && "fill-current")}
            aria-hidden="true"
          />
        </ButtonTA>
        {!external && business.active_promotion && (
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
            <p className="mb-1 inline-flex max-w-full rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground [overflow-wrap:anywhere]">
              {category}
            </p>
            <h3 id={headingId}><Link
              state={navigation.state}
          to={`/cliente/business/${business.id}`}
              className="block min-h-11 rounded-md py-1.5 text-base font-bold tracking-tight hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [overflow-wrap:anywhere]"
            >
              {business.name}
            </Link></h3>
          </div>
          {(business.reviews_count ?? 0) > 0 && business.rating != null && Number.isFinite(Number(business.rating)) && (
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
        {!external && <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {(business.service_previews ?? [])
            .slice(0, 2)
            .map((service) => (
              <Link
                key={service.id}
                className="inline-flex min-h-11 max-w-full items-center rounded-xl border border-border bg-secondary px-3 py-2 leading-relaxed hover:border-primary/40 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [overflow-wrap:anywhere]"
                state={navigation.state}
                to={updating ? `/cliente/business/${business.id}` : discoveryBookingLink(business, service.id, source)}
              >
                {service.name}
              </Link>
            ))}
        </div>}
        {external ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">{ui("externalBookingAvailability")}</p>
        ) : slot ? (
          <p className="flex items-center gap-1.5 rounded-xl bg-accent/35 px-3 py-2 text-[11px] font-medium text-foreground">
            <Clock3 className="size-3.5" />
            {t('express.availableAt', { date: slotDay, time: formatTime(slot.start_time) })}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {ui("otherDates")}
          </p>
        )}
        {external ? <div className="space-y-2 border-t border-border pt-3"><ExternalBookingButtonTA business={business} className="w-full text-sm" /><p className="text-[11px] text-muted-foreground">{ui("externalBookingChannel")}</p></div> : <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
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
            render={<Link state={navigation.state} to={updating ? `/cliente/business/${business.id}` : discoveryBookingLink(business, undefined, source)} />}
            nativeButton={false}
            className="min-h-11 gap-2 rounded-xl px-4 text-sm"
          >
            {updating ? ui('viewServices') : t('discovery.reserve')} <ArrowUpRight className="size-3.5" />
          </ButtonTA>
        </div>}
        {!external && !!business.service_previews?.length && <ButtonTA className="min-h-11 w-full text-xs" variant="ghost" disabled={updating} aria-expanded={expanded && !updating} aria-controls={expanded && !updating ? availabilityId : undefined} onClick={() => setExpanded(value => !value)}>{t(expanded && !updating ? 'discovery.hideTimes' : 'discovery.showTimes')}</ButtonTA>}
        {!external && expanded && !updating && <div id={availabilityId}><AvailabilityPreviewTA business={business} source={source} /></div>}
      </div>
    </article>
  );
};
