import { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { fetchPhases, updatePhase } from '@/data/api'
import type { ProjectPhase } from '@/lib/types'
import { Button, Card, PageHeader, Select, TextInput } from '@/components/ui/primitives'
import { Modal, useToast } from '@/components/ui/feedback'
import { StatusBadge } from '@/components/badges'
import { cn, fmtDate, fmtNumber } from '@/lib/utils'

interface FormState {
  name: string
  phase_order: number
  status_id: string
  progress: number
  start_date: string
  end_date: string
}

export default function Project() {
  const { t, lang, pick } = useI18n()
  const { maps, version, bump } = useData()
  const { push } = useToast()
  const [phases, setPhases] = useState<ProjectPhase[] | null>(null)
  const [editing, setEditing] = useState<ProjectPhase | null>(null)
  const [form, setForm] = useState<FormState>({
    name: '',
    phase_order: 1,
    status_id: '',
    progress: 0,
    start_date: '',
    end_date: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPhases().then(setPhases).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const sorted = useMemo(() => [...(phases ?? [])].sort((a, b) => a.phase_order - b.phase_order), [phases])

  const overall = useMemo(() => {
    if (!sorted.length) return 0
    return Math.round(sorted.reduce((s, p) => s + p.progress, 0) / sorted.length)
  }, [sorted])

  const openEdit = (phase: ProjectPhase) => {
    setForm({
      name: phase.name,
      phase_order: phase.phase_order,
      status_id: phase.status_id,
      progress: phase.progress,
      start_date: phase.start_date ?? '',
      end_date: phase.end_date ?? '',
    })
    setEditing(phase)
  }

  const save = async () => {
    if (!editing || !form.name.trim() || !form.status_id) {
      push(t.request.invalid, 'error')
      return
    }
    setSaving(true)
    try {
      await updatePhase(editing.id, {
        name: form.name.trim(),
        phase_order: form.phase_order,
        status_id: form.status_id,
        progress: Math.min(100, Math.max(0, form.progress)),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      })
      push(t.project.updated)
      setEditing(null)
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t.project.title}
        subtitle={t.project.subtitle}
        actions={
          <div className="glass px-4 py-2 text-right">
            <p className="text-[10px] tracking-wide text-slate-500 uppercase">{t.project.overall}</p>
            <p className="font-display text-xl font-bold text-neon-300">{fmtNumber(overall, lang)}%</p>
          </div>
        }
      />

      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>{t.project.overall}</span>
          <span className="font-medium text-neon-300">{overall}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-gradient-to-r from-neon-500 to-plasma-500 transition-all duration-700" style={{ width: `${overall}%` }} />
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((phase) => (
          <button key={phase.id} onClick={() => openEdit(phase)} className="glass glass-hover cursor-pointer p-5 text-left">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-neon-500 to-plasma-500 text-xs font-bold text-white">
                  {phase.phase_order}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{phase.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {fmtDate(phase.start_date, lang)} → {fmtDate(phase.end_date, lang)}
                  </p>
                </div>
              </div>
              <StatusBadge status={maps?.statusById.get(phase.status_id)} />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    phase.progress === 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-neon-500 to-plasma-500',
                  )}
                  style={{ width: `${phase.progress}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-semibold text-slate-300">{phase.progress}%</span>
            </div>
          </button>
        ))}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={t.project.editPhase}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t.common.cancel}
            </Button>
            <Button loading={saving} icon={<Save className="h-4 w-4" />} onClick={() => void save()}>
              {t.common.save}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextInput label={t.project.phase} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label={t.project.phases}
              type="number"
              min={1}
              value={form.phase_order}
              onChange={(e) => setForm({ ...form, phase_order: Math.max(1, Number(e.target.value) || 1) })}
            />
            <Select
              label={t.common.status}
              required
              options={(maps?.statusesByScope('project') ?? []).map((s) => ({ value: s.id, label: pick(s) }))}
              value={form.status_id}
              onChange={(e) => setForm({ ...form, status_id: e.target.value })}
            />
            <TextInput
              label={t.project.progress}
              type="number"
              min={0}
              max={100}
              value={form.progress}
              onChange={(e) => setForm({ ...form, progress: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
            />
            <span />
            <TextInput label={t.project.startDate} type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <TextInput label={t.project.endDate} type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
