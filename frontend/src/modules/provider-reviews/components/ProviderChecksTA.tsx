import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { providerReviewService } from "@/modules/provider-reviews/service";
import type {
  ProviderKind,
  PublicProviderCheck,
} from "@/modules/provider-reviews/types";

// COMPONENT
export const ProviderChecksTA = ({
  kind,
  id,
}: {
  kind: ProviderKind;
  id: number;
}) => {
  // COMPOSABLES
  const { i18n } = useTranslation();
  // STATE
  const [checks, setChecks] = useState<PublicProviderCheck[]>([]);
  const [error, setError] = useState(false);
  // COMPUTED
  const en = i18n.language.startsWith("en");
  // LIFECYCLE
  useEffect(() => {
    const controller = new AbortController();
    setChecks([]);
    setError(false);
    void providerReviewService
      .publicChecks(kind, id, controller.signal)
      .then(setChecks)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [kind, id]);
  // RENDER
  if (error)
    return (
      <p className="text-xs text-muted-foreground">
        {en
          ? "Document checks are temporarily unavailable."
          : "No fue posible consultar las comprobaciones documentales."}
      </p>
    );
  if (!checks.length) return null;
  return (
    <div className="space-y-2 rounded-xl border border-border p-3 text-xs">
      <ul className="space-y-2">
        {checks.map((check) => (
          <li key={check.code}>
            <p className="font-medium">{en ? check.label_en : check.label}</p>
            <p className="text-muted-foreground">
              {en ? "Reviewed " : "Revisado "}
              {new Date(check.reviewed_at).toLocaleDateString(
                i18n.language,
              )} · {en ? "valid until " : "vigente hasta "}
              {new Date(check.expires_at).toLocaleDateString(i18n.language)}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground">
        {en
          ? "These document checks do not guarantee service quality or safety."
          : "Estas revisiones documentales no garantizan calidad ni seguridad del servicio."}
      </p>
    </div>
  );
};
