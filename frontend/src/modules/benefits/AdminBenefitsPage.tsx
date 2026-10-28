import { CalendarCheck, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { DashboardSkeletonTA, StateTA } from "@/components/TA/StateTA";
import { benefitAdminModules, benefitAdminPath } from "@/modules/benefits/adminPresentation";
import { BenefitMetricsTA } from "@/modules/benefits/components/BenefitMetricsTA";
import { AdminBenefitDirectoryTA } from "@/modules/benefits/components/AdminBenefitDirectoryTA";
import { AdminBenefitActivityTA } from "@/modules/benefits/components/AdminBenefitActivityTA";
import { AdminMembershipsTA } from "@/modules/benefits/components/AdminMembershipsTA";
import { AdminLoyaltyCardsTA } from "@/modules/benefits/components/AdminLoyaltyCardsTA";
import { AdminVouchersTA } from "@/modules/benefits/components/AdminVouchersTA";
import { useAdminBenefits } from "@/modules/benefits/composables/useAdminBenefits";
import type { BenefitAdminKind } from "@/modules/benefits/adminTypes";

// VIEW
export const AdminBenefitsPage = ({ initialKind = "programs" }: { initialKind?: BenefitAdminKind }) => {
  // COMPOSABLES
  const navigate = useNavigate();
  const { listing, selection } = useAdminBenefits();
  // COMPUTED
  const config = benefitAdminModules[initialKind];
  const data = listing.data;
  return <div className="page-enter space-y-7">
    <ActionHeaderTA eyebrow="Crecimiento de tu negocio" title={config.title} description={config.description} actions={<><ButtonTA variant="outline" disabled={listing.loading} aria-label="Actualizar módulo" onClick={listing.refresh}><RefreshCw />Actualizar</ButtonTA><ButtonTA disabled={!data || listing.loading} onClick={() => data && navigate(benefitAdminPath(initialKind, data.business_id, "/new"))}><Plus />{config.create}</ButtonTA></>} />
    {data && <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarCheck className="size-4" /></span><div><p className="text-sm font-semibold">Beneficios conectados con las reservas</p><p className="mt-0.5 text-xs text-muted-foreground">Catálogo, condiciones y disponibilidad compartidos con tus clientes.</p></div></div><label className="space-y-1 text-xs text-muted-foreground"><span>Negocio</span><select className="block h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground sm:min-w-56" value={selection.businessId || data.business_id} disabled={listing.loading} onChange={(event) => selection.setBusinessId(event.target.value)}>{data.businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label></div>}
    {listing.error && !data ? <StateTA error title="No pudimos cargar el módulo" description={listing.error} onRetry={listing.refresh} /> : listing.loading && !data ? <DashboardSkeletonTA /> : data && <>
      {listing.error && <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">No pudimos actualizar los datos. Se muestra la última información disponible.</p>}
      <BenefitMetricsTA data={data} kind={initialKind} />
      <AdminBenefitDirectoryTA key={`${initialKind}:${data.business_id}`} kind={initialKind} data={data} refresh={listing.refresh} />
      {initialKind === "plans" && <AdminMembershipsTA key={data.business_id} memberships={data.memberships ?? []} />}
      {initialKind === "programs" && <><AdminLoyaltyCardsTA key={`cards:${data.business_id}`} cards={data.cards} setPage={selection.setCardsPage} businessId={data.business_id} /><AdminVouchersTA key={`vouchers:${data.business_id}`} vouchers={data.vouchers} refresh={listing.refresh} /></>}
      <AdminBenefitActivityTA key={`${initialKind}:${data.business_id}:activity`} kind={initialKind} transactions={data.transactions ?? []} />
    </>}
  </div>;
};
