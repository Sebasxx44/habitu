import { forwardRef, type ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// TYPES
type ButtonTAProps = ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingLabel?: string;
};

// COMPONENT
export const ButtonTA = forwardRef<
  HTMLButtonElement,
  ButtonTAProps
>(({ className, children, loading = false, loadingLabel, disabled, variant = "default", ...props }, ref) => (
  <Button
    ref={ref}
    variant={variant}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cn(
      "ta-button min-h-11 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transform-none",
      variant === "default" && "shadow-[0_4px_12px_hsl(var(--primary)/0.2)] hover:shadow-[0_6px_18px_hsl(var(--primary)/0.28)]",
      variant === "outline" && "text-card-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
      variant === "secondary" && "border-primary/10 hover:border-primary/25",
      className,
    )}
    {...props}
  >
    {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
    {loading && loadingLabel ? loadingLabel : children}
  </Button>
));
ButtonTA.displayName = "ButtonTA";
