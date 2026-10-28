import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// COMPONENT
export const InputTA = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground hover:border-primary/60 focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_hsl(var(--primary)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
InputTA.displayName = "InputTA";
