import type { LucideIcon } from "lucide-react";

// COMPONENT
export const ServiceMetricTA = ({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
}) => (
  <div className="stat-card min-w-0 rounded-2xl border border-primary/10 p-4 sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-2 text-muted-foreground">
      <p className="text-xs font-medium">{label}</p>
      <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
    </div>
    <p className="break-words text-xl font-semibold tracking-tight sm:text-2xl">
      {value}
    </p>
    <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
  </div>
);
