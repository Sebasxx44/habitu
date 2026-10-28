import { useTranslation } from "react-i18next";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { LinkButtonTA } from "@/components/TA/LinkButtonTA";
import { HabituLogo } from "@/components/ui/HabituLogo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useAccountAccess } from "@/modules/auth/composables/useAccountAccess";
import { useLoginForm } from "@/modules/auth/composables/useLoginForm";
import { GoogleSignInTA } from "@/modules/auth/components/GoogleSignInTA";
import { LoginFieldsTA } from "@/modules/auth/components/LoginFieldsTA";
import type { AccountAccessMode } from "@/modules/auth/types";
import { LegalLinksTA } from "@/modules/legal/LegalLinksTA";
import { guestHome } from "@/modules/auth/services/routeAccess";

// COMPONENT
export const AccountAccessPage = ({ mode }: { mode: AccountAccessMode }) => {
  // COMPOSABLES
  const { t } = useTranslation("authUi");
  const { form, feedback, links } = useAccountAccess(mode);
  const google = useLoginForm();
  // COMPUTED
  const isChallenge = mode === "register" && google.feedback.step !== "credentials";
  const busy = feedback.busy || google.feedback.loading;
  const title = isChallenge ? google.feedback.step === "twoFactor" ? "twoFactorTitle" : "passwordTitle" : `${mode}Title`;
  const description = isChallenge ? google.feedback.step === "twoFactor" ? "twoFactorDescription" : "passwordDescription" : `${mode}Description`;
  // RENDER
  return (
    <main className="auth-page min-h-svh bg-background px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))] text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <HabituLogo variant="horizontal" className="w-36" />
        <div className="flex">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <section className="mx-auto mb-8 mt-8 max-w-md space-y-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:mt-16 sm:p-7">
        <ActionHeaderTA
          title={t(title)}
          description={t(description)}
        />
        {isChallenge ? (
          <form onSubmit={google.actions.submit} className="space-y-5" aria-busy={google.feedback.loading}>
            <LoginFieldsTA fields={google.fields} feedback={google.feedback} />
            {google.feedback.error && <p id="login-feedback" role="alert" className="text-sm text-destructive">{google.feedback.error}</p>}
            <ButtonTA type="submit" loading={google.feedback.loading} className="w-full">{t(google.feedback.loading ? "verifying" : "verify")}</ButtonTA>
            <ButtonTA type="button" variant="ghost" className="w-full" onClick={google.actions.restart} disabled={google.feedback.loading}>{t("back")}</ButtonTA>
          </form>
        ) : feedback.done ? (
          <p role="status" className="rounded-xl bg-primary/10 p-4 text-sm">
            {t(mode === "forgot" ? "recoverySent" : "passwordUpdated")}
          </p>
        ) : (
          <form onSubmit={form.submit} className="space-y-5" aria-busy={busy}>
            <fieldset disabled={busy} className="space-y-4">
              {mode === "register" && (
                <label className="block space-y-2 text-sm">
                  <span>{t("fullName")}</span>
                  <InputTA
                    required
                    autoComplete="name"
                    maxLength={100}
                    name="name"
                    enterKeyHint="next"
                    aria-invalid={Boolean(feedback.fieldErrors.name)}
                    aria-describedby={feedback.fieldErrors.name ? "register-name-error" : undefined}
                    value={form.value.name}
                    onChange={(event) =>
                      form.setField("name", event.target.value)
                    }
                  />
                  {feedback.fieldErrors.name && <span id="register-name-error" className="block text-xs text-destructive">{feedback.fieldErrors.name}</span>}
                </label>
              )}
              <label className="block space-y-2 text-sm">
                <span>{t("emailAddress")}</span>
                <InputTA
                  required
                  type="email"
                  autoComplete="email"
                  maxLength={255}
                  name="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint={mode === "forgot" ? "send" : "next"}
                  aria-invalid={Boolean(feedback.fieldErrors.email)}
                  aria-describedby={feedback.fieldErrors.email ? "register-email-error" : undefined}
                  value={form.value.email}
                  onChange={(event) =>
                    form.setField("email", event.target.value)
                  }
                />
                {feedback.fieldErrors.email && <span id="register-email-error" className="block text-xs text-destructive">{feedback.fieldErrors.email}</span>}
              </label>
              {mode !== "forgot" && (
                <>
                  <label className="block space-y-2 text-sm">
                    <span>{t("newPassword")}</span>
                    <InputTA
                      required
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={255}
                      name="password"
                      enterKeyHint="next"
                      aria-invalid={Boolean(feedback.fieldErrors.password)}
                      aria-describedby={feedback.fieldErrors.password ? "register-password-error" : undefined}
                      value={form.value.password}
                      onChange={(event) =>
                        form.setField("password", event.target.value)
                      }
                    />
                    {feedback.fieldErrors.password && <span id="register-password-error" className="block text-xs text-destructive">{feedback.fieldErrors.password}</span>}
                  </label>
                  <label className="block space-y-2 text-sm">
                    <span>{t("confirmPassword")}</span>
                    <InputTA
                      required
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={255}
                      name="password_confirmation"
                      enterKeyHint="go"
                      aria-invalid={Boolean(feedback.fieldErrors.confirmation)}
                      aria-describedby={feedback.fieldErrors.confirmation ? "register-confirmation-error" : undefined}
                      value={form.value.confirmation}
                      onChange={(event) =>
                        form.setField("confirmation", event.target.value)
                      }
                    />
                    {feedback.fieldErrors.confirmation && <span id="register-confirmation-error" className="block text-xs text-destructive">{feedback.fieldErrors.confirmation}</span>}
                  </label>
                </>
              )}
              {feedback.error && (
                <p role="alert" className="text-sm text-destructive">
                  {feedback.error}
                </p>
              )}
              <ButtonTA type="submit" loading={feedback.busy} className="w-full">
                {t(feedback.busy ? "processing" : `${mode}Submit`)}
              </ButtonTA>
            </fieldset>
          </form>
        )}
        {mode === "register" && !isChallenge && <><GoogleSignInTA onCredential={google.actions.signInWithGoogle} disabled={busy} />{google.feedback.error && <p role="alert" className="text-sm text-destructive">{google.feedback.error}</p>}</>}
        <LinkButtonTA to={links.login} variant="ghost" className="w-full">
          {t("back")}
        </LinkButtonTA>
        <LinkButtonTA to={guestHome} variant="ghost" className="w-full text-xs">{t("browse")}</LinkButtonTA>
        {mode === "reset" && (
          <LinkButtonTA to={links.forgot} variant="ghost" className="w-full">
            {t("forgotLink")}
          </LinkButtonTA>
        )}
        <LegalLinksTA />
      </section>
    </main>
  );
};
