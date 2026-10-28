import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { InputTA } from "@/components/TA/InputTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import type { LoginFormResult } from "@/modules/auth/types";

// TYPES
interface LoginFieldsProps {
  fields: LoginFormResult["fields"];
  feedback: LoginFormResult["feedback"];
}

// COMPONENT
export const LoginFieldsTA = ({ fields, feedback }: LoginFieldsProps) => {
  // COMPOSABLES
  const { t } = useTranslation();
  const { t: copy } = useTranslation("authUi");

  // STATE
  const [showPassword, setShowPassword] = useState(false);

  return (
    <fieldset disabled={feedback.loading} className="space-y-5">
      {feedback.step === "credentials" && (
        <div>
          <label
            htmlFor="login-email"
            className="mb-2 block text-sm font-medium"
          >
            {copy("email")}
          </label>
          <InputTA
            ref={fields.challengeRef}
            id="login-email"
            type="text"
            inputMode="email"
            enterKeyHint="next"
            value={fields.email}
            onChange={(event) => fields.setEmail(event.target.value)}
            className="h-12 rounded-2xl bg-background/80 transition-colors duration-200"
            placeholder={copy("emailPlaceholder")}
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(feedback.error)}
            aria-describedby={feedback.error ? "login-feedback" : undefined}
          />
        </div>
      )}
      {feedback.step !== "twoFactor" && (
        <div>
          <label
            htmlFor="login-password"
            className="mb-2 block text-sm font-medium"
          >
            {t("auth.password")}
          </label>
          <div className="relative">
            <InputTA
              ref={
                feedback.step === "password" ? fields.challengeRef : undefined
              }
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={fields.password}
              onChange={(event) => fields.setPassword(event.target.value)}
              className="h-12 rounded-2xl bg-background/80 pr-12 transition-colors duration-200"
              placeholder="••••••••"
              autoComplete="current-password"
              enterKeyHint="go"
              required
              aria-invalid={Boolean(feedback.error)}
              aria-describedby={feedback.error ? "login-feedback" : undefined}
            />
            <ButtonTA
              variant="ghost"
              size="icon"
              type="button"
              aria-label={
                showPassword ? t("auth.hidePassword") : t("auth.showPassword")
              }
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1 top-1/2 min-h-10 -translate-y-1/2 rounded-xl text-muted-foreground"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </ButtonTA>
          </div>
        </div>
      )}
      {feedback.step === "twoFactor" && (
        <div>
          <label
            htmlFor="two-factor-code"
            className="mb-2 block text-sm font-medium"
          >
            {copy("twoFactorLabel")}
          </label>
          <InputTA
            ref={fields.challengeRef}
            id="two-factor-code"
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
            value={fields.twoFactorCode}
            onChange={(event) => fields.setTwoFactorCode(event.target.value)}
            placeholder={copy("twoFactorPlaceholder")}
            required
            maxLength={16}
            enterKeyHint="go"
            aria-invalid={Boolean(feedback.error)}
            className="h-12 rounded-2xl bg-background/80"
            aria-describedby={feedback.error ? "login-feedback" : undefined}
          />
        </div>
      )}
    </fieldset>
  );
};
