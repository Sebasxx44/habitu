import React from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription 
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface PremiumModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
  className?: string
  contentClassName?: string
  showCloseButton?: boolean
  padding?: boolean
  closeButtonColor?: 'light' | 'dark'
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = "sm:max-w-3xl",
  className,
  contentClassName,
  showCloseButton = true,
  padding = true,
  closeButtonColor = 'dark'
}) => {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className={cn(
          "bg-card border-border/40 text-foreground rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden outline-none p-0",
          "shadow-[var(--habitu-shadow-dark)] border border-border",
          "data-[slot=dialog-content]:animate-in data-[slot=dialog-content]:fade-in-0 data-[slot=dialog-content]:zoom-in-95 data-[slot=dialog-content]:duration-500",
          maxWidth,
          className
        )}
      >
        <div className="relative max-h-[90vh] flex flex-col overflow-hidden">
          {/* Custom Premium Close Button - Top Right */}
          {showCloseButton && (
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={() => onOpenChange(false)}
              className={cn(
                "absolute top-6 right-6 z-[100] w-12 h-12 rounded-full",
                "backdrop-blur-xl flex items-center justify-center transition-all duration-300",
                "border border-white/10 hover:scale-110 active:scale-95 group shadow-xl",
                closeButtonColor === 'dark' 
                  ? "bg-black/65 hover:bg-black/80 text-white" 
                  : "bg-white/95 hover:bg-white text-[#171A2B]"
              )}
            >
              <X className="w-6 h-6 transition-transform duration-500 group-hover:rotate-90" />
            </button>
          )}

          {/* Header */}
          {(title || description) && (
            <DialogHeader className={cn("border-b border-primary/10 bg-primary/[0.04] pl-5 pr-20 pt-7 pb-5 sm:pl-8 sm:pr-24", !padding && "pb-0")}>
              {title && (
                <DialogTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                  {title}
                </DialogTitle>
              )}
              {description && (
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </DialogDescription>
              )}
            </DialogHeader>
          )}
          
          {/* Content Body */}
          <div className={cn(
            "flex-1 overflow-y-auto custom-scrollbar",
            padding ? "px-5 pb-6 sm:px-8 sm:pb-8" : "p-0",
            contentClassName
          )}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 p-5 sm:px-8 bg-secondary/70 border-t border-primary/10">
              {footer}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
