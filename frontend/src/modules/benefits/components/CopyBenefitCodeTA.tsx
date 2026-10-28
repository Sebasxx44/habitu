import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";

// COMPONENT
export const CopyBenefitCodeTA = ({ code }: { code: string }) => {
  const { t } = useTranslation("benefits");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setError(false);
    } catch {
      setError(true);
    }
  };
  return (
    <div>
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-dashed border-current/20 bg-background/50 px-3 py-2">
        <code className="min-w-0 flex-1 select-all break-all text-xs font-semibold tracking-wide">
          {code}
        </code>
        <ButtonTA
          size="icon"
          variant="ghost"
          aria-label={t(copied ? "copied" : "copy")}
          onClick={() => {
            void copy();
          }}
        >
          {copied ? <Check /> : <Copy />}
        </ButtonTA>
      </div>
      {error && (
        <p role="status" className="mt-2 text-xs">
          {t("copyError")}
        </p>
      )}
    </div>
  );
};
