import type { ReactNode, SelectHTMLAttributes } from "react";
import { MailCheck, MailWarning } from "lucide-react";
import { campaignStatuses } from "@/modules/campaigns/campaignDomain";
import type {
  CampaignOptions,
  CampaignStatus,
} from "@/modules/campaigns/types";

// COMPONENTS
export const CampaignSelectTA = ({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={`min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-primary disabled:opacity-50 ${className}`}
    {...props}
  />
);
export const CampaignFieldTA = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <label className="block space-y-2 text-sm">
    <span className="font-medium">{label}</span>
    {children}
    {hint && (
      <span className="block text-xs leading-relaxed text-muted-foreground">
        {hint}
      </span>
    )}
  </label>
);
export const CampaignMetricTA = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) => (
  <article className="rounded-2xl border border-border bg-card p-5">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
      {value}
    </p>
    <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
  </article>
);
export const CampaignStatusTA = ({ status }: { status: CampaignStatus }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : status === "FAILED" ? "bg-destructive/10 text-destructive" : status === "DRAFT" ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary"}`}
  >
    {campaignStatuses[status]}
  </span>
);
export const CampaignIntegrationTA = ({
  integration,
}: {
  integration: CampaignOptions["integration"];
}) => {
  const ready = integration.configured && integration.delivery_enabled;
  const Icon = ready ? MailCheck : MailWarning;
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 ${ready ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/25 bg-amber-500/5"}`}
    >
      <Icon
        className={`mt-0.5 size-5 shrink-0 ${ready ? "text-emerald-600" : "text-amber-600"}`}
      />
      <div>
        <p className="text-sm font-semibold">
          {ready
            ? "Correo listo para enviar"
            : "El envío de correos requiere configuración"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {ready
            ? "Los mensajes se procesan en segundo plano. Consulta el resultado por destinatario en cada campaña."
            : "Puedes preparar y guardar borradores. Configura el proveedor de correo y su remitente para habilitar los envíos."}
        </p>
      </div>
    </div>
  );
};
