import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadGoogleIdentity } from "@/modules/auth/services/googleIdentity";
import { accountAccessService } from "@/modules/auth/services/accountAccessService";
import type { GoogleSignInResult } from "@/modules/auth/types";

// COMPOSABLE
export const useGoogleSignIn = (
  onCredential: (credential: string) => Promise<void>,
  disabled: boolean,
): GoogleSignInResult => {
  // SERVICES
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || "es";

  // STATE
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const disabledRef = useRef(disabled);
  const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || "");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);

  // ACTIONS
  const retry = () => {
    setStatus("loading");
    setAttempt((value) => value + 1);
  };

  // LIFECYCLE
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    disabledRef.current = disabled;
    if (buttonRef.current) buttonRef.current.inert = disabled;
  }, [disabled, clientId]);

  useEffect(() => {
    let active = true;
    void accountAccessService.configuration().then((configuration) => {
      if (active) setClientId(configuration.google_client_id || import.meta.env.VITE_GOOGLE_CLIENT_ID || "");
    }).catch(() => {
      // Email sign-in stays available if provider configuration cannot be loaded.
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    const container = buttonRef.current;
    if (!container) return;
    void loadGoogleIdentity()
      .then((client) => {
        if (!active) return;
        client.initialize({
          client_id: clientId,
          callback: (response) => {
            if (active && !disabledRef.current) void callbackRef.current(response.credential);
          },
          auto_select: false,
          ux_mode: "popup",
        });
        container.replaceChildren();
        client.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: Math.min(400, container.clientWidth),
          locale,
        });
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [clientId, locale, attempt]);

  // EXPOSE
  return {
    buttonRef,
    feedback: { configured: Boolean(clientId), status },
    actions: { retry },
  };
};
