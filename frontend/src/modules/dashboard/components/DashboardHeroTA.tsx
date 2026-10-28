import { t } from 'i18next'
import { formatTime } from '@/i18n/formatters'
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Compass,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { formatDay } from "@/modules/dashboard/formatters";
import type { DashboardOverview } from "@/modules/dashboard/types";

// COMPONENT
export const DashboardHeroTA = ({
  data,
  agendaPath,
  canOpenAgenda = true,
}: {
  data: DashboardOverview;
  agendaPath: string;
  canOpenAgenda?: boolean;
}) => {
  const navigate = useNavigate();
  const next = data.upcoming[0];
  const isClient = data.role === "CLIENTE";
  const isSuperadmin = data.role === "SUPERADMIN";
  const title = isClient
    ? t('dashboard.heroClient')
    : isSuperadmin
      ? t('dashboard.heroAdmin')
      : t('dashboard.heroProfessional');

  return (
    <section className="surface-primary dashboard-hero relative isolate grid gap-8 overflow-hidden rounded-[28px] px-6 py-8 text-white sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:px-9 lg:py-9">
      <div
        className="pointer-events-none absolute -right-20 -top-48 -z-10 size-[500px] rounded-full border border-white/10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-64 -right-5 -z-10 size-[500px] rounded-full border border-white/10"
        aria-hidden="true"
      />
      <div>
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90">
          <span className="size-1.5 rounded-full bg-accent" />
          {isClient ? t('dashboard.yourPace') : data.scopeName}
        </p>
        <h2 className="whitespace-pre-line text-[30px] font-bold leading-[1.12] tracking-[-0.045em] sm:text-[37px]">
          {title}
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/90">
          {isClient
            ? t('dashboard.heroClientDescription')
            : t('dashboard.heroDescription')}
        </p>
        {(isClient || canOpenAgenda) && (
          <ButtonTA
            className="mt-6 border-transparent bg-accent text-accent-foreground hover:bg-accent/90"
            variant="gold"
            onClick={() => navigate(isClient ? "/cliente/explore" : agendaPath)}
          >
            {isClient ? <Compass /> : <CalendarDays />}
            {isClient
              ? t('dashboard.findPlan')
              : isSuperadmin
                ? t('dashboard.exploreBusinesses')
                : t('dashboard.openAgenda')}
            <ArrowUpRight />
          </ButtonTA>
        )}
      </div>
      <div className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-lg shadow-black/5 backdrop-blur-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">
            {next ? t('dashboard.horizon') : t('dashboard.atYourPace')}
          </p>
          <Sparkles className="size-4 text-accent" />
        </div>
        {next ? (
          <>
            <p className="text-xl font-medium tracking-tight">{next.service}</p>
            <p className="mt-1 text-xs text-white/90">
              {isClient ? next.business : next.client}
              {next.professional && ` · ${next.professional}`}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4 text-white/90" />
                {formatDay(next.date, true)}
              </span>
              <span className="flex items-center gap-2">
                <Clock3 className="size-4 text-white/90" />
                {formatTime(next.startTime)}
              </span>
            </div>
            {next.bookingCode && (
              <p className="mt-4 border-t border-white/15 pt-3 text-[10px] uppercase tracking-widest text-white/90">
                {t('dashboard.bookingCode',{code:next.bookingCode})}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-xl font-medium tracking-tight">
              {t('dashboard.nextChapter')}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/90">
              {isClient
                ? t('dashboard.clientEmpty')
                : t('dashboard.professionalEmpty')}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
