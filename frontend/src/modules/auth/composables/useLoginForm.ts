import { isAxiosError } from "axios";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { authenticatedDestination } from "@/modules/auth/services/routeAccess";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/types/auth";
import type {
  LoginApiError,
  LoginFormResult,
  LoginProvider,
  LoginStep,
} from "@/modules/auth/types";

// COMPOSABLE
export const useLoginForm = (): LoginFormResult => {
  // SERVICES
  const { login, loginWithGoogle } = useAuth();
  const { t } = useTranslation("authUi");
  const navigate = useNavigate();
  const location = useLocation();

  // STATE
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [step, setStep] = useState<LoginStep>("credentials");
  const [provider, setProvider] = useState<LoginProvider>("credentials");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const googleCredential = useRef("");
  const pending = useRef(false);
  const challengeRef = useRef<HTMLInputElement>(null);
  const previousStep = useRef<LoginStep>("credentials");

  // ACTIONS
  const routeByRole = (role: User["role"]) => {
    const destination = authenticatedDestination(
      role,
      new URLSearchParams(location.search).get("returnTo"),
    );
    navigate(destination, { replace: true });
  };

  const authenticate = async (credential?: string) => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError("");
    const isGoogle = Boolean(
      credential || (step !== "credentials" && googleCredential.current),
    );
    try {
      if (isGoogle) {
        const result = await loginWithGoogle({
          id_token: credential || googleCredential.current,
          password: step === "credentials" ? undefined : password || undefined,
          two_factor_code: twoFactorCode.trim() || undefined,
        });
        googleCredential.current = "";
        routeByRole(result.user.role);
      } else {
        const user = await login(
          email.trim(),
          password,
          twoFactorCode.trim() || undefined,
        );
        routeByRole(user.role);
      }
    } catch (failure) {
      if (!isAxiosError<LoginApiError>(failure)) {
        setError(t("error"));
        return;
      }
      const errors = failure.response?.data?.errors;
      if (errors?.two_factor_code) {
        setStep("twoFactor");
        if (step === "twoFactor") setError(t("invalidCode"));
      } else if (isGoogle && errors?.password) {
        setStep("password");
        if (step === "password") setError(t("invalidPassword"));
      } else if (failure.response?.status === 429) {
        setError(t("rateLimited"));
      } else if (!failure.response) {
        setError(t("connectionError"));
      } else if (isGoogle) {
        googleCredential.current = "";
        setProvider("credentials");
        setStep("credentials");
        setPassword("");
        setTwoFactorCode("");
        setError(t("googleError"));
      } else {
        setError(
          t(
            errors?.email || failure.response.status === 401
              ? "invalid"
              : "error",
          ),
        );
      }
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await authenticate();
  };

  const signInWithGoogle = async (credential: string) => {
    if (pending.current || !credential) return;
    googleCredential.current = credential;
    setPassword("");
    setProvider("google");
    await authenticate(credential);
  };

  const restart = () => {
    if (pending.current) return;
    googleCredential.current = "";
    setPassword("");
    setTwoFactorCode("");
    setError("");
    setProvider("credentials");
    setStep("credentials");
  };

  // LIFECYCLE
  useEffect(() => {
    if (previousStep.current !== step) challengeRef.current?.focus();
    previousStep.current = step;
  }, [step]);

  // EXPOSE
  return {
    fields: {
      email,
      password,
      twoFactorCode,
      setEmail,
      setPassword,
      setTwoFactorCode,
      challengeRef,
    },
    feedback: { step, provider, loading, error },
    actions: { submit, signInWithGoogle, restart },
  };
};
