import { useEffect, useRef, useCallback, useState } from 'react'
import { useLaravelEcho, type RealtimePayload } from '@/hooks/useLaravelEcho'

interface RealTimeOptions {
  channels: Array<{
    name: string
    event: string
    private?: boolean
  }>
  onMessage: (channel: string, event: string, data: RealtimePayload) => void
  enabled?: boolean
}

export const useRealTime = (options: RealTimeOptions) => {
  const { channels, onMessage, enabled = true } = options
  const { connected, subscribe, subscribePrivate } = useLaravelEcho({ enabled })
  const [lastEvent, setLastEvent] = useState<{ channel: string; event: string; data: RealtimePayload } | null>(null)
  const unsubsRef = useRef<Array<() => void>>([])

  const handleMessage = useCallback(
    (channel: string, event: string) => (data: RealtimePayload) => {
      setLastEvent({ channel, event, data })
      onMessage(channel, event, data)
    },
    [onMessage]
  )

  useEffect(() => {
    if (!enabled || !connected) return

    // Clean up previous subscriptions
    unsubsRef.current.forEach((unsub) => unsub())
    unsubsRef.current = []

    channels.forEach((ch) => {
      const unsub = ch.private
        ? subscribePrivate(ch.name, ch.event, handleMessage(ch.name, ch.event))
        : subscribe(ch.name, ch.event, handleMessage(ch.name, ch.event))
      
      if (unsub) unsubsRef.current.push(unsub)
    })

    return () => {
      unsubsRef.current.forEach((unsub) => unsub())
      unsubsRef.current = []
    }
  }, [enabled, connected, channels, subscribe, subscribePrivate, handleMessage])

  return { connected, lastEvent }
}
