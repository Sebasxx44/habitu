import { Scissors, Clock, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/i18n/formatters'
import { FavoriteButtonTA } from '@/modules/favorites/components/FavoriteButtonTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import type { Service, Professional } from '@/types/models'

// COMPONENTS
export const ServiceCard = ({ service, selected, onClick }: {service: Service;selected: boolean;onClick:()=>void}) => {
  const {t}=useTranslation()
  return <article className={`relative rounded-xl border p-4 ${selected?'border-primary bg-primary/5':'border-border bg-card'}`}><div className="absolute right-2 top-2"><FavoriteButtonTA type="service" id={service.id}/></div><Scissors className="mb-3 size-5 text-primary"/><h3 className="pr-10 font-semibold">{service.name}</h3>{service.description&&<p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{service.description}</p>}<div className="mt-3 flex items-center gap-4 text-sm"><span>{formatCurrency(service.price)}</span><span className="flex items-center gap-1 text-muted-foreground"><Clock className="size-3"/>{service.duration_minutes??service.duration} min</span></div><ButtonTA variant={selected?'default':'outline'} className="mt-4 w-full" aria-pressed={selected} onClick={onClick}>{t('booking.selectService')}</ButtonTA></article>
}
export const BarberCard = ({barber,selected,onClick}:{barber:Professional;selected:boolean;onClick:()=>void}) => {
  const {t}=useTranslation()
  return <article className={`relative rounded-xl border p-4 ${selected?'border-primary bg-primary/5':'border-border bg-card'}`}><div className="absolute right-2 top-2"><FavoriteButtonTA type="professional" id={barber.id}/></div><UserRound className="mb-3 size-5 text-primary"/><h3 className="pr-10 font-semibold">{barber.name}</h3><p className="mt-1 text-sm text-muted-foreground">{barber.specialty}</p><ButtonTA variant={selected?'default':'outline'} className="mt-4 w-full" aria-pressed={selected} onClick={onClick}>{t('booking.selectProfessional')}</ButtonTA></article>
}
