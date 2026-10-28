import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"


interface PremiumSelectOption {
  value: string
  label: string
  description?: string
  icon?: React.ElementType
  iconColor?: string
}

interface PremiumSelectProps {
  value?: string
  onValueChange: (value: string) => void
  options: PremiumSelectOption[]
  placeholder?: string
  label?: string
  className?: string
  triggerClassName?: string
  contentClassName?: string
  variant?: 'filter' | 'action'
}

export const PremiumSelect = ({
  value,
  onValueChange,
  options,
  placeholder = "Seleccionar...",
  label,
  className,
  triggerClassName,
  contentClassName,
  variant = 'filter'
}: PremiumSelectProps) => {
  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Select value={value} onValueChange={next => { if (next !== null) onValueChange(next) }}>
        <SelectTrigger 
          className={cn(
            "h-24 px-9 py-6 rounded-[2rem] bg-card/40 backdrop-blur-md border-border/50 transition-all duration-300 hover:bg-card/60 focus:ring-primary/20",
            variant === 'action' ? "w-auto min-w-[180px] gap-4 h-16" : "w-full",
            triggerClassName
          )}
        >
          <div className="flex flex-col items-start text-left flex-1 overflow-hidden">
            {label && (
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70 leading-none mb-1.5">
                {label}
              </span>
            )}
            <div className="flex items-center gap-2.5 w-full">
              {selectedOption?.icon && (
                <selectedOption.icon className={cn("w-5 h-5 shrink-0", selectedOption.iconColor || "text-primary")} />
              )}
              <div className="flex-1 overflow-hidden">
                <SelectValue placeholder={placeholder}>
                  <span className="truncate block font-bold text-base tracking-tight">
                    {selectedOption?.label || placeholder}
                  </span>
                </SelectValue>
              </div>
            </div>
          </div>
        </SelectTrigger>
        
        <SelectContent 
          className={cn(
            "rounded-[1.8rem] border-border/50 bg-card/95 backdrop-blur-xl p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200",
            contentClassName
          )}
        >
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="rounded-xl px-4 py-2 mb-1 last:mb-0 focus:bg-primary/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 py-0.5">
                {option.icon && (
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                    option.iconColor || "bg-primary/10 text-primary"
                  )}>
                    <option.icon className="w-5 h-5" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-foreground tracking-tight">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="text-[10px] font-medium text-muted-foreground leading-tight mt-0.5">
                      {option.description}
                    </span>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
