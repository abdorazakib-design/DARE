import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n, type Lang } from '@/i18n'

const languages: Lang[] = ['en', 'fr']

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n()

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-0.5">
      <Globe className="ml-1.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
      {languages.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cn(
            'cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase transition-all duration-200',
            lang === l
              ? 'bg-gradient-to-r from-neon-500 to-plasma-500 text-white shadow-[0_0_12px_rgb(34_211_238/0.3)]'
              : 'text-slate-400 hover:text-white',
          )}
          aria-pressed={lang === l}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
