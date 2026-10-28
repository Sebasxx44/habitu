// DOMAIN
export interface AssistantSlot {
  start_time: string;
  end_time: string;
  professional_id: number | null;
  professional_name: string | null;
  price: number;
  duration_minutes: number;
  resource_id?: number | null;
  resource_name?: string | null;
  participants?: number;
  booking_model?: "professional" | "resource" | "direct" | "optional_professional" | "capacity";
}
export interface AssistantCard {
  time?: string;
  prepared_action?: "review_booking" | "review_reschedule" | "review_cancellation";
  proposed_slots?: { start_time: string; end_time: string; price: number }[];
  checked_at?: string;
  expires_at?: string;
  reasons?: string[];
  type: "service" | "appointment";
  appointment_id?: number;
  status?: string;
  business_id: number;
  business_name: string;
  branch_id: number;
  branch_name: string;
  address: string;
  service_id: number;
  service_name: string;
  price: number;
  original_price?: number;
  discounted_price?: number;
  currency: string;
  duration_minutes: number;
  resource_id?: number | null;
  resource_name?: string | null;
  participants?: number;
  booking_model?: "professional" | "resource" | "direct" | "optional_professional" | "capacity";
  professional_id: number | null;
  professional_name: string | null;
  date: string | null;
  slots: AssistantSlot[];
  promotion: {
    id: number;
    title: string;
    code: string;
    discount: number;
    type: string;
  } | null;
  url: string;
}
export interface AssistantContext {
  resource_id?: number;
  duration_minutes?: number;
  participants?: number;
  locale?: "es" | "en";
  service_id?: number;
  business_id?: number;
  branch_id?: number;
  professional_id?: number;
  date?: string;
  time_from?: string;
  time_to?: string;
  max_price?: number;
  lat?: number;
  lng?: number;
  zone?: string;
}
export interface AssistantSearchContext {
  q?: string;
  date?: string;
  date_to?: string;
  time_from?: string;
  time_to?: string;
  zone?: string;
}
export interface AIMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  metadata?: {
    summary?: { date: string; total: number; active: number; pending_confirmation: number; pending_arrival: number; occupied_minutes: number };
    source?: string;
    intent?: string;
    cards?: AssistantCard[];
    requires_confirmation?: boolean;
    clarification_required?: boolean;
    search_context?: AssistantSearchContext;
    location_required?: boolean;
    recommendations?: {
      service?: {
        id: number;
        name: string;
        price: number;
        duration: number;
      } | null;
      professional?: { id: number; name: string } | null;
    } | null;
  };
}
export interface AIConversation {
  id: number;
  session_id: string;
  context_type: string;
  status: string;
  last_activity_at: string;
  messages: AIMessage[];
}
export interface AssistantState {
  conversation: {
    history: AIConversation[];
    messages: AIMessage[];
    session: string | null;
    loading: boolean;
    sending: boolean;
    error: string;
  };
  composer: {
    text: string;
    setText: (value: string) => void;
    image: string | null;
    selectImage: (file?: File) => void;
    clearImage: () => void;
  };
  actions: {
    send: (text?: string, context?: AssistantContext) => Promise<void>;
    open: (session: string) => Promise<void>;
    start: () => Promise<void>;
    close: () => Promise<void>;
    forget: () => Promise<void>;
    retryHistory: () => Promise<void>;
  };
  location: {
    enabled: boolean;
    loading: boolean;
    enable: () => void;
    disable: () => void;
  };
}
