import { useTranslation } from "react-i18next";
import { CreditCard, ShieldCheck, ArrowRight, Check, LoaderCircle, RefreshCw, Plus } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { formatWalletMoney as formatCurrency } from "@/modules/wallet/formatters";
import { useWalletCheckout } from "@/modules/wallet/composables/useWalletCheckout";

// COMPONENT
export const WalletRechargeTA = ({ active, onCreated }: { active: boolean; onCreated: () => void }) => {
  const { t } = useTranslation("wallet");
  const { config, selection, submission } = useWalletCheckout(onCreated);
  const provider = selection.provider === "wompi" ? "Wompi" : "MercadoPago";
  return (
    <section
      className="surface-card rounded-3xl border border-primary/15 bg-card p-5 shadow-sm sm:p-6"
      aria-labelledby="wallet-recharge-title"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><Plus className="size-5" aria-hidden="true" /></span>
        <div><p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("rechargeEyebrow")}</p><h2 id="wallet-recharge-title" className="mt-0.5 text-xl font-semibold tracking-tight">{t("recharge")}</h2></div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t("rechargeHelp")}
      </p>
      <fieldset
        disabled={submission.busy || !active}
        className="mt-6 space-y-5"
      >
        <div className="grid grid-cols-3 gap-2">
          {[20000, 50000, 100000].map((amount) => (
            <ButtonTA
              key={amount}
              variant={selection.value === amount ? "default" : "outline"}
              className="h-12 rounded-2xl px-2 text-xs shadow-none transition-colors duration-200"
              aria-pressed={selection.value === amount}
              onClick={() => selection.setAmount(String(amount))}
            >
              {formatCurrency(amount)}
            </ButtonTA>
          ))}
        </div>
        <label className="block text-sm font-medium">
          {t("amount")}
          <InputTA
            className="mt-2 h-14 bg-background text-lg font-semibold tabular-nums"
            inputMode="decimal"
            type="number"
            min={config.value?.min_amount ?? 5000}
            max={config.value?.max_amount ?? 5000000}
            step="0.01"
            value={selection.amount}
            onChange={(event) => selection.setAmount(event.target.value)}
            aria-describedby="wallet-amount-help"
            aria-invalid={selection.amount.length > 0 && !selection.validAmount}
          />
        </label>
        <p id="wallet-amount-help" className={`text-xs ${selection.amount.length > 0 && !selection.validAmount ? "text-destructive" : "text-muted-foreground"}`}>
          {t("range", {
            min: formatCurrency(config.value?.min_amount ?? 5000),
            max: formatCurrency(config.value?.max_amount ?? 5000000),
          })}
        </p>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("gateway")}
          </p>
          <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors duration-200 focus-within:ring-2 focus-within:ring-primary/30 ${selection.provider === "wompi" ? "border-primary/35 bg-primary/5" : "border-border bg-background"}`}>
            <input
              type="radio"
              name="wallet-provider"
              value="wompi"
              checked={selection.provider === "wompi"}
              onChange={() => selection.setProvider("wompi")}
              className="sr-only"
            />
            <CreditCard className="size-5 text-primary" />
            <span className="flex-1"><span className="block font-semibold">Wompi</span><span className="mt-0.5 block text-xs text-muted-foreground">{t("wompiMethods")}</span></span>
            <span className={`grid size-5 place-items-center rounded-full border ${selection.provider === "wompi" ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{selection.provider === "wompi" && <Check className="size-3.5" aria-hidden="true" />}</span>
          </label>
          {config.value?.mercadopago_enabled && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4">
              <input
                type="radio"
                name="wallet-provider"
                value="mercadopago"
                checked={selection.provider === "mercadopago"}
                onChange={() => selection.setProvider("mercadopago")}
                className="accent-primary"
              />
              <span>MercadoPago</span>
            </label>
          )}
        </div>
        {selection.provider === "wompi" && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("wompiHelp")}
          </p>
        )}
        {!active ? (
          <p role="status" className="text-sm text-muted-foreground">
            {t("inactive")}
          </p>
        ) : config.failed ? (
          <div role="status" className="rounded-2xl bg-muted/50 p-4 text-sm"><p>{t("configError")}</p><ButtonTA className="mt-2" variant="ghost" onClick={config.retry}><RefreshCw className="size-3.5" />{t("retry")}</ButtonTA></div>
        ) : !config.loading &&
          !(selection.provider === "wompi"
            ? config.value?.enabled
            : config.value?.mercadopago_enabled) ? (
          <div role="status" className="rounded-2xl border border-border bg-muted/40 p-4"><p className="text-sm font-medium">{t("gatewaySoon")}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("noGateway")}</p><ButtonTA variant="ghost" className="mt-2 min-h-9 px-0 text-xs hover:bg-transparent" onClick={config.retry}><RefreshCw className="size-3.5" />{t("checkAvailability")}</ButtonTA></div>
        ) : (
          config.value?.environment === "test" &&
          selection.provider === "wompi" && (
            <p role="status" className="text-xs text-muted-foreground">
              {t("sandbox")}
            </p>
          )
        )}
        {Number.isFinite(selection.value) && selection.value > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-5"><span className="text-sm text-muted-foreground">{t("totalToAdd")}</span><strong className="text-xl tracking-tight tabular-nums">{formatCurrency(selection.value)}</strong></div>
        )}
        {submission.error && (
          <p role="alert" className="text-sm text-destructive">
            {t("checkoutError")}
          </p>
        )}
        <ButtonTA
          className="h-12 w-full rounded-2xl shadow-sm"
          disabled={
            !selection.valid || submission.busy || config.loading || !active
          }
          onClick={() => void submission.submit()}
        >
          {t(submission.busy ? "paying" : "pay", { provider })}
          {submission.busy || config.loading ? <LoaderCircle className="size-4 motion-safe:animate-spin" /> : <ArrowRight className="size-4" />}
        </ButtonTA>
      </fieldset>
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0" />
        {t("secure")}
      </p>
      <ol className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5">
        {["step1", "step2", "step3"].map((key, index) => (
          <li key={key} className="space-y-2 text-[11px] leading-relaxed text-muted-foreground">
            <span className="grid size-6 place-items-center rounded-full bg-muted text-foreground">
              {index + 1}
            </span>
            <span className="block">{t(key)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
};
