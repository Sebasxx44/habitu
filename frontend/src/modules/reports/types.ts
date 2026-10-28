import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
// TYPES
export interface ReportExportJob {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  attempts: number;
  rows_processed: number;
  error: string | null;
  created_at: string;
  expires_at: string;
  filters: { start_date: string; end_date: string; currency: string };
}

export interface ReportExportsState {
  queue: { jobs: ReportExportJob[]; loading: boolean; submitting: boolean; downloading: string | null; error: string | null };
  actions: { create: () => Promise<void>; refresh: () => Promise<void>; download: (job: ReportExportJob) => Promise<void> };
}

export interface ReportRecord {
  id: number;
  fecha: string;
  hora: string;
  cliente: string;
  telefono: string | null;
  barbero: string;
  servicio: string;
  categoria: string | null;
  duracion: number | null;
  estado: string;
  currency: string;
  metodo_pago: string;
  valor_servicio: number;
  descuento: number;
  valor_final: number;
  total_pagado: number;
  comision_barbero: null;
  ganancia_neta: null;
  sucursal: string;
}
export interface DetailedReport {
  shop: { id: number; name: string } | null;
  currency: string;
  currencies: string[];
  summary: {
    totalRevenue: number;
    avgTicket: number;
    totalAppointments: number;
    completedAppointments: number;
    completionRate: number;
    noShowRate: number;
    newClients: number;
    returningClients: number;
    totalProfessionals: number;
    totalClients: number;
  };
  barberStats: {
    name: string;
    appointments: number;
    completed: number;
    revenue: number;
  }[];
  topServices: { name: string; count: number; revenue: number }[];
  dailyTrend: { date: string; count: number; revenue: number }[];
  statusDistribution: { status: string; count: number }[];
  paymentMethods: { method: string; count: number; revenue: number }[];
  records: ReportRecord[];
  period: { start: string; end: string };
}
export interface ReportFilters {
  start: string;
  end: string;
  currency: string;
  search: string;
  status: string;
  professional: string;
  service: string;
  payment: string;
}
export interface ReportsState {
  report: {
    data: DetailedReport | null;
    loading: boolean;
    error: string | null;
  };
  filters: {
    values: ReportFilters;
    range: DateRangeValue;
    setRange: (value: DateRangeValue) => void;
    update: <Key extends keyof ReportFilters>(
      key: Key,
      value: ReportFilters[Key],
    ) => void;
  };
  records: {
    filtered: ReportRecord[];
    visible: ReportRecord[];
    page: number;
    pages: number;
    setPage: (page: number) => void;
  };
  actions: { reload: () => void };
}
