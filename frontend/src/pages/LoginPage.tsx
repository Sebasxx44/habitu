import { useLocation } from 'react-router-dom'
import { LinkButtonTA } from '@/components/TA/LinkButtonTA'
import { accountPath } from '@/modules/auth/services/returnPath'
import { ArrowLeft, ArrowRight, ArrowUpRight, CircleAlert, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher'
import { ActionHeaderTA } from '@/components/TA/ActionHeaderTA'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { HabituLogo } from '@/components/ui/HabituLogo'
import { ThemeToggle } from '@/components/theme-toggle'
import { GoogleSignInTA } from '@/modules/auth/components/GoogleSignInTA'
import { LoginFieldsTA } from '@/modules/auth/components/LoginFieldsTA'
import { useLoginForm } from '@/modules/auth/composables/useLoginForm'
import { LegalLinksTA } from '@/modules/legal/LegalLinksTA'

// COMPONENT
export const LoginPage = () => {
  // COMPOSABLES
  const { t } = useTranslation('authUi')
  const location = useLocation()
  const { fields, feedback, actions } = useLoginForm()

  // COMPUTED
  const isChallenge = feedback.step !== 'credentials'
  const title = feedback.step === 'twoFactor' ? t('twoFactorTitle') : feedback.step === 'password' ? t('passwordTitle') : t('title')
  const description = feedback.step === 'twoFactor' ? t('twoFactorDescription') : feedback.step === 'password' ? t('passwordDescription') : t('description')

  return (
    <main className="auth-page relative isolate flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] [background-image:linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] [background-size:64px_64px]" />
      <header className="flex items-center justify-between gap-3 px-5 pb-5 pt-[max(20px,env(safe-area-inset-top))] sm:px-10 lg:px-14">
        <HabituLogo variant="horizontal" className="w-32 sm:w-36" />
        <div className="flex items-center gap-1"><LanguageSwitcher /><ThemeToggle /></div>
      </header>

      <div className="mx-auto grid w-full max-w-[1280px] flex-1 items-center gap-14 px-5 pb-12 pt-7 sm:px-10 lg:grid-cols-2 lg:gap-24 lg:px-14 lg:py-14">
        {/* BRAND */}
        <section className="relative hidden min-h-[570px] flex-col justify-between rounded-[36px] border border-primary/10 bg-gradient-to-br from-primary/[0.07] via-card to-primary/[0.04] p-10 lg:flex xl:p-12">
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-[36px]">
            <div className="absolute -right-40 top-24 size-[440px] rounded-full border border-primary/10" />
            <div className="absolute -right-24 top-40 size-[312px] rounded-full border border-primary/10" />
            <div className="absolute -right-8 top-56 size-[184px] rounded-full border border-primary/10" />
          </div>
          <div className="relative flex items-center gap-2 text-xs font-medium text-primary"><Sparkles className="size-4" aria-hidden="true" />{t('brandNote')}</div>
          <div className="relative py-14">
            <h2 className="text-[64px] font-semibold leading-[1.02] tracking-[-0.065em] xl:text-[78px]">{t('brandTitle')}<br /><span className="text-primary">{t('brandHighlight')}</span></h2>
            <p className="mt-7 max-w-[290px] text-base leading-7 text-muted-foreground">{t('brandDescription')}</p>
          </div>
          <div className="relative flex items-center justify-between gap-5 border-t border-primary/10 pt-6"><p className="max-w-[240px] text-xs leading-5 text-muted-foreground">{t('brandFootnote')}</p><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-card text-primary"><ArrowUpRight className="size-5" /></span></div>
        </section>

        {/* SIGN IN */}
        <section className="mx-auto w-full max-w-[420px] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          <div className="rounded-[28px] border border-border/70 bg-card p-6 shadow-[0_20px_70px_-30px_rgba(17,24,39,0.2)] sm:p-9">
            {isChallenge && <ButtonTA type="button" variant="ghost" size="sm" onClick={actions.restart} disabled={feedback.loading} className="-ml-2 mb-5 gap-2 text-xs text-muted-foreground"><ArrowLeft className="size-3.5" aria-hidden="true" />{t('back')}</ButtonTA>}
            <div className="mb-8" aria-live="polite"><ActionHeaderTA title={title} description={description} /></div>
            <form onSubmit={actions.submit} className="space-y-5" aria-busy={feedback.loading}>
              <LoginFieldsTA key={feedback.step} fields={fields} feedback={feedback} />
              <div aria-live="polite" aria-atomic="true">
                {feedback.error && <div id="login-feedback" className="flex items-start gap-2.5 rounded-xl border border-destructive/15 bg-destructive/5 p-3.5 text-sm leading-5 text-destructive motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>{feedback.error}</p></div>}
              </div>
              <ButtonTA type="submit" disabled={feedback.loading} className="h-12 w-full gap-2 rounded-2xl text-sm font-semibold shadow-[0_6px_16px_-8px_hsl(var(--primary)/0.5)] transition-all duration-200 motion-reduce:transition-none">
                {feedback.loading ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" />{isChallenge ? t('verifying') : t('signingIn')}</> : <>{isChallenge ? t('verify') : t('continue')}<ArrowRight className="size-4" aria-hidden="true" /></>}
              </ButtonTA>
            </form>
            {!isChallenge && <div className="mt-4 flex flex-col gap-1"><LinkButtonTA variant="ghost" to={accountPath('/register', location.search)}>{t('registerLink')}</LinkButtonTA><LinkButtonTA variant="ghost" to={accountPath('/forgot-password', location.search)}>{t('forgotLink')}</LinkButtonTA></div>}
            {!isChallenge && <GoogleSignInTA onCredential={actions.signInWithGoogle} disabled={feedback.loading} />}
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" aria-hidden="true" />{t('security')}</p>
          <div className="mt-3"><LegalLinksTA /></div>
        </section>
      </div>
    </main>
  )
}
