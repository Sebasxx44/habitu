import { useTranslation } from 'react-i18next'
import { useState, useCallback, createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ToastItemTA } from '@/modules/notifications/components/ToastItemTA'
import type { ToastMessage, ToastState, ToastType } from '@/modules/notifications/types'

// CONTEXT
const ToastContext = createContext<ToastState>({ toasts: [], addToast: () => {}, removeToast: () => {} })

// ACTIONS
export const emitToast = (message: string, type: ToastType = 'info') => {
  window.dispatchEvent(new CustomEvent('habitu:toast', { detail: { message, type } }))
}

// PROVIDER
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation('notificationsUi')
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const lastToastRef = useRef<{ key: string; at: number } | null>(null)
  const nextId = useRef(0)

  const addToast = useCallback((message: string, type: ToastType = 'info', description?: string) => {
    if (!message.trim()) return
    const key = `${type}:${message}:${description ?? ''}`
    const now = Date.now()
    if (lastToastRef.current?.key === key && now - lastToastRef.current.at < 1800) return
    lastToastRef.current = { key, at: now }
    const id = `toast-${++nextId.current}`
    setToasts(current => [...current, { id, message, type, description }].slice(0, 20))
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(current => current.filter(toast => toast.id !== id))
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; type?: ToastType }>).detail
      if (typeof detail?.message === 'string') addToast(detail.message, detail.type || 'info')
    }
    window.addEventListener('habitu:toast', handler)
    return () => window.removeEventListener('habitu:toast', handler)
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <section className="pointer-events-none fixed right-3 top-[88px] z-[11000] w-[min(380px,calc(100vw-24px))] sm:right-6 sm:top-24" aria-label={t('toastRegion')}>
        <ol className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {toasts.slice(0, 3).map(toast => <ToastItemTA key={toast.id} toast={toast} onDismiss={removeToast} />)}
          </AnimatePresence>
        </ol>
      </section>
    </ToastContext.Provider>
  )
}

// COMPOSABLE
export const useToast = () => {
  const context = useContext(ToastContext)
  return {
    ...context,
    toast: (props: { title: string; description?: string; variant?: ToastType | 'destructive' }) =>
      context.addToast(props.title, props.variant === 'destructive' ? 'error' : props.variant ?? 'info', props.description)
  }
}
