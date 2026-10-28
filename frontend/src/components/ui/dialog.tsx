"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"
import { ButtonTA } from "@/components/TA/ButtonTA"
import { XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 isolate z-[9999] bg-black/40 backdrop-blur-sm duration-150 data-[open]:animate-in data-[open]:fade-in-0 data-[closed]:animate-out data-[closed]:fade-out-0", className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & { showCloseButton?: boolean }) {
  const { t } = useTranslation()
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-[9999] w-full max-w-[calc(100%-1rem)] -translate-x-1/2 -translate-y-1/2 rounded-[1.25rem] bg-card border border-habitu-border shadow-[0_24px_60px_rgba(0,0,0,0.15)] p-6 text-sm duration-150 outline-none max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain scroll-py-6 sm:max-w-md data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95",
          showCloseButton && "[&_[data-slot=dialog-header]]:pr-10",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <ButtonTA variant="ghost" size="icon" className="absolute top-2 right-2" aria-label={t('common.close')} />
            }
          >
            <XIcon aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, showCloseButton = false, children, ...props }: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  const { t } = useTranslation()
  return (
    <div
      data-slot="dialog-footer"
      className={cn("-mx-6 -mb-6 flex flex-col-reverse gap-3 rounded-b-[1.25rem] border-t border-habitu-border bg-habitu-surface/50 p-6 sm:flex-row sm:justify-end mt-6", className)}
      {...props}
    >
      {children}
      {showCloseButton && <DialogPrimitive.Close render={<ButtonTA variant="outline" />}>{t('common.close')}</DialogPrimitive.Close>}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-display text-lg font-bold leading-tight text-habitu-ink", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-habitu-muted", className)}
      {...props}
    />
  )
}

export {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogOverlay, DialogPortal,
  DialogTitle, DialogTrigger,
}
