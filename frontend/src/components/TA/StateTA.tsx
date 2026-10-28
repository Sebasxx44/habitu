import { useTranslation } from 'react-i18next'
import { AlertCircle, CalendarDays, RefreshCw } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { LoadingTA } from "@/components/TA/LoadingTA";
import { SkeletonTA } from "@/components/TA/SkeletonTA";
import { cn } from "@/lib/utils";

// TYPES
interface StateProps {
  title: string;
  description: string;
  error?: boolean;
  loading?: boolean;
  onRetry?: () => void;
}

// COMPONENTS
export const StateTA = ({
  title,
  description,
  error = false,
  loading = false,
  onRetry,
}: StateProps) => {
  const { t } = useTranslation()
  const Icon = error ? AlertCircle : CalendarDays;
  if (loading) return <LoadingTA label={title} />;
  return (
    <div
      className="ta-empty-state flex flex-col items-center rounded-2xl px-5 py-10 text-center sm:px-6"
      role={error ? "alert" : "status"}
    >
      <div
        className={cn(
          "relative mb-5 grid size-16 place-items-center rounded-[1.25rem] border shadow-sm",
          error
            ? "border-destructive/15 bg-destructive/10 text-destructive"
            : "border-primary/15 bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-7" aria-hidden="true" />
        {!error && (
          <span
            className="absolute -right-1 -top-1 size-4 rounded-full border-[3px] border-card bg-accent"
            aria-hidden="true"
          />
        )}
      </div>
      <p className="text-base font-bold tracking-tight">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {onRetry && (
        <ButtonTA variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCw /> {t('shared.retry')}
        </ButtonTA>
      )}
    </div>
  );
};

export const DashboardSkeletonTA = () => (
  <SkeletonTA variant="dashboard" label="Cargando tu resumen…" />
);
