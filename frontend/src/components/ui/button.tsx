import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-2xl border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all duration-300 outline-none select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm shadow-habitu-primary/10 hover:bg-habitu-dark focus-visible:ring-2 focus-visible:ring-habitu-primary/40",
        outline: "border-habitu-border bg-card hover:bg-habitu-surface/30 hover:text-habitu-ink aria-expanded:bg-habitu-surface/30",
        secondary: "bg-habitu-cream text-habitu-primary border-habitu-border hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-habitu-primary/30",
        ghost: "hover:bg-habitu-surface/30 hover:text-habitu-ink aria-expanded:bg-habitu-surface/20",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive/40",
        link: "text-habitu-primary underline-offset-4 hover:underline font-medium",
        gold: "bg-accent text-accent-foreground shadow-md shadow-habitu-gold/20 hover:bg-habitu-gold/90 focus-visible:ring-2 focus-visible:ring-habitu-gold/40",
      },
      size: {
        default: "h-10 gap-1.5 px-5",
        xs: "h-7 gap-1 rounded-xl px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-xl px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-7 text-base rounded-2xl",
        xl: "h-14 gap-2.5 px-8 text-base font-bold rounded-2xl",
        icon: "size-10 rounded-2xl",
        "icon-sm": "size-8 rounded-xl",
        "icon-lg": "size-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonPrimitive.Props & VariantProps<typeof buttonVariants>
>(({ className, variant = "default", size = "default", ...props }, ref) => {
  return (
    <ButtonPrimitive
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
