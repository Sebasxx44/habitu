import { CalendarDays, ChevronDown, MapPin, SlidersHorizontal, Star, Tag, Wallet } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ButtonTA } from '@/components/TA/ButtonTA';
import { InputTA } from '@/components/TA/InputTA';
import { cn } from '@/lib/utils';
import { discoveryDay } from '@/modules/discovery/query';
import { useDiscoveryFilterDraft } from '@/modules/discovery/composables/useDiscoveryFilterDraft';
import { DiscoveryAdvancedFiltersTA } from '@/modules/discovery/components/DiscoveryAdvancedFiltersTA';
import type { DiscoverySearchState } from '@/modules/discovery/searchTypes';
import type { BusinessCategory } from '@/types/models';

// TYPES
interface FilterProps {
  open: boolean;
  onClose: () => void;
  filters: DiscoverySearchState['filters'];
  categories: BusinessCategory[];
  hasLocation: boolean;
}

// CONFIGURATION
const fieldClass = 'min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm';
const budgetPresets = [
  { key: 'anyBudget', min: '', max: '' },
  { key: 'budgetLow', min: '', max: '50000' },
  { key: 'budgetMedium', min: '50000', max: '100000' },
  { key: 'budgetHigh', min: '100000', max: '' },
] as const;

// COMPONENT
export const DiscoveryFiltersTA = ({ open, onClose, filters, categories, hasLocation }: FilterProps) => {
  // COMPOSABLES
  const { t: ui } = useTranslation('discoveryUi');
  const { draft, validation } = useDiscoveryFilterDraft({ open, onClose, filters });
  const id = useId();
  const values = draft.values;

  // RENDER
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden p-0 sm:max-w-2xl">
      <div className="border-b border-border px-5 pb-5 pt-6 sm:px-7">
        <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><SlidersHorizontal className="size-5" aria-hidden="true" /></span>
        <DialogTitle className="text-xl">{ui('filterTitle')}</DialogTitle>
        <DialogDescription className="mt-1.5">{ui('filterDescription')}</DialogDescription>
      </div>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => { event.preventDefault(); draft.apply(); }}>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          <fieldset className="space-y-4">
            <legend className="mb-3 flex items-center gap-2 text-sm font-semibold"><MapPin className="size-4 text-primary" aria-hidden="true" />{ui('experienceLocation')}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-xs font-medium">{ui('category')}
                <select value={values.category_id} onChange={event => draft.setCategory(event.target.value)} className={fieldClass}>
                  <option value="">{ui('allCategories')}</option>
                  {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="block space-y-2 text-xs font-medium">{ui('zoneAddress')}
                <InputTA placeholder={ui('zonePlaceholder')} value={values.zone} className="bg-background" onChange={event => draft.change({ zone: event.target.value, lat: '', lng: '' })} />
              </label>
            </div>
            {hasLocation && values.lat && values.lng && <label className="block rounded-xl border border-border bg-background p-4 text-xs font-medium">
              <span className="flex items-center justify-between gap-3">{ui('maxDistance')}<span className="rounded-lg bg-secondary px-2 py-1 text-primary">{values.radius} km</span></span>
              <input type="range" min="1" max="50" value={values.radius} aria-label={ui('maxDistance')} aria-valuetext={`${values.radius} km`} onChange={event => draft.change({ radius: event.target.value })} className="mt-4 block w-full accent-primary" />
            </label>}
          </fieldset>
          <fieldset className="space-y-4 border-t border-border pt-5">
            <legend className="flex items-center gap-2 pr-3 text-sm font-semibold"><CalendarDays className="size-4 text-primary" aria-hidden="true" />{ui('availability')}</legend>
            <div className="flex flex-wrap gap-2">
              {[{ label: ui('anyDay'), date: '' }, { label: ui('todayShort'), date: discoveryDay() }, { label: ui('tomorrow'), date: discoveryDay(1) }].map(day => <ButtonTA key={day.label} type="button" size="sm" variant="outline" aria-pressed={values.date === day.date && !values.date_to} onClick={() => draft.setDay(day.date)} className={cn('min-h-9 rounded-full text-xs', values.date === day.date && !values.date_to && 'border-primary/40 bg-primary/10 text-primary')}>{day.label}</ButtonTA>)}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-xs font-medium">{ui('preferredDay')}<InputTA type="date" min={discoveryDay()} value={values.date} className="bg-background" aria-invalid={validation.invalidDate} aria-describedby={validation.invalidDate ? `${id}-date` : undefined} onChange={event => draft.setDay(event.target.value)} /></label>
              <label className="block space-y-2 text-xs font-medium">{ui('untilDay')}<InputTA type="date" min={values.date || discoveryDay()} value={values.date_to} className="bg-background" aria-invalid={validation.invalidDate} onChange={event => draft.change({ date_to: event.target.value, date: values.date || discoveryDay(), available: '1' })} /></label>
            </div>
            {validation.invalidDate && <p id={`${id}-date`} role="status" className="text-xs text-destructive">{ui('invalidDate')}</p>}
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-2 text-xs font-medium">{ui('timeFrom')}<InputTA type="time" value={values.time_from} className="bg-background" aria-invalid={validation.invalidTime} onChange={event => draft.change({ time_from: event.target.value, date: values.date || discoveryDay(), available: '1' })} /></label>
              <label className="block space-y-2 text-xs font-medium">{ui('timeUntil')}<InputTA type="time" value={values.time_to} className="bg-background" aria-invalid={validation.invalidTime} aria-describedby={validation.invalidTime ? `${id}-time` : undefined} onChange={event => draft.change({ time_to: event.target.value, date: values.date || discoveryDay(), available: '1' })} /></label>
            </div>
            {validation.invalidTime && <p id={`${id}-time`} role="status" className="text-xs text-destructive">{ui('invalidTime')}</p>}
          </fieldset>
          <fieldset className="space-y-4 border-t border-border pt-5">
            <legend className="flex items-center gap-2 pr-3 text-sm font-semibold"><Wallet className="size-4 text-primary" aria-hidden="true" />{ui('price')}</legend>
            <div className="flex flex-wrap gap-2">{budgetPresets.map(preset => <ButtonTA key={preset.key} type="button" variant="outline" size="sm" className={cn('min-h-9 rounded-full text-xs', values.min_price === preset.min && values.max_price === preset.max && 'border-primary/40 bg-primary/10 text-primary')} aria-pressed={values.min_price === preset.min && values.max_price === preset.max} onClick={() => draft.change({ min_price: preset.min, max_price: preset.max })}>{ui(preset.key)}</ButtonTA>)}</div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-2 text-xs font-medium">{ui('minPrice')}<InputTA type="number" min="0" step="any" inputMode="numeric" placeholder="0" value={values.min_price} className="bg-background" aria-invalid={validation.invalidPrice} onChange={event => draft.change({ min_price: event.target.value })} /></label>
              <label className="block space-y-2 text-xs font-medium">{ui('maxPrice')}<InputTA type="number" min="0" step="any" inputMode="numeric" placeholder={ui('noLimit')} value={values.max_price} className="bg-background" aria-invalid={validation.invalidPrice} aria-describedby={validation.invalidPrice ? `${id}-price` : undefined} onChange={event => draft.change({ max_price: event.target.value })} /></label>
            </div>
            {validation.invalidPrice && <p id={`${id}-price`} role="status" className="text-xs text-destructive">{ui('invalidPrice')}</p>}
          </fieldset>
          <fieldset className="space-y-3 border-t border-border pt-5">
            <legend className="flex items-center gap-2 pr-3 text-sm font-semibold"><Star className="size-4 text-primary" aria-hidden="true" />{ui('minRating')}</legend>
            <div className="flex flex-wrap gap-2">{['', '4', '4.5'].map(rating => <ButtonTA key={rating} type="button" variant="outline" size="sm" className={cn('min-h-9 rounded-full text-xs', values.min_rating === rating && 'border-primary/40 bg-primary/10 text-primary')} aria-pressed={values.min_rating === rating} onClick={() => draft.change({ min_rating: rating })}>{rating ? <><Star className="size-3.5" aria-hidden="true" />{ui('ratingOrMore', { value: rating })}</> : ui('allRatings')}</ButtonTA>)}</div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background p-4 text-sm"><Tag className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="flex-1 text-xs font-medium">{ui('promotionsOnly')}</span><input type="checkbox" checked={values.promotions === '1'} onChange={event => draft.change({ promotions: event.target.checked ? '1' : '' })} className="size-4 shrink-0 accent-primary" /></label>
          </fieldset>
          <details className="group rounded-2xl border border-border bg-background p-4">
            <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">{ui('advancedFilters')}<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
            <DiscoveryAdvancedFiltersTA draft={draft} />
          </details>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-5 py-4 sm:px-7">
          <ButtonTA type="button" variant="ghost" onClick={draft.reset} className="text-xs">{ui('clearFilters')}</ButtonTA>
          <ButtonTA type="submit" disabled={!validation.valid} className="px-6 text-sm">{ui('showResults')}</ButtonTA>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
};
