import { useAuth } from '@/contexts/AuthContext'
import { OperationalAssistantSummaryTA } from '@/modules/assistant/components/OperationalAssistantSummaryTA'
import { useTranslation } from 'react-i18next'
import { conciergeName } from '@/modules/assistant/config'
import { ConciergeQuickActionsTA } from '@/modules/assistant/components/ConciergeQuickActionsTA'
import { useConciergeEntry } from '@/modules/assistant/composables/useConciergeEntry'
import { formatDate } from '@/i18n/formatters'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, CalendarDays, History, ImagePlus, Loader2, MapPin, Plus, Sparkles, X } from 'lucide-react'
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { StateTA } from '@/components/TA/StateTA'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { AssistantSearchContextTA } from '@/modules/assistant/components/AssistantSearchContextTA'
import { AssistantResultTA } from '@/modules/assistant/components/AssistantResultTA'
import { useBookingAssistant } from '@/modules/assistant/composables/useBookingAssistant'
import { cn } from '@/lib/utils'

// CONSTANTS

// PAGE
export const AIChatPage = () => {
  const { t, i18n } = useTranslation('marketplace')
  const { user } = useAuth()
  const operational = user?.role !== 'CLIENTE'
  const english = i18n.language.startsWith('en')
  const agendaPath = user?.role === 'PROFESSIONAL' ? '/professional/appointments' : user?.role === 'SUPERADMIN' ? '/superadmin/appointments' : '/admin/appointments'
  // COMPOSABLES
  const { conversation, composer, actions, location } = useBookingAssistant()
  useConciergeEntry(conversation.loading, actions.send)
  // STATE
  const [showHistory, setShowHistory] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const latestMessage = useRef<HTMLDivElement>(null)
  const busy = conversation.loading || conversation.sending
  const closed = conversation.history.find((entry) => entry.session_id === conversation.session)?.status === 'CLOSED'
  // EFFECTS
  useEffect(() => {
    const container = log.current
    if (!container) return
    const latest = conversation.messages[conversation.messages.length - 1]
    const target = latest?.role === 'assistant' && !conversation.sending ? latestMessage.current : null
    const top = target ? container.scrollTop + target.getBoundingClientRect().top - container.getBoundingClientRect().top : container.scrollHeight
    container.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [conversation.messages, conversation.sending])
  // RENDER
  return <div className="mx-auto flex h-[calc(100dvh-12rem)] min-h-[18rem] w-full max-w-6xl flex-col gap-3 sm:h-[calc(100dvh-10rem)] lg:h-[calc(100dvh-8.5rem)]">
    <div className="shrink-0 [&_header]:flex-row [&_header]:items-center [&_header]:gap-3 [&_h1]:text-xl [&_h1]:leading-tight sm:[&_h1]:text-2xl"><ActionHeaderTA title={t('concierge.chatTitle', { name: conciergeName })} actions={<><ButtonTA variant="outline" aria-label={t('concierge.history')} onClick={() => setShowHistory(true)}><History className="size-4" /><span className="hidden sm:inline">{t('concierge.history')}</span></ButtonTA><ButtonTA disabled={busy} onClick={() => void actions.start()}><Plus className="size-4" />{t('concierge.new')}</ButtonTA></>} /></div>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card sm:rounded-3xl">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-5"><span className="flex items-center gap-2 text-xs font-medium"><span className="grid size-7 place-items-center rounded-full bg-secondary text-primary"><Sparkles className="size-3.5" /></span>{operational ? (english ? 'Your authorized schedule' : 'Tu agenda autorizada') : t('concierge.real')}</span>{!operational && <ButtonTA variant="ghost" className="min-h-9 px-2 text-xs" disabled={location.loading} onClick={location.enabled ? location.disable : location.enable}><MapPin className="size-3.5" />{t(location.loading ? 'express.locating' : location.enabled ? 'express.removeLocation' : 'concierge.location')}</ButtonTA>}</div>
      <div ref={log} className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-3 sm:p-5" role="log" aria-label={conciergeName} aria-live="polite" aria-busy={busy}>
        {conversation.loading && !conversation.messages.length ? <div role="status" className="flex min-h-52 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('concierge.loading')}</div> : !conversation.messages.length ? <div className="mx-auto max-w-2xl py-5"><span className="mb-5 inline-flex rounded-2xl bg-secondary p-4 text-primary"><CalendarDays className="size-8 stroke-[1.2]" /></span><h2 className="text-2xl font-medium tracking-tight">{t('concierge.greeting')}</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{operational ? (english ? 'Review current bookings and prepare changes for confirmation. Your operational data is not sent to the AI provider.' : 'Consulta reservas actuales y prepara cambios para confirmación. Tu información operativa no se envía al proveedor de IA.') : t('concierge.intro')}</p><div className="mt-6">{operational ? <div className="flex flex-wrap gap-2">{(english ? ['Summarize my schedule today', 'Review tomorrow appointments', 'I am running late; prepare alternatives'] : ['Resume mi jornada de hoy', 'Revisa mis citas de mañana', 'Voy con retraso; prepara alternativas']).map(prompt => <ButtonTA key={prompt} variant="outline" disabled={busy} onClick={() => void actions.send(prompt)}>{prompt}</ButtonTA>)}</div> : <ConciergeQuickActionsTA disabled={busy} onChoose={intent => void actions.send(t(`concierge.${intent}Prompt`))} />}</div></div> : <div className="space-y-4">{conversation.messages.map((message, messageIndex) => <div ref={messageIndex === conversation.messages.length - 1 ? latestMessage : undefined} key={message.id} className={cn(message.role === 'user' ? 'ml-auto max-w-[85%] sm:max-w-[70%]' : 'max-w-full')}><div className={cn('w-fit whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed', message.role === 'user' ? 'ml-auto rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-secondary text-foreground')}>{message.content}</div>{message.role === 'assistant' && message.metadata?.source && <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">{message.metadata.source === 'operations' ? (english ? 'Live authorized schedule · no AI provider required' : 'Agenda autorizada actual · sin depender del proveedor de IA') : t(message.metadata.source === 'catalog' ? 'concierge.catalog' : 'concierge.assisted')}</p>}{message.metadata?.summary && <OperationalAssistantSummaryTA summary={message.metadata.summary} />}{message.metadata?.search_context && <AssistantSearchContextTA context={message.metadata.search_context} />}{message.metadata?.location_required && <ButtonTA variant="outline" className="mt-3 text-xs" disabled={location.loading} onClick={location.enable}>{t('concierge.location')}</ButtonTA>}{!!message.metadata?.cards?.length && <div className="mt-4 grid gap-3 md:grid-cols-2">{message.metadata.cards.map((card, index) => <AssistantResultTA key={`${card.business_id}:${card.service_id}:${index}`} card={card} busy={busy} onAvailability={(context) => void actions.send(t('concierge.availability'), context)} />)}</div>}</div>)}{conversation.sending && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('concierge.searching')}</p>}</div>}
      </div>
      {conversation.error && <div className="mx-4 mb-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs" role="alert">{conversation.error}{!conversation.session && <button onClick={() => void actions.retryHistory()} className="ml-2 font-semibold underline">{t('express.retry')}</button>}</div>}
      <form className="shrink-0 border-t border-border bg-background/50 p-2 sm:p-3" onSubmit={(event) => { event.preventDefault(); if (!closed) void actions.send() }}>
        {closed && <p className="mb-3 text-xs text-muted-foreground">{t('concierge.closed')}</p>}{composer.image && <div className="relative mb-3 inline-block"><img src={composer.image} alt={t('concierge.image')} className="h-20 w-20 rounded-xl object-cover" /><button type="button" aria-label={t('concierge.removeImage')} className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border border-border bg-card" onClick={composer.clearImage}><X className="size-3" /></button></div>}
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2"><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { composer.selectImage(event.target.files?.[0]); event.target.value = '' }} /><ButtonTA type="button" variant="ghost" className="shrink-0 px-3" aria-label={t('concierge.attach')} onClick={() => fileInput.current?.click()} disabled={busy || operational}><ImagePlus className="size-4" /></ButtonTA><label className="sr-only" htmlFor="assistant-message">{t('concierge.message', { name: conciergeName })}</label><textarea id="assistant-message" value={composer.text} onChange={(event) => composer.setText(event.target.value)} placeholder={t('concierge.placeholder')} maxLength={2000} rows={1} disabled={busy || closed} className="min-h-12 flex-1 resize-none rounded-lg bg-transparent py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (!closed) void actions.send() } }} /><ButtonTA type="submit" disabled={busy || closed || (!composer.text.trim() && !composer.image)} aria-label={t('concierge.send')} className="shrink-0 px-3">{conversation.sending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}</ButtonTA></div>
        <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">{t('concierge.disclaimer')} <Link className="underline" to={operational ? agendaPath : '/cliente/explore'}>{operational ? (english ? 'Open schedule' : 'Abrir agenda') : t('concierge.explore')}</Link> · {english ? 'History is retained for 90 days.' : 'El historial se conserva 90 días.'}</p>
      </form>
    </div>
    <Dialog open={showHistory} onOpenChange={setShowHistory}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogTitle>{t('concierge.history')}</DialogTitle><div className="mt-5 space-y-2">{conversation.history.length ? conversation.history.map((item) => <button key={item.session_id} onClick={() => { void actions.open(item.session_id); setShowHistory(false) }} className="flex min-h-14 w-full items-center justify-between rounded-xl border border-border p-3 text-left text-sm hover:bg-secondary"><span>{t('concierge.query')}<span className="mt-1 block text-xs text-muted-foreground">{formatDate(item.last_activity_at)}</span></span><span className="text-[10px] text-muted-foreground">{t(item.status === 'CLOSED' ? 'concierge.ended' : 'concierge.active')}</span></button>) : <StateTA title={t('concierge.emptyHistory')} description={t('concierge.emptyHistoryDetail')} />}</div>{conversation.session && <ButtonTA variant="outline" className="mt-4 w-full" disabled={busy} onClick={() => { void actions.close(); setShowHistory(false) }}>{t('concierge.closeConversation')}</ButtonTA>}{conversation.session && <ButtonTA variant="ghost" className="mt-2 w-full" disabled={busy} onClick={() => { void actions.forget(); setShowHistory(false) }}>{english ? 'Delete this conversation' : 'Eliminar esta conversación'}</ButtonTA>}</DialogContent></Dialog>
  </div>
}
