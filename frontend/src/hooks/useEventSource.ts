import { useCallback, useEffect, useRef, useState } from 'react'

// TYPES
export type StreamValue = string | number | boolean | null | StreamValue[] | { [key: string]: StreamValue }
interface EventSourceOptions {
  url: string
  onMessage?: (data: StreamValue) => void
  onError?: (error: Event) => void
  enabled?: boolean
}

// COMPOSABLE
export const useEventSource = ({ url, onMessage, onError, enabled = true }: EventSourceOptions) => {
  const [connected, setConnected] = useState(false)
  const [revision, setRevision] = useState(0)
  const connection = useRef<AbortController | null>(null)
  const handlers = useRef({ onMessage, onError })
  handlers.current = { onMessage, onError }

  const disconnect = useCallback(() => {
    connection.current?.abort()
    connection.current = null
    setConnected(false)
  }, [])
  const reconnect = useCallback(() => setRevision(current => current + 1), [])

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    connection.current = controller
    let retry: ReturnType<typeof setTimeout> | undefined
    const stream = async () => {
      try {
        const endpoint = new URL(url, window.location.origin)
        if (endpoint.origin !== window.location.origin) throw new Error('El stream debe pertenecer a esta aplicación.')
        const token = localStorage.getItem('eb_token')
        const response = await fetch(endpoint, { headers: { Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, signal: controller.signal })
        if (!response.ok || !response.body) throw new Error('No se pudo conectar al stream.')
        setConnected(true)
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (!controller.signal.aborted) {
          const result = await reader.read()
          if (result.done) break
          buffer += decoder.decode(result.value, { stream: true }).replace(/\r\n/g, '\n')
          let boundary = buffer.indexOf('\n\n')
          while (boundary !== -1) {
            const frame = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
            if (data) {
              try { handlers.current.onMessage?.(JSON.parse(data) as StreamValue) }
              catch { handlers.current.onMessage?.(data) }
            }
            boundary = buffer.indexOf('\n\n')
          }
        }
      } catch {
        if (!controller.signal.aborted) handlers.current.onError?.(new Event('error'))
      } finally {
        if (!controller.signal.aborted) {
          setConnected(false)
          retry = setTimeout(reconnect, 3000)
        }
      }
    }
    void stream()
    return () => { controller.abort(); if (retry) clearTimeout(retry) }
  }, [url, enabled, revision, reconnect])

  return { connected, disconnect, reconnect }
}
