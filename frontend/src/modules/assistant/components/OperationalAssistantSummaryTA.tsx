import { useTranslation } from "react-i18next";
import type { AIMessage } from "@/modules/assistant/types";

// COMPONENT
export const OperationalAssistantSummaryTA = ({
  summary,
}: {
  summary: NonNullable<AIMessage["metadata"]>["summary"];
}) => {
  // COMPOSABLES
  const { i18n } = useTranslation();
  // COMPUTED
  const english = i18n.language.startsWith("en");
  if (!summary) return null;
  const metrics = [
    {
      label: english ? "Active bookings" : "Reservas activas",
      value: summary.active,
    },
    {
      label: english ? "Pending confirmation" : "Por confirmar",
      value: summary.pending_confirmation,
    },
    {
      label: english
        ? "Pending arrival (verify)"
        : "Llegada pendiente (verificar)",
      value: summary.pending_arrival,
    },
    {
      label: english ? "Scheduled minutes" : "Minutos programados",
      value: summary.occupied_minutes,
    },
  ];
  // RENDER
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-xl border border-border bg-card p-3"
        >
          <dt className="text-xs text-muted-foreground">{metric.label}</dt>
          <dd className="mt-1 text-xl font-semibold">{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
};
