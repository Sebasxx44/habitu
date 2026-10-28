import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MoonStar, X, ArrowUpRight } from 'lucide-react'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { conciergeName } from '@/modules/assistant/config'
import { ConciergeQuickActionsTA } from '@/modules/assistant/components/ConciergeQuickActionsTA'

// COMPONENT
export const FloatingAIChat = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('marketplace')
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  if (['/cliente/ai-chat', '/cliente/messages'].includes(pathname)) return null
  return <aside className="fixed bottom-[7.25rem] right-4 z-40 flex flex-col items-end gap-3 sm:right-6 lg:bottom-10" aria-label={conciergeName}>
    {open && <section className="max-h-[calc(100dvh-13rem)] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto rounded-3xl border border-border bg-card shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
      <div className="flex items-start justify-between gap-3 border-b border-border bg-secondary p-5"><div><span className="inline-flex items-center gap-2 text-lg font-semibold"><span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><MoonStar className="size-5" /></span>{conciergeName}</span><p className="mt-2 text-xs text-secondary-foreground">{t('concierge.tagline')}</p></div><ButtonTA variant="ghost" size="icon" aria-label={t('concierge.close', { name: conciergeName })} onClick={() => setOpen(false)}><X className="size-4" /></ButtonTA></div>
      <div className="space-y-4 p-5"><h2 className="text-sm font-medium">{t('concierge.greeting')}</h2><ConciergeQuickActionsTA compact onChoose={intent => { setOpen(false); navigate(`/cliente/ai-chat?intent=${intent}`) }} /><ButtonTA className="w-full" onClick={() => { setOpen(false); navigate('/cliente/ai-chat') }}>{t('concierge.start')}<ArrowUpRight className="size-4" /></ButtonTA></div>
    </section>}
    <ButtonTA onClick={() => setOpen(value => !value)} className="h-16 gap-3 rounded-full border border-primary/10 bg-secondary px-2 pr-5 text-foreground shadow-lg shadow-primary/10 hover:bg-secondary/90" aria-expanded={open} aria-label={t(open ? 'concierge.close' : 'concierge.open', { name: conciergeName })}><span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm">{open ? <X className="size-5" /> : <MoonStar className="size-5" />}</span><span className="hidden text-left sm:block"><strong className="block text-sm leading-5">{conciergeName}</strong><span className="block text-[10px] font-normal text-secondary-foreground">{t('concierge.tagline')}</span></span></ButtonTA>
  </aside>
}
