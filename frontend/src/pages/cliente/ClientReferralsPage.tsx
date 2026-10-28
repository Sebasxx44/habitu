import { Link } from "react-router-dom";
import { Gift, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { SkeletonTA } from "@/components/TA/SkeletonTA";
import { useReferrals } from "@/modules/referrals/useReferrals";
import { formatCurrency } from "@/i18n/formatters";

// COMPONENT
export const ClientReferralsPage = () => {
  const { t } = useTranslation("growth");
  const { data, loading, busy, error, invitation, preferences } = useReferrals();
  return <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
    <ActionHeaderTA icon={Users} eyebrow="habitu" title={t("referrals")} description={t("referralDescription")} />
    {loading && <SkeletonTA variant="dashboard" label={t("loading")} />}{error && <p role="alert" className="text-sm text-destructive">{t("error")}</p>}
    {data && <>
      <PanelTA title={t("code")} icon={Users} tone="primary"><div className="flex flex-wrap items-center gap-4 px-5 pb-5"><strong className="text-xl tracking-wider">{data.code}</strong><ButtonTA onClick={() => void invitation.copy()}>{t(invitation.copied ? "copied" : "copy")}</ButtonTA></div></PanelTA>
      <div className="grid gap-4 sm:grid-cols-2">{[{ key: "referred", value: data.attributed }, { key: "qualified", value: data.qualified }].map(metric => <PanelTA title={t(metric.key)} key={metric.key}><p className="px-5 pb-5 text-3xl font-bold">{metric.value}</p></PanelTA>)}</div>
      {!data.applied && <PanelTA title={t("referralCode")} description={t("referralTerms")}><form className="flex flex-col gap-3 px-5 pb-5 sm:flex-row" onSubmit={event => { event.preventDefault(); void invitation.apply(); }}><InputTA required maxLength={30} aria-label={t("referralCode")} value={invitation.code} onChange={event => invitation.setCode(event.target.value)} /><ButtonTA type="submit" disabled={busy}>{t("apply")}</ButtonTA></form></PanelTA>}
      <PanelTA icon={Gift} tone="accent" title={t("rewards")} description={data.programs.length === 0 ? t("noRewards") : t("referralTerms")}><div className="space-y-3 px-5 pb-5">{data.programs.map(program => <div key={program.business_id} className="rounded-xl bg-secondary p-4 text-sm"><p>{program.terms}</p><p className="mt-2 font-semibold">{formatCurrency(program.reward_minor / 100, program.currency)}</p></div>)}{data.rewards.map(reward => <div key={reward.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm"><div><strong>{reward.promo_code}</strong><p>{formatCurrency(reward.amount_minor / 100, reward.currency)} · {reward.status}</p></div>{reward.status === "ISSUED" && <ButtonTA variant="outline" nativeButton={false} render={<Link to={`/cliente/business/${reward.business_id}?promo_code=${encodeURIComponent(reward.promo_code)}`} />}>{t("prepare")}</ButtonTA>}</div>)}</div></PanelTA>
    </>}
    <PanelTA title={t("contactTitle")} description={t("contactDescription")}><form className="space-y-4 px-5 pb-5" onSubmit={event => { event.preventDefault(); void preferences.save(); }}><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={preferences.value.promotions_enabled} onChange={event => preferences.setValue({ ...preferences.value, promotions_enabled: event.target.checked })} />{t("contactConsent")}</label><div className="grid gap-3 sm:grid-cols-3"><label className="space-y-2 text-sm">{t("contactStart")}<InputTA required type="time" value={preferences.value.contact_start} onChange={event => preferences.setValue({ ...preferences.value, contact_start: event.target.value })} /></label><label className="space-y-2 text-sm">{t("contactEnd")}<InputTA required type="time" value={preferences.value.contact_end} onChange={event => preferences.setValue({ ...preferences.value, contact_end: event.target.value })} /></label><label className="space-y-2 text-sm">{t("timezone")}<InputTA required value={preferences.value.timezone} onChange={event => preferences.setValue({ ...preferences.value, timezone: event.target.value })} /></label></div><ButtonTA type="submit" disabled={busy}>{t("save")}</ButtonTA></form></PanelTA>
  </main>;
};
