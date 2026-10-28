import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm font-medium text-habitu-ink placeholder:text-habitu-muted focus:outline-none focus:ring-2 focus:ring-habitu-primary/30 focus:border-habitu-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all min-h-[100px]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
