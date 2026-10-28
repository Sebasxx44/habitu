import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { useProviderCheck } from "@/modules/provider-reviews/composables/useProviderCheck";
import type {
  CheckDefinition,
  ProviderCheck,
  ReviewSubject,
} from "@/modules/provider-reviews/types";

// COMPONENT
export const ProviderCheckTA = ({
  subject,
  definition,
  check,
  canReview,
  reload,
}: {
  subject: ReviewSubject;
  definition: CheckDefinition;
  check?: ProviderCheck;
  canReview: boolean;
  reload: () => Promise<void>;
}) => {
  // COMPOSABLES
  const { i18n } = useTranslation();
  const { data, form, actions } = useProviderCheck(
    subject,
    definition.code,
    check,
    reload,
  );
  // COMPUTED
  const en = i18n.language.startsWith("en");
  const labels = en
    ? {
        PENDING: "Pending review",
        APPROVED: "Current check",
        REJECTED: "Rejected",
        REVOKED: "Revoked",
        EXPIRED: "Expired",
      }
    : {
        PENDING: "Pendiente de revisión",
        APPROVED: "Comprobación vigente",
        REJECTED: "Rechazada",
        REVOKED: "Revocada",
        EXPIRED: "Vencida",
      };
  const canDecide =
    canReview && (check?.state === "PENDING" || check?.state === "APPROVED");
  // RENDER
  return (
    <PanelTA
      title={en ? definition.label_en : definition.label}
      description={
        check
          ? labels[check.state]
          : en
            ? "No evidence submitted"
            : "Sin evidencia aportada"
      }
    >
      <div className="space-y-4 px-5 pb-5 md:px-6">
        {check?.expires_at && (
          <p className="text-xs text-muted-foreground">
            {en ? "Valid until: " : "Vigencia hasta: "}
            {new Date(check.expires_at).toLocaleDateString(i18n.language)}
          </p>
        )}
        {check?.review_note && <p className="text-sm">{check.review_note}</p>}
        {check?.documents.map((document) => (
          <ButtonTA
            key={document.id}
            variant="outline"
            disabled={data.busy}
            onClick={() => void actions.download(document)}
          >
            {document.name}
          </ButtonTA>
        ))}
        {check?.state === "PENDING" ? (
          <label className="block space-y-1 text-sm">
            <span>
              {en
                ? "Private document (PDF, JPG or PNG; up to 5 MB, 3 files)"
                : "Documento privado (PDF, JPG o PNG; hasta 5 MB, 3 archivos)"}
            </span>
            <InputTA
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              disabled={data.busy || check.documents.length >= 3}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void actions.upload(file);
                event.target.value = "";
              }}
            />
          </label>
        ) : (
          <ButtonTA
            variant="outline"
            disabled={data.busy}
            onClick={() => void actions.submit()}
          >
            {check
              ? en
                ? "Submit new evidence"
                : "Presentar nueva evidencia"
              : en
                ? "Start review"
                : "Iniciar revisión"}
          </ButtonTA>
        )}
        {canDecide && (
          <div className="space-y-3 rounded-xl border border-border p-3">
            <label className="block space-y-1 text-sm">
              <span>
                {en
                  ? "Review rationale (do not copy personal document details)"
                  : "Motivo de la decisión (sin copiar datos personales del documento)"}
              </span>
              <InputTA
                value={form.reason}
                onChange={(event) => form.setReason(event.target.value)}
                minLength={10}
                maxLength={2000}
              />
            </label>
            {check?.state === "PENDING" && (
              <>
                <label className="block space-y-1 text-sm">
                  <span>
                    {en
                      ? "Valid until (maximum one year)"
                      : "Vigencia hasta (máximo un año)"}
                  </span>
                  <InputTA
                    type="date"
                    value={form.expiry}
                    onChange={(event) => form.setExpiry(event.target.value)}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.reviewed}
                    onChange={(event) => form.setReviewed(event.target.checked)}
                  />
                  {en
                    ? "I reviewed the attached evidence for this specific check."
                    : "Revisé la evidencia adjunta para esta comprobación concreta."}
                </label>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              {check?.state === "PENDING" ? (
                <>
                  <ButtonTA
                    disabled={
                      data.busy ||
                      form.reason.trim().length < 10 ||
                      !form.expiry ||
                      !form.reviewed ||
                      !check.documents.length
                    }
                    onClick={() => void actions.decide("APPROVED")}
                  >
                    {en ? "Approve check" : "Aprobar comprobación"}
                  </ButtonTA>
                  <ButtonTA
                    variant="outline"
                    disabled={data.busy || form.reason.trim().length < 10}
                    onClick={() => void actions.decide("REJECTED")}
                  >
                    {en ? "Reject" : "Rechazar"}
                  </ButtonTA>
                </>
              ) : (
                <ButtonTA
                  variant="outline"
                  disabled={data.busy || form.reason.trim().length < 10}
                  onClick={() => void actions.decide("REVOKED")}
                >
                  {en ? "Revoke check" : "Revocar comprobación"}
                </ButtonTA>
              )}
            </div>
          </div>
        )}
        {data.error && (
          <p role="alert" className="text-sm text-destructive">
            {en
              ? "The action could not be completed. Check the file, permissions, current state and validity dates."
              : "No se pudo completar la acción. Revisa el archivo, permisos, estado y fechas de vigencia."}
          </p>
        )}
        {!!check?.audit.length && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">
              {en ? "Review history" : "Historial de revisión"}
            </summary>
            <ol className="mt-2 space-y-2">
              {check.audit.map((event, index) => (
                <li key={`${event.created_at}:${index}`}>
                  {new Date(event.created_at).toLocaleString(i18n.language)} ·{" "}
                  {event.action === "SUBMITTED"
                    ? en
                      ? "Submitted"
                      : "Presentada"
                    : event.action === "DOCUMENT_ADDED"
                      ? en
                        ? "Document added"
                        : "Documento añadido"
                      : en
                        ? "Decision recorded"
                        : "Decisión registrada"}{" "}
                  · {event.reason ?? event.to_state}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </PanelTA>
  );
};
