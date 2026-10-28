import { Check, ChevronDown, Sparkles } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ButtonTA } from '@/components/TA/ButtonTA';
import { cn } from '@/lib/utils';
import { categoryFilterChange } from '@/modules/discovery/filters/selection';
import { categoryAppearance } from '@/modules/discovery/categoryAppearance';
import { useDiscoveryCategories } from '@/modules/discovery/composables/useDiscoveryCategories';
import type { DiscoverySearchState } from '@/modules/discovery/searchTypes';
import type { BusinessCategory } from '@/types/models';

// TYPES
interface DiscoveryCategoriesProps {
  categories: BusinessCategory[];
  filters: DiscoverySearchState['filters'];
}

// COMPONENT
export const DiscoveryCategoriesTA = ({ categories, filters }: DiscoveryCategoriesProps) => {
  // COMPOSABLES
  const { t: ui } = useTranslation('discoveryUi');
  const { selection } = useDiscoveryCategories(categories, filters.values.category_id);
  const listId = useId();

  // RENDER
  return <nav aria-label={ui('categories')} className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold tracking-tight">{ui('browseCategories')}</p>
      {selection.canExpand && <ButtonTA variant="ghost" size="sm" className="min-h-9 gap-1.5 text-xs text-muted-foreground" aria-expanded={selection.expanded} aria-controls={listId} onClick={selection.toggle}>
        {selection.expanded ? ui('fewerCategories') : ui('moreCategories', { count: categories.length })}
        <ChevronDown aria-hidden="true" className={cn('size-4 transition-transform duration-200', selection.expanded && 'rotate-180')} />
      </ButtonTA>}
    </div>
    <div id={listId} className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      <ButtonTA variant="ghost" onClick={() => filters.change(categoryFilterChange('', filters.values))} aria-pressed={!filters.values.category_id}
        className={cn('h-auto min-h-[84px] justify-start gap-3 whitespace-normal rounded-2xl border p-3 text-left transition-[background-color,border-color,box-shadow] duration-200', !filters.values.category_id ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/15 hover:bg-primary/90 hover:text-primary-foreground' : 'border-border bg-card hover:border-primary/30 hover:bg-secondary/50')}>
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', !filters.values.category_id ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary')}><Sparkles className="!size-5" aria-hidden="true" /></span>
        <span className="text-xs font-semibold leading-relaxed">{ui('allExperiences')}</span>
      </ButtonTA>
      {selection.visible.map(category => {
        const { Icon } = categoryAppearance(category.name);
        const selected = filters.values.category_id === String(category.id);
        return <ButtonTA key={category.id} variant="ghost" aria-pressed={selected}
          onClick={() => filters.change(categoryFilterChange(selected ? '' : String(category.id), filters.values))}
          className={cn('relative h-auto min-h-[84px] justify-start gap-3 whitespace-normal rounded-2xl border p-3 text-left transition-[background-color,border-color,box-shadow] duration-200', selected ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/15 hover:bg-primary/90 hover:text-primary-foreground' : 'border-border bg-card text-foreground/85 hover:border-primary/30 hover:bg-secondary/50')}>
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', selected ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary')}><Icon className="!size-5 stroke-[1.6]" aria-hidden="true" /></span>
          <span className="min-w-0 break-words text-xs font-semibold leading-relaxed">{category.name}</span>
          {selected && <Check className="absolute right-2 top-2 !size-3 text-primary-foreground" aria-hidden="true" />}
        </ButtonTA>;
      })}
    </div>
  </nav>;
};
