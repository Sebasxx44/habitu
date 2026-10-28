import { isAxiosError } from "axios";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { accountAccessService } from "@/modules/auth/services/accountAccessService";
import {
  accountPath,
  safeReturnPath,
} from "@/modules/auth/services/returnPath";
import type {
  AccountAccessFields,
  AccountAccessFieldErrors,
  AccountAccessMode,
  AccountAccessResult,
  LoginApiError,
} from "@/modules/auth/types";

// COMPOSABLE
export const useAccountAccess = (
  mode: AccountAccessMode,
): AccountAccessResult => {
  // SERVICES
  const { refreshUser } = useAuth();
  const { t } = useTranslation("authUi");
  const location = useLocation();
  const navigate = useNavigate();
  // STATE
  const params = new URLSearchParams(location.search);
  const [value, setValue] = useState<AccountAccessFields>({
    name: "",
    email: params.get("email") ?? "",
    password: "",
    confirmation: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AccountAccessFieldErrors>({});
  const pending = useRef(false);
  // ACTIONS
  const setField = (key: keyof AccountAccessFields, next: string) => {
    setValue((current) => ({ ...current, [key]: next }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setError("");
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    if (mode !== "forgot" && value.password !== value.confirmation) {
      setError(t("passwordMismatch"));
      setFieldErrors({ confirmation: t("passwordMismatch") });
      return;
    }
    if (mode === "reset" && !params.get("token")) {
      setError(t("invalidReset"));
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      if (mode === "register") {
        await accountAccessService.register(value);
        await refreshUser();
        navigate(
          safeReturnPath(params.get("returnTo")) ?? "/cliente/dashboard",
          { replace: true },
        );
      } else {
        if (mode === "forgot") await accountAccessService.request(value.email);
        else await accountAccessService.reset(value, params.get("token") ?? "");
        setValue((current) => ({ ...current, password: "", confirmation: "" }));
        setDone(true);
      }
    } catch (failure) {
      if (isAxiosError<LoginApiError>(failure)) {
        const errors = failure.response?.data.errors;
        if (failure.response?.status === 422 && mode !== "reset") {
          setFieldErrors({
            name: errors?.name?.[0],
            email: errors?.email?.[0],
            password: errors?.password?.[0],
            confirmation: errors?.password_confirmation?.[0],
          });
        }
        setError(
          !failure.response
            ? t("connectionError")
            : failure.response.status === 429
            ? t("rateLimited")
            : failure.response?.status === 503
              ? t("recoveryUnavailable")
              : failure.response?.status === 422
                ? mode === "reset"
                  ? t("invalidReset")
                  : t("registrationInvalid")
                : t("accountError"),
        );
      } else setError(t("accountError"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  // LIFECYCLE
  useEffect(() => {
    setValue({ name: "", email: new URLSearchParams(location.search).get("email") ?? "", password: "", confirmation: "" });
    setError("");
    setFieldErrors({});
    setDone(false);
  }, [mode, location.search]);
  // EXPOSE
  return {
    form: { value, setField, submit },
    feedback: { busy, error, done, fieldErrors },
    links: {
      login: accountPath("/login", location.search),
      register: accountPath("/register", location.search),
      forgot: accountPath("/forgot-password", location.search),
    },
  };
};
