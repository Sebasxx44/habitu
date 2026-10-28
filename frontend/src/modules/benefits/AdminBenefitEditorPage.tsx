import { ArrowLeft, CalendarCheck, Check, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { DashboardSkeletonTA, StateTA } from "@/components/TA/StateTA";
import { formatCurrency, formatDate } from "@/i18n/formatters";
import {
  benefitAdminModules,
  benefitAdminPath,
} from "@/modules/benefits/adminPresentation";
import { BenefitEditorTA } from "@/modules/benefits/components/BenefitEditorTA";
import { useAdminBenefits } from "@/modules/benefits/composables/useAdminBenefits";
import { useBenefitEditor } from "@/modules/benefits/composables/useBenefitEditor";
import type {
  AdminBenefitRecord,
  AdminBenefitsData,
  BenefitAdminKind,
} from "@/modules/benefits/adminTypes";

// COMPONENT
const EditorContentTA = ({
  kind,
  data,
  record,
}: {
  kind: BenefitAdminKind;
  data: AdminBenefitsData;
  record?: AdminBenefitRecord;
}) => {
  // COMPOSABLES
  const navigate = useNavigate();
  const back = benefitAdminPath(kind, data.business_id);
  const state = useBenefitEditor(
    data.business_id,
    () => navigate(back, { replace: true }),
    kind,
    record,
  );
  // COMPUTED
  const config = benefitAdminModules[kind];
  const form = state.editor.form;
  const title = record ? `Editar ${config.singular}` : config.create;
  const selectedServices =
    kind === "programs"
      ? form.serviceId
        ? [Number(form.serviceId)]
        : []
      : form.serviceIds;
  const services = selectedServices.map((id) => ({
    id,
    name:
      data.services.find((service) => service.id === id)?.name ??
      record?.services?.find((service) => service.id === id)?.name ??
      `Servicio ${id}`,
  }));
  return (
    <div className="page-enter space-y-6">
      <ButtonTA
        variant="ghost"
        disabled={state.editor.busy}
        onClick={() => navigate(back)}
      >
        <ArrowLeft />
        Volver a {config.title.toLocaleLowerCase()}
      </ButtonTA>
      <ActionHeaderTA
        eyebrow={
          data.businesses.find((business) => business.id === data.business_id)
            ?.name
        }
        title={title}
        description="Define el beneficio, sus condiciones y los servicios participantes. Revisa cómo lo verá el cliente antes de guardar."
        actions={
          <ButtonTA
            type="submit"
            form="benefit-editor"
            disabled={state.editor.busy}
          >
            <Save />
            {state.editor.busy ? "Guardando…" : "Guardar cambios"}
          </ButtonTA>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <BenefitEditorTA
          state={state}
          services={data.services}
          professionals={data.professionals}
        />
        <aside className="space-y-5 xl:sticky xl:top-6">
          <PanelTA
            title="Vista previa"
            description="Resumen del beneficio para tus clientes"
          >
            <div className="space-y-4 px-6 pb-6">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${form.active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}
              >
                {form.active ? "Publicado al guardar" : "Pausado"}
              </span>
              <h2 className="break-words text-xl font-bold">
                {form.name || `Tu nueva ${config.singular}`}
              </h2>
              <p className="whitespace-pre-line break-words text-sm text-muted-foreground">
                {form.description || "Añade una descripción clara y breve."}
              </p>
              <div className="rounded-xl bg-secondary/70 p-4">
                {kind === "promotions" ? (
                  <>
                    <p className="text-2xl font-bold text-primary">
                      {form.discountType === "PERCENTAGE"
                        ? `${form.discount || 0}%`
                        : formatCurrency(Number(form.discount || 0))}
                    </p>
                    <p className="mt-1 break-all font-mono text-sm">
                      {form.code.toUpperCase() || "TU-CUPÓN"}
                    </p>
                    {form.endsAt && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Hasta {formatDate(form.endsAt)}
                      </p>
                    )}
                    {form.serviceIds.length > 0 && (
                      <p className="mt-2 text-xs">
                        Con condiciones específicas por servicio.
                      </p>
                    )}
                  </>
                ) : kind === "plans" ? (
                  <>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(Number(form.price || 0))}
                    </p>
                    <p className="mt-1 text-sm">
                      {form.appointments || 0} citas ·{" "}
                      {form.discountPercentage || 0}% de descuento
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {form.cycle === "MONTHLY"
                        ? "Mensual"
                        : form.cycle === "QUARTERLY"
                          ? "Trimestral"
                          : "Anual"}{" "}
                      · Sin renovación automática
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-primary">
                      {form.stamps || 0} sellos
                    </p>
                    <p className="mt-1 break-words text-sm">
                      {form.reward || "Define una recompensa"}
                    </p>
                  </>
                )}
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {(services.length
                  ? services.map((service) => service.name)
                  : ["Todos los servicios del negocio"]
                ).map((service) => (
                  <li key={service} className="flex gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {service}
                  </li>
                ))}
              </ul>
            </div>
          </PanelTA>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm">
            <CalendarCheck className="mb-3 size-5 text-primary" />
            <h3 className="font-semibold">Conectado con las reservas</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {kind === "programs"
                ? "Las citas completadas elegibles suman sellos automáticamente. El cliente puede seguir su progreso y canjear recompensas."
                : kind === "plans"
                  ? "Los clientes podrán contratar el plan y usar sus citas o descuentos en los servicios y fechas elegibles."
                  : "Las promociones vigentes aparecerán en los beneficios del negocio. El cupón se valida con el servicio, la fecha y sus límites al reservar."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

// VIEW
export const AdminBenefitEditorPage = ({
  kind,
}: {
  kind: BenefitAdminKind;
}) => {
  const { id } = useParams<{ id: string }>();
  const { listing } = useAdminBenefits();
  const data = listing.data;
  if (!data && listing.loading) return <DashboardSkeletonTA />;
  if (!data)
    return (
      <StateTA
        error
        title="No pudimos cargar el beneficio"
        description={listing.error ?? "No hay un negocio disponible."}
        onRetry={listing.refresh}
      />
    );
  const record = id
    ? data[kind].find((item) => item.id === Number(id))
    : undefined;
  if (id && !record)
    return (
      <StateTA
        title="Beneficio no encontrado"
        description="Este beneficio no está disponible en el negocio seleccionado."
      />
    );
  return (
    <EditorContentTA
      key={`${kind}:${data.business_id}:${id ?? "new"}`}
      kind={kind}
      data={data}
      record={record}
    />
  );
};
