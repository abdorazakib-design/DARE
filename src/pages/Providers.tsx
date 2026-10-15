import { useEffect, useMemo, useState } from 'react'
import { Cable, Plus, Trash2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { createProvider, deleteProvider, fetchProviders, updateProvider } from '@/data/api'
import type { BackhaulProvider, ProviderInput } from '@/lib/types'
import { Button, EmptyState, PageHeader, TextInput } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { ConfirmDialog, Modal, useToast } from '@/components/ui/feedback'

interface FormState {
  name: string
  contact_email: string
  phone: string
}

const emptyForm: FormState = { name: '', contact_email: '', phone: '' }

export default function Providers() {
  const { t } = useI18n()
  const { version, bump } = useData()
  const { push } = useToast()
  const [providers, setProviders] = useState<BackhaulProvider[] | null>(null)
  const [editing, setEditing] = useState<BackhaulProvider | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<BackhaulProvider | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    fetchProviders().then(setProviders).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const columns: Column<BackhaulProvider>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t.common.name,
        sortValue: (p) => p.name,
        render: (p) => <span className="font-medium text-white">{p.name}</span>,
      },
      {
        key: 'email',
        header: t.common.email,
        sortValue: (p) => p.contact_email ?? '',
        render: (p) => (
          <a href={p.contact_email ? `mailto:${p.contact_email}` : undefined} className="text-xs text-neon-300 hover:underline">
            {p.contact_email ?? '—'}
          </a>
        ),
      },
      { key: 'phone', header: t.common.phone, sortValue: (p) => p.phone ?? '', render: (p) => <span className="text-xs text-slate-400">{p.phone ?? '—'}</span> },
    ],
    [t],
  )

  const openEdit = (target: BackhaulProvider | 'new') => {
    if (target === 'new') setForm(emptyForm)
    else setForm({ name: target.name, contact_email: target.contact_email ?? '', phone: target.phone ?? '' })
    setEditing(target)
  }

  const save = async () => {
    if (!form.name.trim()) {
      push(t.request.invalid, 'error')
      return
    }
    const payload: ProviderInput = {
      name: form.name.trim(),
      contact_email: form.contact_email.trim() || null,
      phone: form.phone.trim() || null,
    }
    setSaving(true)
    try {
      if (editing === 'new') await createProvider(payload)
      else if (editing) await updateProvider(editing.id, payload)
      push(t.providers.saved)
      setEditing(null)
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setConfirmLoading(true)
    try {
      await deleteProvider(deleting.id)
      push(t.toast.deleted(deleting.name))
      setDeleting(null)
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setConfirmLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t.providers.title}
        subtitle={t.providers.subtitle}
        actions={
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openEdit('new')}>
            {t.providers.add}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={providers ?? []}
        loading={providers === null}
        empty={<EmptyState icon={<Cable className="h-6 w-6" />} title={t.providers.empty} />}
        onRowClick={openEdit}
        getKey={(p) => p.id}
        pageSize={8}
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t.providers.add : t.common.edit}
        size="sm"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {editing && editing !== 'new' ? (
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  setDeleting(editing)
                  setEditing(null)
                }}
              >
                {t.common.delete}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t.common.cancel}
              </Button>
              <Button loading={saving} onClick={() => void save()}>
                {t.common.save}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <TextInput label={t.common.name} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextInput label={t.common.email} type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          <TextInput label={t.common.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={t.common.deleteTitle}
        message={deleting ? t.common.deleteConfirm(deleting.name) : ''}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        loading={confirmLoading}
      />
    </div>
  )
}
