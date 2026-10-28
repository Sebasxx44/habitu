import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { cachedRead, clearReadCache } from '@/modules/realtime/readCache'
import { publishResourceChange, topicsForUrl } from '@/modules/realtime/resourceBus'
import type { NotificationInbox } from '@/types/notifications'
import type { AuthResponse, GoogleCredentials, LoginCredentials, User, UsersDirectory } from '@/types/auth'
import { emitToast } from '@/components/ui/Toast'

interface ApiMessage { message?: string; error?: string; errors?: Record<string, string[]> }
interface UserMutation { name?: string; email?: string; password?: string; role?: User['role']; barber_shop_id?: number | null; barber_id?: number | null; cliente_id?: number | null; roles?: number[] }
type RequestBody = object | string | number | boolean | null

const API_URL = '/api'
const TOKEN_KEY = 'eb_token'
const TOKEN_EXPIRY_KEY = 'eb_token_expiry'
const isPaymentReconciliation = (url: string): boolean => /^\/v2\/wompi\/orders\/[^/?]+\/reconcile(?:\?|$)/.test(url)

class HttpService {
  private client: AxiosInstance
  private token: string | null = null
  private sessionRevision = 0

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json' 
      },
      withCredentials: false,
    })

    const savedToken = localStorage.getItem(TOKEN_KEY)
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
    if (savedToken && expiry && Date.now() < parseInt(expiry)) {
      this.token = savedToken
    }

    this.client.interceptors.request.use((config) => {
      if (this.token && !this.isTokenValid()) this.clearToken()
      if (this.token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${this.token}`
      return config
    })

    this.client.interceptors.response.use(
      (response) => {
        if (this.isMutation(response.config.method) && !isPaymentReconciliation(response.config.url || '') && !/auth|quote|calculate|analytics\/events/.test(response.config.url || '')) publishResourceChange({ topics: topicsForUrl(response.config.url || '') })
        this.showMutationToast(response)
        return response
      },
      (error: AxiosError<ApiMessage>) => {
        this.showMutationError(error)
        if (error.response?.status === 401) {
          const url = error.config?.url || ''
          const currentSession = this.token && error.config?.headers?.Authorization === `Bearer ${this.token}`
          if (currentSession && !url.includes('/auth/login')) {
            this.clearToken()
            const restoringSession = /^\/auth\/(?:me|refresh-token)(?:\?|$)/.test(url)
            if (!restoringSession && !window.location.pathname.includes('/login')) window.location.href = `/login?${new URLSearchParams({ returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}` })}`
          }
        }
        return Promise.reject(error)
      }
    )
  }

  private isMutation(method?: string) {
    return ['post', 'put', 'patch', 'delete'].includes((method || '').toLowerCase())
  }

  private showMutationToast(response: AxiosResponse<ApiMessage>) {
    if (!this.isMutation(response.config.method)) return
    const url = response.config.url || ''
    if (isPaymentReconciliation(url)) return
    if (/\/(?:ads\/[^/]+\/(?:impression|click)|retention-actions\/[^/]+\/click)(?:\?|$)/.test(url)) return
    if (url.includes('/auth/login') || /^\/notifications\/(?:[^/]+\/read|read-all)(?:\?|$)/.test(url)) return
    if (url.includes('/on-demand/') || url.includes('/tracking/location') || url.includes('/notifications/stream') || url.includes('/appointments/quote') || url.includes('/ai-chat/') || url.includes('/dynamic-pricing/calculate') || url.includes('/analytics/events') || url.includes('/analytics/preferences')) return

    const method = (response.config.method || '').toLowerCase()
    const data = response.data || {}
    const message = data.message || this.defaultSuccessMessage(method, url)
    emitToast(message, 'success')
  }

  private showMutationError(error: AxiosError<ApiMessage>) {
    const config: AxiosRequestConfig = error.config || {}
    if (isPaymentReconciliation(config.url || '')) return
    if (/\/(?:ads\/[^/]+\/(?:impression|click)|retention-actions\/[^/]+\/click)(?:\?|$)/.test(config.url || '')) return
    if (!this.isMutation(config.method) || config.url?.includes('/auth/login') || config.url?.includes('/tracking/location') || config.url?.includes('/on-demand/') || /^\/notifications\/(?:[^/]+\/read|read-all)(?:\?|$)/.test(config.url || '')) return

    const data = error.response?.data || {}
    const validation = data.errors ? Object.values(data.errors).flat().join(' ') : ''
    const message = validation || data.message || data.error || this.defaultErrorMessage(config.method, config.url || '')
    emitToast(message, 'error')
  }

  private defaultSuccessMessage(method: string, url: string) {
    if (url.includes('/auth/login')) return 'Sesión iniciada'
    if (url.includes('/auth/logout')) return 'Sesión cerrada'
    if (url.includes('/cancel')) return 'Cancelado correctamente'
    if (url.includes('/complete')) return 'Completado correctamente'
    if (url.includes('/favorite')) return 'Favoritos actualizados'
    if (method === 'post') return 'Creado correctamente'
    if (method === 'put') return 'Actualizado correctamente'
    if (method === 'delete') return 'Eliminado correctamente'
    return 'Operación realizada'
  }

  private defaultErrorMessage(method?: string, url?: string) {
    if (url?.includes('/auth/login')) return 'No se pudo iniciar sesión'
    if ((method || '').toLowerCase() === 'delete') return 'No se pudo eliminar'
    if ((method || '').toLowerCase() === 'put') return 'No se pudo actualizar'
    return 'No se pudo completar la operación'
  }

  setToken(token: string, expiresIn = 3600) {
    this.sessionRevision += 1
    this.token = token
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000))
    clearReadCache()
    window.dispatchEvent(new Event('habitu:session-changed'))
  }

  clearToken() {
    this.sessionRevision += 1
    this.token = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    clearReadCache()
    window.dispatchEvent(new Event('habitu:session-changed'))
  }

  getSessionRevision = (): number => this.sessionRevision
  getToken = (): string | null => this.token

  isTokenValid(): boolean {
    const token = localStorage.getItem(TOKEN_KEY)
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
    return !!(token && expiry && Date.now() < parseInt(expiry))
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const key = `${this.sessionRevision}:${url}:${JSON.stringify(config?.params || {})}`
    const consumerSignal = config?.signal instanceof AbortSignal ? config.signal : undefined
    return cachedRead<T>(key, url, async (signal) => {
      const response: AxiosResponse<T> = await this.client.get(url, { ...config, signal: signal ?? config?.signal })
      return response.data
    }, !config?.responseType && !config?.headers && (!config?.signal || !!consumerSignal), consumerSignal)
  }

  async post<T>(url: string, data?: RequestBody, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: RequestBody, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config)
    return response.data
  }
}

export const httpService = new HttpService()

export class AuthService {
  private http: HttpService

  constructor(http: HttpService) {
    this.http = http
  }

  async login(credentials: LoginCredentials) {
    const version = this.http.getSessionRevision()
    const response = await this.http.post<AuthResponse>('/auth/login', credentials)
    if (version !== this.http.getSessionRevision()) throw new Error('La sesión cambió. Inicia sesión nuevamente.')
    if (response.token) {
      this.http.setToken(response.token, response.expires_in || 3600)
    }
    return response
  }

  async loginWithGoogle(googleData: GoogleCredentials) {
    const version = this.http.getSessionRevision()
    const response = await this.http.post<AuthResponse>('/auth/login-google', googleData)
    if (version !== this.http.getSessionRevision()) throw new Error('La sesión cambió. Inicia sesión nuevamente.')
    if (response.token) {
      this.http.setToken(response.token, response.expires_in || 3600)
    }
    return response
  }

  async me() {
    const response = await this.http.get<{ user: User; permissions: string[] }>('/auth/me')
    return response
  }

  getMe() {
    return this.me()
  }

  async logout() {
    const token = this.http.getToken()
    const pushDevice = localStorage.getItem('habitu_push_device_token')
    this.http.clearToken()
    localStorage.removeItem('habitu_push_device_token')
    localStorage.removeItem('habitu_push_device_user')
    if (token && pushDevice) {
      try { await this.http.post('/v2/push/unregister', { token: pushDevice }, { headers: { Authorization: `Bearer ${token}` } }) } catch { /* Signing out must remain available offline. */ }
    }
    if (token) await this.http.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
  }

  isLoggedIn(): boolean {
    return this.http.isTokenValid()
  }

  async refreshToken() {
    const version = this.http.getSessionRevision()
    const response = await this.http.post<{ token: string; expires_in: number }>('/auth/refresh-token')
    if (response.token && version === this.http.getSessionRevision()) {
      this.http.setToken(response.token, response.expires_in || 3600)
    }
    return response
  }

  async users(params?: { search?: string; role?: string; barber_shop_id?: string }) {
    return this.http.get<UsersDirectory>('/auth/users', { params })
  }

  async createUser(data: UserMutation) {
    return this.http.post('/auth/users', data)
  }

  async updateUser(id: number, data: UserMutation) {
    return this.http.put(`/auth/users/${id}`, data)
  }

  async deleteUser(id: number) {
    return this.http.delete(`/auth/users/${id}`)
  }
}

export const authService = new AuthService(httpService)

export class NotificationService {
  private http: HttpService

  constructor(http: HttpService) {
    this.http = http
  }

  async getAll() {
    return this.http.get<NotificationInbox>('/notifications')
  }

  async markRead(id: number | string) {
    return this.http.post<{ message: string }>(`/notifications/${encodeURIComponent(id)}/read`)
  }

  markAsRead = (id: number | string) => this.markRead(id)

  async markAllRead() {
    return this.http.post<{ message: string }>('/notifications/read-all')
  }

  createStream() {
    return null
  }
}

export const notificationService = new NotificationService(httpService)
