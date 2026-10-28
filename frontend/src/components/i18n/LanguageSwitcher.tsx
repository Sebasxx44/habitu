import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

// COMPONENT
export const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  return <DropdownMenu>
    <DropdownMenuTrigger render={<ButtonTA variant="ghost" aria-label={t('shared.language')} className="gap-1.5 px-2"><Globe className="size-4" /><span className="text-xs uppercase">{current}</span></ButtonTA>} />
    <DropdownMenuContent align="end">
      {([{ code: 'es', label: 'Español' }, { code: 'en', label: 'English' }] as const).map(language => <DropdownMenuItem key={language.code} onClick={() => { void i18n.changeLanguage(language.code) }} className={current === language.code ? 'font-semibold text-primary' : ''}>{language.label}{current === language.code && <span aria-hidden="true" className="ml-auto">✓</span>}</DropdownMenuItem>)}
    </DropdownMenuContent>
  </DropdownMenu>
}
