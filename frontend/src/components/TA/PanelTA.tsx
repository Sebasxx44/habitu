import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// TYPES
interface PanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "default" | "primary" | "accent";
  icon?: LucideIcon;
}

// COMPONENT
export const PanelTA = ({
  title,
  description,
  action,
  children,
  className,
  tone = "default",
  icon: Icon,
}: PanelProps) => (
  <section
    data-tone={tone}
    className={cn("ta-panel surface-card overflow-hidden", className)}
  >
    <div className="ta-panel-header flex flex-wrap items-start justify-between gap-3 px-5 pb-4 pt-5 md:px-6 md:pt-6">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="ta-panel-icon grid size-10 shrink-0 place-items-center rounded-xl">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);
