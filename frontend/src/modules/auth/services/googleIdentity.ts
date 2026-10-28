import type { GoogleIdentityClient } from "@/modules/auth/types";

// CONFIGURATION
const SCRIPT_ID = "habitu-google-identity";
let loadingClient: Promise<GoogleIdentityClient> | null = null;

// SERVICES
const getClient = (): GoogleIdentityClient | undefined =>
  (window as Window & { google?: { accounts?: { id?: GoogleIdentityClient } } })
    .google?.accounts?.id;

export const loadGoogleIdentity = (): Promise<GoogleIdentityClient> => {
  const client = getClient();
  if (client) return Promise.resolve(client);
  if (loadingClient) return loadingClient;

  loadingClient = new Promise<GoogleIdentityClient>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    const fail = () => {
      window.clearTimeout(timeout);
      script.remove();
      loadingClient = null;
      reject(new Error("Google sign-in could not load."));
    };
    const timeout = window.setTimeout(fail, 12000);
    script.onerror = fail;
    script.onload = () => {
      const readyClient = getClient();
      if (!readyClient) {
        fail();
        return;
      }
      window.clearTimeout(timeout);
      resolve(readyClient);
    };
    document.head.appendChild(script);
  });
  return loadingClient;
};
