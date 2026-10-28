import type { ReactNode, SelectHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { InputTA } from "@/components/TA/InputTA";
import type {
  OperationFeedback,
  OperationOption,
} from "@/modules/operations/types";

// COMPONENTS
export const OperationFieldTA = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <label className="grid gap-2 text-sm font-medium">
    <span>{label}</span>
    {children}
  </label>
);
export const OperationSelectTA = (
  props: SelectHTMLAttributes<HTMLSelectElement>,
) => (
  <select
    {...props}
    className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-primary disabled:opacity-50"
  />
);
export const OperationFeedbackTA = ({
  feedback,
}: {
  feedback: OperationFeedback;
}) => {
  const { t } = useTranslation("operations");
  return (
    <div aria-live="polite">
      {feedback.error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          {feedback.error}
        </p>
      )}
      {feedback.saved && (
        <p role="status" className="text-sm text-primary">
          {t("saved")}
        </p>
      )}
    </div>
  );
};
export const OperationServicesTA = ({
  services,
  selected,
  toggle,
}: {
  services: OperationOption[];
  selected: number[];
  toggle: (id: number) => void;
}) => (
  <div className="flex flex-wrap gap-3">
    {services.map((service) => (
      <label
        key={service.id}
        className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm"
      >
        <InputTA
          className="min-h-4 w-4 accent-primary"
          type="checkbox"
          checked={selected.includes(service.id)}
          onChange={() => toggle(service.id)}
        />
        {service.name}
      </label>
    ))}
  </div>
);
