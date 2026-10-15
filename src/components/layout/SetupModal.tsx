import { useState } from 'react'
import { Check, Copy, Database, FileText, KeyRound, Link2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useToast } from '@/components/ui/feedback'
import { Modal } from '@/components/ui/feedback'

const ENV_TEMPLATE = `VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY`

interface SetupModalProps {
  open: boolean
  onClose: () => void
}

export function SetupModal({ open, onClose }: SetupModalProps) {
  const { t } = useI18n()
  const { push } = useToast()
  const [copied, setCopied] = useState(false)

  const copyEnv = async () => {
    try {
      await navigator.clipboard.writeText(ENV_TEMPLATE)
      setCopied(true)
      push(t.setup.copied)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — user can still select the text manually
    }
  }

  const steps = [
    { icon: Link2, text: t.setup.step1 },
    { icon: Database, text: t.setup.step2 },
    { icon: KeyRound, text: t.setup.step3 },
  ]

  return (
    <Modal open={open} onClose={onClose} title={t.setup.title} size="lg">
      <p className="mb-5 text-sm text-slate-400">{t.setup.subtitle}</p>
      <ol className="space-y-3">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-neon-500 to-plasma-500 text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="glass flex flex-1 items-center gap-3 rounded-xl px-3.5 py-2.5">
                <Icon className="h-4 w-4 shrink-0 text-neon-300" />
                <p className="text-[13px] leading-relaxed text-slate-300">{step.text}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-5">
        <p className="mb-1.5 text-[13px] font-medium text-slate-300">{t.setup.envVars}</p>
        <div className="relative rounded-xl border border-white/10 bg-abyss-950/80 p-3.5 pr-12">
          <code className="block font-mono text-xs leading-relaxed whitespace-pre text-neon-300/90">{ENV_TEMPLATE}</code>
          <button
            onClick={copyEnv}
            className="absolute top-2.5 right-2.5 cursor-pointer rounded-lg border border-white/10 p-1.5 text-slate-400 transition-all hover:border-neon-400/50 hover:text-neon-300"
            aria-label="Copy"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
        <FileText className="h-4 w-4 shrink-0 text-plasma-300" />
        <p className="text-xs text-slate-400">{t.setup.sqlFile}</p>
      </div>
    </Modal>
  )
}
