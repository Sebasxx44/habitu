import { LoadingTA } from '@/components/TA/LoadingTA'
import { useRealtimeRefresh } from '@/modules/realtime/useRealtimeRefresh'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { chatService } from '@/services'
import { Send, ArrowLeft, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/App'
import type { ChatConversation, ChatMessage } from '@/modules/communications/types'

interface ChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  conversationId?: number
  participantName?: string
}

export const ChatDrawer = ({ isOpen, onClose, conversationId: propConversationId, participantName }: ChatDrawerProps) => {
  const { user } = useAuth()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [side, setSide] = useState<'bottom' | 'right'>('right')
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeConversationId, setActiveConversationId] = useState<number | undefined>(propConversationId)
  const [loading, setLoading] = useState(false)
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => setSide(window.innerWidth < 768 ? 'bottom' : 'right')
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setActiveConversationId(propConversationId)
  }, [propConversationId])

  const fetchConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations()
      setConversations(Array.isArray(data) ? data : [])
    } catch (e) {
      setError('No se pudo cargar el chat. Intenta de nuevo.')
    }
  }, [])

  const fetchMessages = useCallback(async (id: number) => {
    setLoading(true)
    try {
      const data = await chatService.getMessages(id)
      setMessages(data)
      setError('')
    } catch (e) {
      setError('No se pudo cargar el chat. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    if (activeConversationId) {
      fetchMessages(activeConversationId)
    } else {
      fetchConversations()
    }
  }, [isOpen, activeConversationId, fetchConversations, fetchMessages])

  useRealtimeRefresh(['chat'], () => activeConversationId ? fetchMessages(activeConversationId) : fetchConversations(), { enabled: isOpen })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!inputText.trim() || !activeConversationId || sending) return
    setSending(true)
    try {
      await chatService.sendMessage(activeConversationId, inputText.trim())
      setInputText('')
      await fetchMessages(activeConversationId)
    } catch (e) {
      setError('No se pudo enviar el mensaje. Intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const currentParticipantName =
    participantName ||
    conversations.find((c) => c.id === activeConversationId)?.participants.find((participant) => participant.user_id !== user?.id)?.user?.name ||
    'Chat'

  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose() }}>
      <SheetContent
        side={side}
        className={cn(
          side === 'bottom' ? 'h-[85vh]' : 'w-full sm:max-w-md',
          'flex flex-col p-0'
        )}
      >
        <SheetHeader className="px-4 py-3 border-b flex flex-row items-center gap-3">
          {activeConversationId && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setActiveConversationId(undefined)}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <SheetTitle className="text-base">
            {activeConversationId ? currentParticipantName : 'Conversaciones'}
          </SheetTitle>
        </SheetHeader>
        {error && <p role="alert" className="px-4 py-2 text-sm text-destructive">{error}</p>}

        {activeConversationId ? (
          <>
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                        )}
                      >
                        {!isOwn && msg.sender?.name && (
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5">
                            {msg.sender.name}
                          </p>
                        )}
                        <p className="leading-relaxed">{msg.content}</p>
                        <p
                          className={cn(
                            'text-[10px] mt-1 text-right',
                            isOwn ? 'text-black/60' : 'text-muted-foreground'
                          )}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {loading && messages.length === 0 && (
                  <LoadingTA compact label="Cargando conversación…" />
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-3 border-t flex gap-2 bg-background">
              <Input
                placeholder="Escribe un mensaje..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={sending || !inputText.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="sr-only">Enviar</span>
              </Button>
            </div>
          </>
        ) : (
          <ScrollArea className="flex-1 px-4 py-2">
            <div className="space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <Avatar size="sm">
                    <AvatarImage src={conv.participants.find((participant) => participant.user_id !== user?.id)?.user?.photo_url} />
                    <AvatarFallback>
                      {conv.participants.find((participant) => participant.user_id !== user?.id)?.user?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conv.participants.filter((participant) => participant.user_id !== user?.id).map((participant) => participant.user?.name || 'Participante').join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.messages?.[0]?.content || 'Sin mensajes'}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-2 py-0.5 shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              ))}
              {conversations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">No hay conversaciones</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  )
}
