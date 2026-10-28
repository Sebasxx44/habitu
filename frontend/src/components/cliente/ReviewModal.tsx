import { Send, BadgeCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { PremiumModal } from '@/components/premium/PremiumModal'
import { useReviewForm } from '@/modules/reviews/useReviewForm'
import { RatingInputTA } from '@/modules/reviews/RatingInputTA'
import type { BookingAppointment } from '@/composables/booking/types'
import type { ReviewRequest } from '@/composables/appointments/types'

// TYPES
interface ReviewModalProps { appointment: BookingAppointment; onClose: () => void; onSubmit: (request: ReviewRequest) => Promise<void> }

// COMPONENT
export const ReviewModal = ({ appointment, onClose, onSubmit }: ReviewModalProps) => {
  const { t } = useTranslation()
  const { form, actions } = useReviewForm(appointment, onSubmit, onClose)
  return <PremiumModal open onOpenChange={open => { if (!open && !form.submitting) onClose() }} title={t('reviews.title')} description={appointment.service?.name || t('reviews.description')} maxWidth="sm:max-w-lg" showCloseButton={false}>
    <div className="space-y-5"><p className="flex items-center gap-2 text-xs text-muted-foreground"><BadgeCheck className="size-4 text-primary" />{t('reviews.verified')}</p>
      <RatingInputTA label={t('reviews.overall')} value={form.ratings.rating} disabled={form.submitting} onChange={value => actions.rate('rating',value)} />
      <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-medium">{t('reviews.optional')}</summary><div className="mt-4 space-y-4">
        <RatingInputTA label={t('reviews.service')} value={form.ratings.service_rating} disabled={form.submitting} onChange={value => actions.rate('service_rating',value)} />
        <RatingInputTA label={t('reviews.business')} value={form.ratings.business_rating} disabled={form.submitting} onChange={value => actions.rate('business_rating',value)} />
        {!!appointment.professional_id && <RatingInputTA label={`${t('reviews.professional')} · ${appointment.professional?.name ?? appointment.barber?.name ?? ''}`} value={form.ratings.professional_rating} disabled={form.submitting} onChange={value => actions.rate('professional_rating',value)} />}
      </div></details>
      <div><label htmlFor="review-comment" className="text-sm font-medium">{t('reviews.comment')} <span className="font-normal text-muted-foreground">({t('shared.optional')})</span></label><textarea id="review-comment" rows={4} maxLength={2000} disabled={form.submitting} value={form.comment} onChange={event => actions.comment(event.target.value)} className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm focus-visible:outline focus-visible:outline-primary" /></div>
      {form.error && <p role="alert" className="text-sm text-destructive">{form.error}</p>}
      <div className="flex gap-3"><ButtonTA variant="outline" disabled={form.submitting} onClick={onClose}>{t('common.back')}</ButtonTA><ButtonTA className="flex-1" disabled={form.submitting || form.ratings.rating < 1} onClick={() => { void actions.submit() }}><Send className="size-4" />{t(form.submitting ? 'reviews.sending' : 'reviews.send')}</ButtonTA></div>
    </div>
  </PremiumModal>
}
