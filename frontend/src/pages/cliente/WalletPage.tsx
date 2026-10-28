import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, RefreshCw, Wallet, Gift } from 'lucide-react'
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { StateTA } from '@/components/TA/StateTA'
import { SkeletonTA } from '@/components/TA/SkeletonTA'
import { useWalletActivity } from '@/modules/wallet/composables/useWalletActivity'
import { WalletRechargeTA } from '@/modules/wallet/components/WalletRechargeTA'
import { WalletHistoryTA } from '@/modules/wallet/components/WalletHistoryTA'
import { WalletOrdersTA } from '@/modules/wallet/components/WalletOrdersTA'
import { formatWalletMoney as formatCurrency } from '@/modules/wallet/formatters'

// PAGE
export const WalletPage = () => {
  const { t } = useTranslation('wallet')
  const { account, history, payments } = useWalletActivity()
  const currency = account.wallet?.currency ?? 'COP'
  const total = Number(account.wallet?.balance ?? 0)
  const held = Number(account.wallet?.hold_balance ?? 0)
  const available = account.wallet?.is_active ? Math.max(0, total - held) : 0
  return <div className="mx-auto max-w-7xl space-y-7 pb-12">
    <ActionHeaderTA icon={Wallet} eyebrow={t('eyebrow')} title={t('title')} description={t('description')} actions={<ButtonTA variant="outline" disabled={account.loading} onClick={account.reload}><RefreshCw className="size-4" />{t('refresh')}</ButtonTA>} />
    {account.error ? <StateTA error title={t('loadError')} description={t('errorHelp')} onRetry={account.reload} /> : account.loading && !account.wallet ? <SkeletonTA variant="dashboard" label={t('loading')} /> : <>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]"><section className="surface-primary relative overflow-hidden rounded-3xl bg-primary p-6 text-white sm:p-8" aria-label={t('available')}><Wallet aria-hidden="true" className="absolute right-6 top-6 size-20 opacity-10" /><p className="text-sm font-medium opacity-90">{t('available')}</p><p className="mt-3 break-words text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl" aria-live="polite">{account.loading && !account.wallet ? '—' : formatCurrency(available, currency)}</p><p className="mt-3 max-w-lg text-sm opacity-90">{t(account.wallet && !account.wallet.is_active ? 'inactive' : 'availableHelp')}</p><dl className="mt-7 grid grid-cols-2 gap-4 border-t border-white/20 pt-5"><div><dt className="text-xs opacity-90">{t('balance')}</dt><dd className="mt-1 break-words font-medium tabular-nums">{formatCurrency(total, currency)}</dd></div><div><dt className="text-xs opacity-90">{t('held')}</dt><dd className="mt-1 break-words font-medium tabular-nums">{formatCurrency(held, currency)}</dd></div></dl>{held > 0 && <p className="mt-3 text-xs opacity-90">{t('heldHelp')}</p>}</section>
      <section className="surface-accent flex flex-col justify-between gap-5 rounded-3xl border border-accent p-6 sm:p-8"><div><Gift className="mb-4 size-10 rounded-2xl bg-black/5 p-2 text-current" /><h2 className="text-xl font-semibold tracking-tight">{t('benefits')}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('benefitsHelp')}</p></div><ButtonTA variant="default" className="w-fit" render={<Link to="/cliente/benefits" />} nativeButton={false}>{t('seeBenefits')}<ArrowUpRight className="size-4" /></ButtonTA><details className="border-t border-border pt-4 text-sm"><summary className="cursor-pointer font-medium">{t('walletUsage')}</summary><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t('usageHelp')}</p></details></section></div>
      <WalletOrdersTA payments={payments} reload={account.reload} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.35fr)]"><WalletRechargeTA active={account.wallet?.is_active === true} onCreated={() => { account.reload(); payments.check(); }} /><WalletHistoryTA history={history} currency={currency} reload={account.reload} /></div>
    </>}
  </div>
}
