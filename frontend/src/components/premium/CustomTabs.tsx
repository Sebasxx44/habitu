import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TabOption {
  id: string
  label: string
  icon?: React.ElementType
}

interface CustomTabsProps {
  tabs: TabOption[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
  variant?: 'premium' | 'simple'
  id?: string
}

export const CustomTabs: React.FC<CustomTabsProps> = ({ 
  tabs, 
  activeTab, 
  onChange, 
  className,
  variant = 'premium',
  id = 'default-tabs'
}) => {
  return (
    <div className={cn(
      "flex items-center gap-1 p-1.5 rounded-[2rem] w-fit transition-all duration-300 relative",
      variant === 'premium' ? "bg-card/40 backdrop-blur-xl border border-border/40 shadow-inner" : "bg-transparent",
      className
    )}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-6 h-11 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 outline-none group",
              isActive 
                ? "text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {/* Sliding Background Indicator */}
            {isActive && (
              <motion.div
                layoutId={`${id}-active-bg`}
                className="absolute inset-0 bg-primary rounded-[1.25rem] shadow-lg shadow-primary/20"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30
                }}
              />
            )}
            
            <div className="relative z-10 flex items-center gap-2.5">
              {Icon && (
                <Icon 
                  className={cn(
                    "w-4 h-4 transition-all duration-300", 
                    isActive 
                      ? "text-primary-foreground scale-110" 
                      : "text-muted-foreground group-hover:text-primary group-hover:scale-110"
                  )} 
                />
              )}
              <span className="whitespace-nowrap">{tab.label}</span>
            </div>

            {/* Hover Indicator (Subtle) */}
            {!isActive && (
              <div className="absolute inset-0 bg-secondary/0 group-hover:bg-secondary/40 rounded-[1.25rem] transition-colors duration-300 -z-0" />
            )}
          </button>
        )
      })}
    </div>
  )
}
