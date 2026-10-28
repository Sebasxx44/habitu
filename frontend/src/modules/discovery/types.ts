import type { RefObject } from 'react'

// VOICE SEARCH
export interface VoiceRecognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
export interface VoiceRecognitionConstructor { new (): VoiceRecognition }
export interface VoiceSearchState {
  voice: { supported: boolean; listening: boolean; error: string; transcript: string }
  actions: { start: () => void; stop: () => void; edit: (text: string) => void }
}

// STYLE PREVIEW
export interface PreviewStyle { id: string; name: string; category: 'HAIR' | 'BEARD'; path: string; description: string }
export interface LookSettings { style: string; color: string; scale: number; x: number; y: number; opacity: number }
export interface SavedLook { settings: LookSettings; favorites: string[] }
export interface LookState {
  look: { settings: LookSettings; favorites: string[]; active: PreviewStyle; message: string; error: string }
  actions: { update: <Key extends keyof LookSettings>(field: Key, value: LookSettings[Key]) => void; favorite: (id: string) => void; save: () => void }
}
export interface PreviewCameraState {
  media: { videoRef: RefObject<HTMLVideoElement>; active: boolean; starting: boolean; photo: string; error: string }
  actions: { start: () => Promise<void>; stop: () => void; upload: (file?: File) => void }
}
