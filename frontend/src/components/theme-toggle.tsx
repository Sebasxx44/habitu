import { useTranslation } from 'react-i18next'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { ButtonTA } from '@/components/TA/ButtonTA'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/theme-provider'
import type { ThemeMode } from '@/design-system/tokens'

// COMPONENT
export const ThemeToggle = () => {
  const { t } = useTranslation()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const Icon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun
  const choices: { value: ThemeMode; label: string; icon: typeof Sun }[] = [{ value: 'light', label: t('shared.light'), icon: Sun }, { value: 'dark', label: t('shared.dark'), icon: Moon }, { value: 'system', label: t('shared.system'), icon: Monitor }]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<ButtonTA variant="ghost" size="icon" aria-label={t('shared.theme')}><Icon className="size-4" /></ButtonTA>} />
      <DropdownMenuContent align="end" className="w-40 rounded-xl p-1.5">
        {choices.map(choice => <DropdownMenuItem key={choice.value} onClick={() => setTheme(choice.value)} className="min-h-10 rounded-lg"><choice.icon className="size-4" /><span className="flex-1">{choice.label}</span>{theme === choice.value && <Check className="size-4 text-primary" />}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
