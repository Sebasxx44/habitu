import { ReservationPaymentTA } from '@/modules/checkout/ReservationPaymentTA';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock, MapPin, Tag, UserRound, Building2 } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { StateTA } from "@/components/TA/StateTA";
import { BookingBenefitsTA } from "@/components/cliente/booking/BookingBenefitsTA";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  BookingBusiness,
  BookingCheckoutState,
  BookingFlowState,
} from "@/composables/booking/types";
import {
  bookingLongDate,
  bookingMoney,
} from "@/components/cliente/booking/BookingStepsTA";

// COMPONENT
export const BookingSummaryTA = ({
  business,
  flow,
  checkout,
}: {
  business: BookingBusiness;
  flow: BookingFlowState;
  checkout: BookingCheckoutState;
}) => {
  const { t } = useTranslation('marketplace');
  const { t: pricing } = useTranslation('pricing');
  const { summary, submission, actions } = checkout;
  const quote = summary.quote;
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-secondary/30 p-5">
        <p className="text-xs text-muted-foreground">
          {business.name} · {flow.journey.branch?.name}
        </p>
        <h3 className="mt-1 text-xl font-semibold tracking-tight">
          {flow.journey.service?.name}
        </h3>
        <div className="mt-5 space-y-3 text-sm">
          <p className="flex gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="capitalize">
              {bookingLongDate(flow.selection.date)} · {flow.selection.time}
            </span>
          </p>
          <p className="flex gap-2">
            {flow.journey.requiresProfessional ? <UserRound className="size-4 shrink-0 text-primary" /> : <Building2 className="size-4 shrink-0 text-primary" />}
            {quote?.professional?.name ??
              flow.journey.professional?.name ??
              flow.journey.selectedSlot?.professional_name ??
              (flow.journey.requiresProfessional
                ? t('booking.assignment')
                : quote?.resource?.name ?? flow.journey.resource?.name ?? flow.journey.selectedSlot?.resource_name ?? t('booking.direct'))}
            {flow.journey.requiresProfessional && flow.journey.resource && ` · ${flow.journey.resource.name}`}
          </p>
          <p className="flex gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            {flow.journey.branch?.address ||
              business.address ||
              t('booking.noAddress')}
          </p>
          <p className="flex gap-2">
            <Clock className="size-4 shrink-0 text-primary" />
            {t('booking.minutes', { count: quote?.duration_minutes ?? flow.selection.durationMinutes })}
          </p>
          {flow.journey.model === 'capacity' && <p className="text-sm text-primary">{t('booking.participants')} {flow.selection.participants}</p>}
        </div>
      </div>
      <BookingBenefitsTA business={business} flow={flow} checkout={checkout} />
      <div>
        <label htmlFor="booking-promo" className="text-sm font-medium">
          {t('booking.promotion')}
        </label>
        <div className="mt-2 flex gap-2">
          <InputTA
            id="booking-promo"
            maxLength={80}
            value={summary.promoCode}
            disabled={submission.submitting}
            onChange={(event) => actions.setPromoCode(event.target.value)}
            placeholder={t('booking.promoCode')}
          />
          <ButtonTA
            variant="outline"
            disabled={
              submission.submitting ||
              summary.loading ||
              !summary.promoCode.trim()
            }
            onClick={actions.applyPromo}
          >
            {t('booking.apply')}
          </ButtonTA>
        </div>
        {summary.appliedCode && (
          <button
            className="mt-2 text-xs text-primary underline"
            disabled={submission.submitting}
            onClick={actions.removePromo}
          >
            {t('booking.removeCode', { code: summary.appliedCode })}
          </button>
        )}
      </div>
      {summary.loading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : summary.error ? (
        <StateTA
          error
          title={t('booking.checkTotal')}
          description={summary.error}
          onRetry={actions.retry}
        />
      ) : quote ? (
        <div className="space-y-3 rounded-2xl border border-border p-5">
          {quote.dynamic_pricing?.rule && <div className="space-y-2 rounded-xl bg-secondary/40 p-3 text-xs"><p className="font-medium">{pricing('ruleApplied', { name: quote.dynamic_pricing.rule.name })}</p><p className="flex justify-between gap-3 text-muted-foreground"><span>{pricing('baseBooking')}</span><span>{bookingMoney(quote.dynamic_pricing.base_price, quote.currency)}</span></p><p className="flex justify-between gap-3 text-muted-foreground"><span>{pricing('adjustmentBooking')}</span><span>{quote.dynamic_pricing.adjustment >= 0 ? '+' : '−'}{bookingMoney(Math.abs(quote.dynamic_pricing.adjustment), quote.currency)}</span></p></div>}
          {quote.membership && <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs"><p className="font-medium text-primary">{pricing('membership', {name: quote.membership.name})}</p>{quote.membership.included_appointment && <p className="mt-2 text-muted-foreground">{pricing('membershipUse')}</p>}<p className="mt-2 text-muted-foreground">{pricing('membershipPolicy')}</p></div>}
          <div className="flex justify-between gap-3 text-sm text-muted-foreground">
            <span>{t('booking.subtotal')}</span>
            <span>{bookingMoney(quote.subtotal, quote.currency)}</span>
          </div>
          {quote.discount > 0 && (
            <div className="flex justify-between gap-3 text-sm text-primary">
              <span className="inline-flex items-center gap-1">
                <Tag className="size-3.5" />
                {quote.promotion?.title ?? quote.membership?.name ?? t('booking.discount')}
              </span>
              <span>−{bookingMoney(quote.discount, quote.currency)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-border pt-3 font-semibold">
            <span>{t('booking.total')}</span>
            <span>{bookingMoney(quote.total, quote.currency)}</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t('booking.safe')}
          </p>
        </div>
      ) : (
        <StateTA
          title={t('booking.chooseTime')}
          description={t('booking.summaryDescription')}
        />
      )}
      {quote && <ReservationPaymentTA payment={checkout.payment} currency={quote.currency} />}
      <div>
        <label htmlFor="booking-notes" className="text-sm font-medium">
          {t('booking.notes')}
        </label>
        <textarea
          id="booking-notes"
          className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm focus-visible:outline focus-visible:outline-primary"
          rows={3}
          maxLength={2000}
          disabled={submission.submitting}
          value={summary.notes}
          onChange={(event) => actions.setNotes(event.target.value)}
          placeholder={t('booking.notesPlaceholder')}
        />
      </div>
      {submission.error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {submission.error}
        </p>
      )}
    </div>
  );
};
