import type { ReactNode } from "react";
import { Sparkles, type LucideIcon } from "lucide-react";

// TYPES
interface ActionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: LucideIcon;
}

// COMPONENT
export const ActionHeaderTA = ({
  eyebrow,
  title,
  description,
  actions,
  icon: Icon = Sparkles,
}: ActionHeaderProps) => (
  <header className="ta-action-header flex flex-col justify-between gap-5 rounded-3xl border border-primary/10 p-5 sm:flex-row sm:items-end sm:p-6">
    <div className="min-w-0">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-habitu-blue text-white shadow-sm shadow-habitu-blue/20">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {eyebrow && (
          <p className="rounded-full bg-accent px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-accent-foreground">
            {eyebrow}
          </p>
        )}
      </div>
      <h1 className="text-2xl font-extrabold tracking-[-0.045em] text-foreground sm:text-3xl md:text-[36px] md:leading-tight">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
    {actions && (
      <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:[&>*]:flex-1">
        {actions}
      </div>
    )}
  </header>
);
