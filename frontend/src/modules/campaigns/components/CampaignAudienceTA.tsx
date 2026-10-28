import { Users } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import {
  CampaignFieldTA,
  CampaignSelectTA,
} from "@/modules/campaigns/components/CampaignPrimitivesTA";
import { formatNumber } from "@/i18n/formatters";
import type {
  CampaignAudienceState,
  CampaignDraft,
  CampaignOptions,
  CampaignSegment,
} from "@/modules/campaigns/types";

// CONFIGURATION
const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const optionalNumber = (value: string): number | undefined =>
  value === "" ? undefined : Number(value);
const optionalBoolean = (value: string): boolean | undefined =>
  value === "" ? undefined : value === "true";

// COMPONENTS
export const CampaignAudienceFiltersTA = ({
  form,
  options,
  update,
  segment,
  editing = false,
}: {
  form: CampaignDraft;
  options: CampaignOptions;
  update: (value: Partial<CampaignDraft>) => void;
  segment: (value: Partial<CampaignSegment>) => void;
  editing?: boolean;
}) => (
  <PanelTA
    title="1. Define tu audiencia"
    description="Los filtros se combinan entre sí y se limitan a los contactos de tu negocio."
  >
    <div className="space-y-5 px-5 pb-6 md:px-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <CampaignFieldTA label="Negocio">
          <CampaignSelectTA
            value={form.business_id}
            disabled={editing}
            onChange={(event) =>
              update({
                business_id: Number(event.target.value),
                promotion_id: null,
                target_ids: [],
                segment: {},
              })
            }
          >
            {options.businesses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </CampaignSelectTA>
        </CampaignFieldTA>
        <CampaignFieldTA label="Tipo de destinatario">
          <CampaignSelectTA
            value={form.target_role}
            onChange={(event) =>
              update({
                target_role:
                  event.target.value === "PROFESSIONAL"
                    ? "PROFESSIONAL"
                    : "CLIENTE",
                target_ids: [],
                segment: {},
              })
            }
          >
            <option value="CLIENTE">Clientes</option>
            <option value="PROFESSIONAL">Profesionales</option>
          </CampaignSelectTA>
        </CampaignFieldTA>
      </div>
      {form.target_role === "CLIENTE" && (
        <>
          <div className="flex flex-wrap gap-2" aria-label="Segmentos rápidos">
            <ButtonTA
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                update({ segment: { inactive_days: 60 }, target_ids: [] })
              }
            >
              Recuperar clientes · 60 días
            </ButtonTA>
            <ButtonTA
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                update({
                  segment: { birthday_month: new Date().getMonth() + 1 },
                  target_ids: [],
                })
              }
            >
              Cumpleaños del mes
            </ButtonTA>
            <ButtonTA
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                update({ segment: { has_membership: true }, target_ids: [] })
              }
            >
              Con membresía activa
            </ButtonTA>
            <ButtonTA
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => update({ segment: {}, target_ids: [] })}
            >
              Limpiar filtros
            </ButtonTA>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <CampaignFieldTA label="Edad mínima">
              <InputTA
                type="number"
                min={0}
                max={120}
                value={form.segment.age_min ?? ""}
                onChange={(event) =>
                  segment({ age_min: optionalNumber(event.target.value) })
                }
                placeholder="Sin mínimo"
              />
            </CampaignFieldTA>
            <CampaignFieldTA label="Edad máxima">
              <InputTA
                type="number"
                min={0}
                max={120}
                value={form.segment.age_max ?? ""}
                onChange={(event) =>
                  segment({ age_max: optionalNumber(event.target.value) })
                }
                placeholder="Sin máximo"
              />
            </CampaignFieldTA>
            <CampaignFieldTA label="Mes de cumpleaños">
              <CampaignSelectTA
                value={form.segment.birthday_month ?? ""}
                onChange={(event) =>
                  segment({
                    birthday_month: optionalNumber(event.target.value),
                  })
                }
              >
                <option value="">Todos los meses</option>
                {months.map((month, index) => (
                  <option value={index + 1} key={month}>
                    {month}
                  </option>
                ))}
              </CampaignSelectTA>
            </CampaignFieldTA>
            <CampaignFieldTA label="Visitas mínimas">
              <InputTA
                type="number"
                min={0}
                value={form.segment.min_visits ?? ""}
                onChange={(event) =>
                  segment({ min_visits: optionalNumber(event.target.value) })
                }
                placeholder="Sin mínimo"
              />
            </CampaignFieldTA>
            <CampaignFieldTA label="Visitas máximas">
              <InputTA
                type="number"
                min={0}
                value={form.segment.max_visits ?? ""}
                onChange={(event) =>
                  segment({ max_visits: optionalNumber(event.target.value) })
                }
                placeholder="Sin máximo"
              />
            </CampaignFieldTA>
            <CampaignFieldTA label="Días sin visitar">
              <InputTA
                type="number"
                min={1}
                value={form.segment.inactive_days ?? ""}
                onChange={(event) =>
                  segment({ inactive_days: optionalNumber(event.target.value) })
                }
                placeholder="Sin filtro"
              />
            </CampaignFieldTA>
            <CampaignFieldTA label="Membresía activa">
              <CampaignSelectTA
                value={form.segment.has_membership?.toString() ?? ""}
                onChange={(event) =>
                  segment({
                    has_membership: optionalBoolean(event.target.value),
                  })
                }
              >
                <option value="">Todos</option>
                <option value="true">Con membresía activa</option>
                <option value="false">Sin membresía activa</option>
              </CampaignSelectTA>
            </CampaignFieldTA>
            <CampaignFieldTA label="Cliente VIP">
              <CampaignSelectTA
                value={form.segment.is_vip?.toString() ?? ""}
                onChange={(event) =>
                  segment({ is_vip: optionalBoolean(event.target.value) })
                }
              >
                <option value="">Todos</option>
                <option value="true">Solo VIP</option>
                <option value="false">No VIP</option>
              </CampaignSelectTA>
            </CampaignFieldTA>
            <CampaignFieldTA label="Nivel de fidelidad">
              <CampaignSelectTA
                value={form.segment.tier ?? ""}
                onChange={(event) =>
                  segment({ tier: event.target.value || undefined })
                }
              >
                <option value="">Todos los niveles</option>
                {options.tiers.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </CampaignSelectTA>
            </CampaignFieldTA>
            <CampaignFieldTA label="Registrado desde">
              <InputTA
                type="date"
                value={form.segment.joined_after ?? ""}
                onChange={(event) =>
                  segment({ joined_after: event.target.value || undefined })
                }
              />
            </CampaignFieldTA>
            <CampaignFieldTA label="Registrado hasta">
              <InputTA
                type="date"
                value={form.segment.joined_before ?? ""}
                onChange={(event) =>
                  segment({ joined_before: event.target.value || undefined })
                }
              />
            </CampaignFieldTA>
          </div>
        </>
      )}
      {form.target_ids.length > 0 && (
        <div className="rounded-xl bg-secondary p-3 text-sm">
          Esta campaña está limitada a {form.target_ids.length} contactos
          seleccionados.
          <ButtonTA
            type="button"
            variant="link"
            onClick={() => update({ target_ids: [] })}
          >
            Usar toda la audiencia filtrada
          </ButtonTA>
        </div>
      )}
    </div>
  </PanelTA>
);

export const CampaignAudiencePreviewTA = ({
  audience,
}: {
  audience: CampaignAudienceState;
}) => (
  <PanelTA
    title="Audiencia estimada"
    description="Se vuelve a validar al enviar la campaña."
  >
    <div className="space-y-4 px-5 pb-5 md:px-6" aria-live="polite">
      {audience.loading ? (
        <p role="status" className="py-4 text-sm text-muted-foreground">
          Calculando destinatarios…
        </p>
      ) : audience.error ? (
        <p role="alert" className="text-sm text-destructive">
          {audience.error}
        </p>
      ) : audience.data ? (
        <>
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <div>
              <p className="text-3xl font-semibold tabular-nums">
                {formatNumber(audience.data.total_recipients)}
              </p>
              <p className="text-xs text-muted-foreground">
                contactos con correo válido
              </p>
            </div>
          </div>
          {audience.data.summary.excluded > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatNumber(audience.data.summary.excluded)} contactos excluidos
              por correo no válido o duplicado.
            </p>
          )}
          {audience.data.total_recipients === 0 ? (
            <p className="rounded-xl bg-secondary p-3 text-sm">
              No hay destinatarios para estos filtros. Puedes guardar el
              borrador y ajustar la audiencia.
            </p>
          ) : (
            <details className="group rounded-xl border border-border">
              <summary className="cursor-pointer p-3 text-sm font-medium">
                Ver muestra de destinatarios
              </summary>
              <ul className="max-h-64 divide-y divide-border overflow-y-auto px-3">
                {audience.data.recipients.map((recipient) => (
                  <li key={recipient.id} className="py-3">
                    <p className="truncate text-sm font-medium">
                      {recipient.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {recipient.email}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="p-3 text-xs text-muted-foreground">
                Máximo {audience.data.summary.preview_limit} contactos en esta
                vista previa.
              </p>
            </details>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Selecciona un negocio para calcular la audiencia.
        </p>
      )}
    </div>
  </PanelTA>
);
