import { useTranslation } from 'react-i18next'
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type OnDemandStatus =
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

interface OnDemandStatusBadgeProps {
  status: OnDemandStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  SEARCHING: {
    label: 'Buscando profesional',
    className: 'bg-amber-500 text-white animate-pulse',
  },
  ACCEPTED: { label: 'Aceptado', className: 'bg-green-500 text-white' },
  ON_THE_WAY: { label: 'En camino', className: 'bg-blue-500 text-white' },
  IN_PROGRESS: { label: 'En servicio', className: 'bg-purple-500 text-white' },
  COMPLETED: { label: 'Completado', className: 'bg-emerald-500 text-white' },
  CANCELLED: { label: 'Cancelado', className: 'bg-red-500 text-white' },
};

export const OnDemandStatusBadge = ({ status, className }: OnDemandStatusBadgeProps) => {
  const {t}=useTranslation()
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-500 text-white',
  };
  return (
    <Badge
      className={cn('font-semibold capitalize', config.className, className)}
    >
      {t(`onDemandStatus.${status}`,{defaultValue:config.label})}
    </Badge>
  );
}
