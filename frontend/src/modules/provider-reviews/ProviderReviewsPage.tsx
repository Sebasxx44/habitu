import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { StateTA } from "@/components/TA/StateTA";
import { ProviderCheckTA } from "@/modules/provider-reviews/components/ProviderCheckTA";
import { useProviderReview } from "@/modules/provider-reviews/composables/useProviderReview";

// COMPONENT
export const ProviderReviewsPage = () => {
  // COMPOSABLES
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const { data, selection, actions } = useProviderReview();
  // COMPUTED
  const en = i18n.language.startsWith("en");
  // RENDER
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <ActionHeaderTA
        title={en ? "Evidence and checks" : "Evidencias y comprobaciones"}
        description={
          en
            ? "Specific document reviews with an expiry date. These checks do not guarantee service quality or safety."
            : "Revisiones documentales concretas con vigencia. Estas comprobaciones no garantizan calidad ni seguridad del servicio."
        }
      />
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void actions.search();
        }}
      >
        <InputTA
          aria-label={
            en
              ? "Search your businesses or professionals"
              : "Buscar negocios o profesionales autorizados"
          }
          value={selection.query}
          onChange={(event) => selection.setQuery(event.target.value)}
          maxLength={100}
        />
        <ButtonTA type="submit" disabled={data.loading}>
          {en ? "Search" : "Buscar"}
        </ButtonTA>
      </form>
      {!!data.subjects.length && (
        <label className="block space-y-1 text-sm">
          <span>
            {en ? "Business or professional" : "Negocio o profesional"}
          </span>
          <select
            className="min-h-11 w-full rounded-xl border border-input bg-background px-3"
            value={selection.key}
            onChange={(event) => selection.select(event.target.value)}
          >
            {data.subjects.map((subject) => (
              <option
                key={`${subject.kind}:${subject.id}`}
                value={`${subject.kind}:${subject.id}`}
              >
                {subject.name} ·{" "}
                {subject.kind === "business"
                  ? en
                    ? "Business"
                    : "Negocio"
                  : en
                    ? "Professional"
                    : "Profesional"}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="text-xs text-muted-foreground">
        {en
          ? "Upload only evidence relevant to the selected check. Access is private to the subject, the business owner and platform reviewers. Original files are deleted after 90 days; review dates and decisions remain in the audit history."
          : "Aporta solo evidencia pertinente a la comprobación. Acceso privado para el titular, dueño del negocio y revisores de plataforma. Los archivos originales se eliminan a los 90 días; fechas y decisiones permanecen en auditoría."}
      </p>
      {data.loading && <p role="status">{en ? "Loading…" : "Cargando…"}</p>}
      {data.error && (
        <StateTA
          error
          title={
            en
              ? "Unable to load reviews"
              : "No se pudieron consultar las revisiones"
          }
          onRetry={() => void actions.reload()}
          description={
            en
              ? "Try refreshing the selected profile."
              : "Intenta actualizar el perfil seleccionado."
          }
        />
      )}
      {!data.loading && !data.subjects.length && (
        <StateTA
          title={
            en
              ? "No authorized subjects found"
              : "Sin negocios o profesionales autorizados"
          }
          description={
            en
              ? "Adjust the search or select a profile you manage."
              : "Ajusta la búsqueda o selecciona un perfil que administras."
          }
        />
      )}
      {data.detail?.definitions.map((definition) => (
        <ProviderCheckTA
          key={`${selection.key}:${definition.code}:${data.detail?.checks.find((check) => check.code === definition.code)?.revision ?? 0}`}
          subject={data.detail!.subject}
          definition={definition}
          check={data.detail?.checks.find(
            (check) => check.code === definition.code,
          )}
          canReview={user?.role === "SUPERADMIN"}
          reload={actions.reload}
        />
      ))}
    </div>
  );
};
