import { useCallback } from 'react'
import { getEcho, subscribeRealtime } from '@/modules/realtime/connection'
import { useRealtimeStatus } from '@/modules/realtime/useRealtimeRefresh'
import type { RealtimePayload } from '@/modules/realtime/types'

export type { RealtimeValue, RealtimePayload } from '@/modules/realtime/types'

interface UseLaravelEchoOptions {
  authEndpoint?: string
  authHeaders?: Record<string, string>
  enabled?: boolean
}

// COMPOSABLE
export const useLaravelEcho = ({ enabled = true }: UseLaravelEchoOptions = {}) => {
  const { connected } = useRealtimeStatus()
  const subscribe = useCallback((channel: string, event: string, callback: (data: RealtimePayload) => void) => {
    if (!enabled) return () => {}
    const privateChannel = /^(private-|user\.|business\.|platform$|on-demand\.|client\.|professional\.|tracking\.|conversation\.)/.test(channel)
    return subscribeRealtime(channel, event, callback, privateChannel)
  }, [enabled])
  const subscribePrivate = useCallback((channel: string, event: string, callback: (data: RealtimePayload) => void) => {
    if (!enabled) return () => {}
    return subscribeRealtime(channel, event, callback, true)
  }, [enabled])
  return { echo: getEcho(), connected: enabled && connected, subscribe, subscribePrivate }
}
