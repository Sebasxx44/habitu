export interface AccountPreferences { language: 'es' | 'en'; theme: 'light' | 'dark' | 'system'; appointment_reminders: boolean; email_notifications: boolean }

export type UserRole = 'SUPERADMIN' | 'ADMIN_BARBERIA' | 'PROFESSIONAL' | 'CLIENTE'

export interface Permission {
  id: number
  name: string
  slug: string
  description?: string | null
  group?: string
}

export interface Role {
  id: number
  name: string
  slug: string
  permissions?: Permission[]
  type?: string
  description?: string | null
}

export interface User {
  avatar_url?: string | null
  phone?: string | null
  preferences?: AccountPreferences | null
  id: number
  name: string
  email: string
  role: UserRole
  barber_shop_id?: number | null
  barber_id?: number | null
  cliente_id?: number | null
  roles?: Role[]
  created_at?: string
  barber_shop?: UserBusiness | null
}

export interface AuthResponse {
  token: string
  user: User
  expires_in: number
  is_new_user?: boolean
}

export interface AuthResult {
  user: User
  is_new_user?: boolean
}

export interface LoginCredentials {
  email: string
  password: string
  two_factor_code?: string
}

export interface GoogleCredentials {
  id_token: string
  two_factor_code?: string
  password?: string
}

export interface UserBusiness {
  id: number
  name: string
  address?: string
}

export interface UsersDirectory {
  users: User[]
  roles: Role[]
  barberShops: UserBusiness[]
}

export interface UserDetails {
  phone?: string | null
  loyalty_points?: number
  notes?: string | null
  rating?: number | string | null
  is_active?: boolean
  stats?: { today_appointments?: number; today_revenue?: number | string }
}

export interface PermissionDirectory {
  permissions: Permission[]
  grouped: Record<string, Permission[]>
}
