import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { useProfileSecurity } from "@/modules/profile/composables/useProfileSecurity";
import type { AccountProfile, ProfileState } from "@/modules/profile/types";
// COMPONENT
export const ProfileSecurityTA = ({
  data,
  changes,
}: {
  data: AccountProfile;
  changes: ProfileState["changes"];
}) => {
  const { t } = useTranslation("profile");
  const { password, feedback, actions } = useProfileSecurity();
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [code, setCode] = useState("");
  return (
    <PanelTA title={t("security")} description={t("securityDescription")}>
      <div className="space-y-6 px-5 pb-6">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          {t(
            data.security.two_factor_enabled
              ? "twoFactorActive"
              : "twoFactorInactive",
          )}
        </p>
        {data.security.google_linked ? (
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <p className="text-sm font-medium">{t("google")}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t("googleDescription")}
            </p>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                await changes.email({
                  email,
                  current_password: current,
                  two_factor_code: code || undefined,
                })
              ) {
                setEmail("");
                setCurrent("");
                setCode("");
              }
            }}
          >
            <p className="text-xs text-muted-foreground">
              {t("email")} · {data.user.email}
            </p>
            <label className="block space-y-2 text-sm font-medium">
              {t("newEmail")}
              <InputTA
                type="email"
                autoComplete="email"
                required
                maxLength={255}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={changes.busy}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              {t("currentPassword")}
              <InputTA
                type="password"
                autoComplete="current-password"
                required
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                disabled={changes.busy}
              />
            </label>
            {data.security.two_factor_enabled && (
              <label className="block space-y-2 text-sm font-medium">
                {t("twoFactor")}
                <InputTA
                  autoComplete="one-time-code"
                  required
                  maxLength={16}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  disabled={changes.busy}
                />
              </label>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("emailNote")}
            </p>
            <ButtonTA
              variant="outline"
              type="submit"
              disabled={changes.busy || feedback.busy}
            >
              {t("changeEmail")}
            </ButtonTA>
          </form>
        )}
        <form
          className="space-y-4 border-t border-border pt-6"
          onSubmit={(event) => {
            event.preventDefault();
            void actions.submit();
          }}
        >
          {(
            [
              {
                field: "current",
                label: "currentPassword",
                auto: "current-password",
              },
              { field: "next", label: "newPassword", auto: "new-password" },
              {
                field: "confirmation",
                label: "confirmPassword",
                auto: "new-password",
              },
            ] as const
          ).map((item) => (
            <label
              key={item.field}
              className="block space-y-2 text-sm font-medium"
            >
              {t(item.label)}
              <InputTA
                type="password"
                autoComplete={item.auto}
                required
                minLength={item.field === "current" ? 1 : 12}
                maxLength={128}
                value={password[item.field]}
                onChange={(event) =>
                  actions.update(item.field, event.target.value)
                }
                disabled={feedback.busy}
              />
            </label>
          ))}
          {data.security.two_factor_enabled && (
            <label className="block space-y-2 text-sm font-medium">
              {t("twoFactor")}
              <InputTA
                autoComplete="one-time-code"
                required
                maxLength={16}
                value={password.code}
                onChange={(event) => actions.update("code", event.target.value)}
                disabled={feedback.busy}
              />
            </label>
          )}
          <p className="text-xs text-muted-foreground">{t("passwordHelp")}</p>
          {feedback.error && (
            <p role="alert" className="text-sm text-destructive">
              {feedback.error}
            </p>
          )}
          {feedback.saved && (
            <p role="status" className="text-sm text-primary">
              {t("passwordUpdated")}
            </p>
          )}
          <ButtonTA
            type="submit"
            variant="outline"
            disabled={
              feedback.busy ||
              changes.busy ||
              password.next !== password.confirmation
            }
          >
            {t("changePassword")}
          </ButtonTA>
        </form>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("securityProtected")}
        </p>
      </div>
    </PanelTA>
  );
};
