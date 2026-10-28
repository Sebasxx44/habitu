import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MoonStar, ArrowUpRight } from 'lucide-react'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { conciergeName } from '@/modules/assistant/config'
import { ConciergeQuickActionsTA } from '@/modules/assistant/components/ConciergeQuickActionsTA'

// COMPONENT
export const FloatingAIChat = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('marketplace')
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  if (['/cliente/ai-chat', '/cliente/messages', '/cliente/booking'].includes(pathname) || pathname.startsWith('/cliente/business/')) return null
  return <aside className="fixed bottom-[calc(var(--bottom-nav-height,6rem)+1rem)] right-4 z-30 sm:right-6 lg:bottom-8" aria-label={conciergeName}>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<ButtonTA size="icon-lg" className="size-14 rounded-full shadow-lg" aria-label={t('concierge.open', { name: conciergeName })}><MoonStar className="size-6" aria-hidden="true" /></ButtonTA>} />
      <DialogContent className="max-w-[calc(100%-1rem)] space-y-5 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MoonStar className="size-5 text-primary" aria-hidden="true" />{conciergeName}</DialogTitle>
          <DialogDescription>{t('concierge.tagline')}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-foreground">{t('concierge.greeting')}</p>
        <ConciergeQuickActionsTA compact onChoose={intent => { setOpen(false); navigate(`/cliente/ai-chat?intent=${intent}`) }} />
        <ButtonTA className="w-full whitespace-normal" onClick={() => { setOpen(false); navigate('/cliente/ai-chat') }}>{t('concierge.start')}<ArrowUpRight className="size-4" aria-hidden="true" /></ButtonTA>
      </DialogContent>
    </Dialog>
  </aside>
}
