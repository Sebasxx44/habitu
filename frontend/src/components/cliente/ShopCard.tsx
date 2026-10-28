import type { MouseEvent } from 'react'
import { Star, MapPin, Heart, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ButtonTA } from '@/components/TA/ButtonTA'
import type { Business } from '@/types/models'

interface ShopCardProps {
  shop: Business & { photo_url?: string; is_favorite?: boolean; distance?: number | string }
  onClick?: () => void
  onToggleFavorite?: (event: MouseEvent) => void
  favoriteDisabled?: boolean
}

export const ShopCard = ({ shop, onClick, onToggleFavorite, favoriteDisabled }: ShopCardProps) => {
  const image = shop.banner_url || shop.logo_url || shop.photo_url
  const services = shop.services ?? []
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="relative h-44 overflow-hidden bg-secondary">
        <button onClick={onClick} aria-label={`Ver ${shop.name}`} className="size-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-4">
          {image ? <img src={image} alt={shop.name} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <span className="flex size-full items-center justify-center text-5xl font-semibold text-primary/30">{shop.name.slice(0, 1)}</span>}
        </button>
        {onToggleFavorite && <button onClick={onToggleFavorite} disabled={favoriteDisabled} aria-label={`${shop.is_favorite ? 'Quitar' : 'Agregar'} ${shop.name} ${shop.is_favorite ? 'de' : 'a'} favoritos`} aria-pressed={!!shop.is_favorite} className="absolute right-3 top-3 grid size-11 place-items-center rounded-full border border-border bg-card/95 shadow-sm disabled:opacity-50"><Heart className={cn('size-4', shop.is_favorite && 'fill-primary text-primary')} /></button>}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div><button onClick={onClick} className="text-left text-lg font-semibold tracking-tight hover:text-primary">{shop.name}</button><p className="mt-1 flex items-start gap-1 text-xs leading-relaxed text-muted-foreground"><MapPin className="mt-0.5 size-3 shrink-0" />{shop.address || 'Consulta la ubicación en el negocio'}{shop.distance != null && ` · ${Number(shop.distance).toFixed(1)} km`}</p></div>
        {(shop.reviews_count ?? 0) > 0 && shop.rating != null ? <p className="flex items-center gap-1.5 text-xs"><Star className="size-3.5 fill-amber-500 text-amber-500" /><span className="font-semibold">{Number(shop.rating).toFixed(1)}</span><span className="text-muted-foreground">({shop.reviews_count} reseñas)</span></p> : <p className="text-xs text-muted-foreground">Sin reseñas publicadas</p>}
        {!!services.length && <div className="flex flex-wrap gap-2">{services.slice(0, 3).map((service) => <span key={service.id} className="rounded-md bg-secondary px-2 py-1 text-[11px] text-secondary-foreground">{service.name}</span>)}</div>}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4"><p className="text-xs text-muted-foreground">Consulta servicios y horarios</p><ButtonTA onClick={onClick} className="shrink-0">Reservar <ArrowRight className="size-4" /></ButtonTA></div>
      </div>
    </article>
  )
}
