import { LoaderCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// TYPES
interface LoadingTAProps {
  label?: string;
  compact?: boolean;
  className?: string;
}

// COMPONENT
export const LoadingTA = ({
  label = "Cargando…",
  compact = false,
  className,
}: LoadingTAProps) => (
  <div
    role="status"
    aria-busy="true"
    className={cn(
      "flex items-center justify-center gap-3 text-primary",
      compact ? "py-4" : "flex-col px-6 py-12",
      className,
    )}
  >
    {compact ? (
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
    ) : (
      <div className="relative mb-2 grid size-20 place-items-center">
        <LoaderCircle
          className="absolute inset-0 size-20 animate-spin stroke-[1.25] text-primary/25"
          aria-hidden="true"
        />
        <span className="grid size-12 place-items-center rounded-2xl bg-habitu-blue text-white shadow-lg shadow-habitu-blue/20">
          <Sparkles className="size-6" aria-hidden="true" />
        </span>
        <span
          className="absolute right-0 top-1 size-3 rounded-full border-2 border-card bg-accent"
          aria-hidden="true"
        />
      </div>
    )}
    <span className="text-sm font-semibold text-muted-foreground">{label}</span>
  </div>
);
