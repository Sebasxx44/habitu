// ============================================
// MULTISERVICE TYPES (New)
// ============================================

export interface Business {
  id: number
  name: string
  slug?: string
  address?: string
  phone?: string
  email?: string
  description?: string
  booking_mode?: 'internal' | 'external'
  booking_url?: string | null
  listing_source_url?: string | null
  lat?: string | number | null
  lng?: string | number | null
  license?: License
  income?: number
  primary_color?: string
  banner_url?: string
  logo_url?: string
  verified?: boolean
  rating?: number
  business_category_id?: number
  category?: BusinessCategory
  branches?: Branch[]
  services?: Service[]
  professionals?: Professional[]
  reviews?: Review[]
  reviews_count?: number
  is_active?: boolean
  main_branch?: Branch
  mainBranch?: Branch
  latitude?: number
  longitude?: number
}

export interface BusinessCategory {
  id: number
  name: string
  slug: string
  icon?: string
  color?: string
  description?: string
}

export interface Branch {
  id: number
  business_id: number
  name: string
  address: string
  phone?: string
  email?: string
  lat?: string | number | null
  lng?: string | number | null
  is_main_branch?: boolean
  is_active?: boolean
}

export interface Professional {
  id: number
  name: string
  email?: string
  phone?: string
  business_id: number
  specialty?: string
  bio?: string
  photo_url?: string
  commission_percentage?: number
  is_active?: boolean
  active?: boolean
  address?: string
  birthday?: string
  identification_number?: string
  social_media?: { instagram?: string; facebook?: string; twitter?: string }
  created_at?: string
}

export interface ProfessionalAvailability {
  id: number
  professional_id: number
  branch_id: number
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

export interface Resource {
  id: number
  business_id: number
  branch_id: number
  name: string
  type: 'FIELD' | 'ROOM' | 'CHAIR' | 'CABIN' | 'MACHINE' | 'SPACE' | 'COURT' | 'STATION' | 'TABLE' | 'EQUIPMENT' | 'OTHER'
  description?: string
  capacity?: number
  image_url?: string
  is_active?: boolean
  attributes?: { sport_type?: string; surface?: string; covered?: boolean }
}

// ============================================
// LEGACY ALIASES (Backward Compatibility)
// ============================================

/** @deprecated Use Business instead */
export type BarberShop = Business

/** @deprecated Use Professional instead */
export type Barber = Professional

/** @deprecated Use business_id instead */
export type barbershop_id = number

// ============================================
// SHARED TYPES
// ============================================

export interface License {
  id: number
  shop_id: number
  plan_id: number
  status: 'ACTIVA' | 'VENCIDA' | 'PENDIENTE'
  start_date: string
  end_date: string
  price: number
}

export interface Client {
  id: number
  name: string
  email: string
  phone: string
  business_id?: number
  barbershop_id?: number // legacy alias
  photo_url?: string
  total_visits?: number
  last_visit_date?: string
  last_visit_service?: string
  subscription_status?: 'ACTIVA' | 'INACTIVA' | 'NINGUNA'
  created_at: string
}

export interface ServiceMedia { url: string; type: 'image' | 'video'; caption?: string }

export interface Service {
  is_active?: boolean
  id: number
  name: string
  price: number
  duration: number
  duration_minutes?: number // alias
  business_id?: number
  barbershop_id?: number // legacy alias
  requires_professional?: boolean
  description?: string
  category?: string
  media_gallery?: ServiceMedia[]
  barber_shop_id?: number
  image_url?: string
  booking_model?: 'professional' | 'resource' | 'direct' | 'optional_professional' | 'capacity'
  duration_mode?: 'fixed' | 'selectable'
  duration_options?: number[]
  booking_capacity?: number
  resource_professional_optional?: boolean
  min_advance_minutes?: number
  max_advance_days?: number | null
  slot_interval_minutes?: number
  buffer_minutes?: number
  requires_confirmation?: boolean
  allow_cancellation?: boolean
  allow_reschedule?: boolean
  cancellation_notice_minutes?: number
  reschedule_notice_minutes?: number
  resources?: Resource[]
}

export interface Appointment {
  id: number
  professional_id?: number
  barber_id?: number // legacy alias
  client_id: number
  service_id: number
  business_id?: number
  barbershop_id?: number // legacy alias
  branch_id?: number
  resource_id?: number
  date: string
  time: string
  start_time?: string // alias
  end_time?: string
  status: 'PENDIENTE' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA' | 'NO_ASISTIO'
  total: number
  price?: number // alias
  created_at: string
}

export interface Plan {
  id: number
  name: string
  description: string
  price: number
  duration_days: number
  max_professionals?: number
  max_barbers?: number // legacy alias
}

export interface Subscription {
  id: number
  client_id: number
  plan_id: number
  business_id?: number
  barbershop_id?: number // legacy alias
  status: 'ACTIVA' | 'CANCELADA'
  start_date: string
  end_date: string
}

export interface Expense {
  id: number
  business_id?: number
  barbershop_id?: number // legacy alias
  category: string
  description: string
  amount: number
  date: string
}

export interface Review {
  id: number
  client_id: number
  business_id?: number
  barbershop_id?: number // legacy alias
  professional_id?: number
  branch_id?: number
  rating: number
  service_rating?: number | null
  professional_rating?: number | null
  business_rating?: number | null
  is_verified?: boolean
  comment: string
  created_at: string
}

export interface BranchSchedule {
  id: number
  branch_id: number
  day: string
  open_time: string
  close_time: string
  is_closed: boolean
}

export interface Promotion {
  id: number
  business_id?: number
  barbershop_id?: number // legacy alias
  title: string
  description: string
  discount: number
  start_date: string
  end_date: string
  active: boolean
}

export interface LoyaltyTransaction {
  id: number
  client_id: number
  business_id?: number
  barbershop_id?: number // legacy alias
  points: number
  type: 'GANADOS' | 'CANJEADOS'
  description: string
  created_at: string
}

export interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  read: boolean
  created_at: string
}

// Legacy alias
/** @deprecated Use BranchSchedule instead */
export type Hour = BranchSchedule
