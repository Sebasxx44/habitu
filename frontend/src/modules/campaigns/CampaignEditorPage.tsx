import { LinkButtonTA } from "@/components/TA/LinkButtonTA";
import { ArrowLeft, Save } from "lucide-react";
import { useParams } from "react-router-dom";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { DashboardSkeletonTA, StateTA } from "@/components/TA/StateTA";
import {
  CampaignAudienceFiltersTA,
  CampaignAudiencePreviewTA,
} from "@/modules/campaigns/components/CampaignAudienceTA";
import { CampaignEmailEditorTA } from "@/modules/campaigns/components/CampaignEmailEditorTA";
import { CampaignEmailPreviewTA } from "@/modules/campaigns/components/CampaignEmailPreviewTA";
import {
  CampaignFieldTA,
  CampaignIntegrationTA,
  CampaignSelectTA,
} from "@/modules/campaigns/components/CampaignPrimitivesTA";
import { campaignTypes } from "@/modules/campaigns/campaignDomain";
import { useCampaignAudience } from "@/modules/campaigns/composables/useCampaignAudience";
import { useCampaignEditor } from "@/modules/campaigns/composables/useCampaignEditor";
import type { CampaignType } from "@/modules/campaigns/types";

// VIEW
export const CampaignEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const { editor, actions } = useCampaignEditor(id);
  const audience = useCampaignAudience(editor.form, !editor.loading);
  const promotion = editor.options?.promotions.find(
    (item) => item.id === editor.form.promotion_id,
  );
  return (
    <form
      className="page-enter space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void actions.save();
      }}
    >
      <ActionHeaderTA
        eyebrow="Campañas · Borrador"
        title={editor.editing ? "Editar campaña" : "Nueva campaña"}
        description="Define a quién llegar, prepara tu correo y revisa antes de enviarlo."
        actions={
          <>
            <LinkButtonTA
              variant="outline"
              disabled={editor.saving}
              to={id ? `/admin/campaigns/${id}` : "/admin/campaigns"}
            >
              <ArrowLeft className="size-4" />
              Volver
            </LinkButtonTA>
            <ButtonTA
              type="submit"
              disabled={
                editor.loading ||
                editor.saving ||
                !editor.options?.businesses.length
              }
            >
              <Save className="size-4" />
              {editor.saving ? "Guardando…" : "Guardar borrador"}
            </ButtonTA>
          </>
        }
      />
      {editor.error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {editor.error}
        </div>
      )}
      {editor.loading ? (
        <DashboardSkeletonTA />
      ) : !editor.options ? (
        <StateTA
          error
          title="No se pudo abrir el editor"
          description={editor.error ?? "Intenta de nuevo."}
          onRetry={actions.retry}
        />
      ) : !editor.options.businesses.length ? (
        <StateTA
          title="No tienes un negocio disponible"
          description="Necesitas administrar un negocio para crear campañas."
        />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <fieldset disabled={editor.saving} className="min-w-0 space-y-6">
            <CampaignAudienceFiltersTA
              editing={editor.editing}
              form={editor.form}
              options={editor.options}
              update={actions.update}
              segment={actions.segment}
            />
            <PanelTA
              title="2. Prepara el mensaje"
              description="Un asunto claro y un beneficio concreto ayudan a tus clientes a decidir."
            >
              <div className="space-y-5 px-5 pb-6 md:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <CampaignFieldTA label="Objetivo">
                    <CampaignSelectTA
                      value={editor.form.type}
                      onChange={(event) =>
                        actions.update({
                          type: event.target.value as CampaignType,
                        })
                      }
                    >
                      {Object.entries(campaignTypes).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </CampaignSelectTA>
                  </CampaignFieldTA>
                  <CampaignFieldTA
                    label="Promoción o cupón vinculado"
                    hint="Se incluye en el correo y en el enlace de reserva."
                  >
                    <CampaignSelectTA
                      value={editor.form.promotion_id ?? ""}
                      onChange={(event) =>
                        actions.update({
                          promotion_id: event.target.value
                            ? Number(event.target.value)
                            : null,
                        })
                      }
                    >
                      <option value="">Sin promoción</option>
                      {editor.options.promotions
                        .filter(
                          (item) =>
                            item.business_id === editor.form.business_id,
                        )
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title}
                            {!item.is_active ? " (inactiva)" : ""}
                            {item.promo_code ? ` · ${item.promo_code}` : ""}
                          </option>
                        ))}
                    </CampaignSelectTA>
                  </CampaignFieldTA>
                </div>
                <CampaignFieldTA
                  label="Asunto del correo"
                  hint={`${editor.form.subject.length}/255 caracteres`}
                >
                  <InputTA
                    required
                    maxLength={255}
                    value={editor.form.subject}
                    onChange={(event) =>
                      actions.update({ subject: event.target.value })
                    }
                    placeholder="Tenemos algo especial para tu próxima visita"
                  />
                </CampaignFieldTA>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Contenido del correo</p>
                  <CampaignEmailEditorTA
                    disabled={editor.saving}
                    value={editor.form.body}
                    onChange={(body) => actions.update({ body })}
                  />
                </div>
              </div>
            </PanelTA>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                {editor.dirty
                  ? "Tienes cambios sin guardar."
                  : "Guarda el borrador para pasar a la revisión del envío."}
              </p>
              <ButtonTA type="submit" disabled={editor.saving}>
                <Save className="size-4" />
                {editor.saving ? "Guardando…" : "Guardar y revisar"}
              </ButtonTA>
            </div>
          </fieldset>
          <aside className="space-y-5 xl:sticky xl:top-6">
            <CampaignAudiencePreviewTA audience={audience} />
            <CampaignEmailPreviewTA
              subject={editor.form.subject}
              body={editor.form.body}
              promotion={promotion}
            />
            <CampaignIntegrationTA integration={editor.options.integration} />
          </aside>
        </div>
      )}
    </form>
  );
};
