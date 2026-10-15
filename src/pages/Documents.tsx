import { useEffect, useMemo, useState } from 'react'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { createDocument, deleteDocument, fetchDocuments } from '@/data/api'
import type { DocumentInput, DocumentRow } from '@/lib/types'
import { Button, EmptyState, PageHeader, Select, TextInput } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { ConfirmDialog, Modal, useToast } from '@/components/ui/feedback'
import { fmtDate } from '@/lib/utils'

interface FormState {
  title: string
  category_id: string
  url: string
  size: string
  uploaded_by: string
}

export default function Documents() {
  const { t, lang, pick } = useI18n()
  const { refs, maps, version, bump } = useData()
  const { push } = useToast()
  const [docs, setDocs] = useState<DocumentRow[] | null>(null)
  const [fCategory, setFCategory] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<FormState>({ title: '', category_id: '', url: '', size: '', uploaded_by: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<DocumentRow | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    fetchDocuments().then(setDocs).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const filtered = useMemo(() => (docs ?? []).filter((d) => !fCategory || d.category_id === fCategory), [docs, fCategory])

  const columns: Column<DocumentRow>[] = useMemo(
    () => [
      {
        key: 'title',
        header: t.common.title,
        sortValue: (d) => d.title,
        render: (d) => (
          <a
            href={d.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-white transition-colors hover:text-neon-300"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-neon-400" />
            <span className="truncate">{d.title}</span>
          </a>
        ),
      },
      {
        key: 'category',
        header: t.documents.category,
        sortValue: (d) => maps?.docCatById.get(d.category_id)?.code ?? '',
        render: (d) => pick(maps?.docCatById.get(d.category_id)) || '—',
      },
      { key: 'size', header: t.documents.size, sortValue: (d) => d.size ?? '', render: (d) => d.size ?? '—' },
      { key: 'uploaded', header: t.documents.uploadedBy, sortValue: (d) => d.uploaded_by ?? '', render: (d) => d.uploaded_by ?? '—' },
      { key: 'created', header: t.documents.addedAt, sortValue: (d) => d.created_at, render: (d) => fmtDate(d.created_at, lang) },
      {
        key: 'actions',
        header: t.common.actions,
        className: 'w-12 text-right',
        render: (d) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDeleting(d)
            }}
            className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
            aria-label={t.common.delete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ),
      },
    ],
    [t, lang, maps, pick],
  )

  const openAdd = () => {
    setForm({ title: '', category_id: fCategory || refs?.docCategories[0]?.id || '', url: '', size: '', uploaded_by: '' })
    setAdding(true)
  }

  const save = async () => {
    if (!form.title.trim() || !form.url.trim() || !form.category_id) {
      push(t.request.invalid, 'error')
      return
    }
    const payload: DocumentInput = {
      title: form.title.trim(),
      category_id: form.category_id,
      url: form.url.trim(),
      size: form.size.trim() || null,
      uploaded_by: form.uploaded_by.trim() || null,
    }
    setSaving(true)
    try {
      await createDocument(payload)
      push(t.documents.saved)
      setAdding(false)
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
      await deleteDocument(deleting.id)
      push(t.toast.deleted(deleting.title))
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
        title={t.documents.title}
        subtitle={t.documents.subtitle}
        actions={
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={openAdd}>
            {t.documents.add}
          </Button>
        }
      />

      <div className="glass mb-4 p-4">
        <Select
          label={t.documents.category}
          placeholder={t.common.all}
          options={(refs?.docCategories ?? []).map((c) => ({ value: c.id, label: pick(c) }))}
          value={fCategory}
          onChange={(e) => setFCategory(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={docs === null}
        empty={<EmptyState icon={<FileText className="h-6 w-6" />} title={t.documents.empty} />}
        getKey={(d) => d.id}
        pageSize={8}
      />

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title={t.documents.add}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)}>
              {t.common.cancel}
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              {t.common.save}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextInput label={t.common.title} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select
            label={t.documents.category}
            required
            options={(refs?.docCategories ?? []).map((c) => ({ value: c.id, label: pick(c) }))}
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          />
          <TextInput label={t.documents.url} required type="url" placeholder="https://" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label={t.documents.size} placeholder="2.4 MB" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
            <TextInput label={t.documents.uploadedBy} value={form.uploaded_by} onChange={(e) => setForm({ ...form, uploaded_by: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={t.common.deleteTitle}
        message={deleting ? t.common.deleteConfirm(deleting.title) : ''}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        loading={confirmLoading}
      />
    </div>
  )
}
