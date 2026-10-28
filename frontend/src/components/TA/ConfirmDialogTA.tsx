import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ButtonTA } from "@/components/TA/ButtonTA";

// TYPES
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

// COMPONENT
export const ConfirmDialogTA = ({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  error,
  onClose,
  onConfirm,
}: ConfirmDialogProps) => (
  <Dialog
    open={open}
    onOpenChange={(value) => {
      if (!value && !busy) onClose();
    }}
  >
    <DialogContent showCloseButton={!busy} className="rounded-2xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="leading-relaxed">
          {description}
        </DialogDescription>
      </DialogHeader>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <DialogFooter className="gap-2">
        <ButtonTA variant="outline" disabled={busy} onClick={onClose}>
          Volver
        </ButtonTA>
        <ButtonTA loading={busy} loadingLabel="Confirmando…" onClick={onConfirm}>
          {confirmLabel}
        </ButtonTA>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
