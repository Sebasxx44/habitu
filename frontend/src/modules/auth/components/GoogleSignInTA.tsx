import { Loader2, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { useGoogleSignIn } from "@/modules/auth/composables/useGoogleSignIn";

// TYPES
interface GoogleSignInProps {
  onCredential: (credential: string) => Promise<void>;
  disabled: boolean;
}

// COMPONENT
export const GoogleSignInTA = ({
  onCredential,
  disabled,
}: GoogleSignInProps) => {
  // COMPOSABLES
  const { t } = useTranslation("authUi");
  const { buttonRef, feedback, actions } = useGoogleSignIn(
    onCredential,
    disabled,
  );

  if (!feedback.configured) return null;

  return (
    <div className="mt-7">
      <div className="mb-6 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("separator")}
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="relative min-h-11">
        <div
          ref={buttonRef}
          className="flex min-h-11 w-full justify-center"
          aria-disabled={disabled}
        />
        {feedback.status === "loading" && (
          <p
            role="status"
            className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("googleLoading")}
          </p>
        )}
        {feedback.status === "error" && (
          <div className="rounded-xl bg-secondary/60 px-4 py-3 text-center">
            <p
              className="text-xs leading-relaxed text-muted-foreground"
              role="status"
            >
              {t("googleUnavailable")}
            </p>
            <ButtonTA
              type="button"
              variant="ghost"
              size="sm"
              onClick={actions.retry}
              disabled={disabled}
              className="mt-1 gap-2 text-xs"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {t("retry")}
            </ButtonTA>
          </div>
        )}
      </div>
    </div>
  );
};
