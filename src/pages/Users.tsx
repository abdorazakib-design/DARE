import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Users as UsersIcon } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { createUser, deleteUser, fetchUsers, updateUser } from '@/data/api'
import type { AppUser, AppUserInput } from '@/lib/types'
import { Badge, Button, EmptyState, PageHeader, Select, TextInput } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { ConfirmDialog, Modal, useToast } from '@/components/ui/feedback'
import { RoleBadge } from '@/components/badges'
import { fmtDate } from '@/lib/utils'

const ROLES = ['admin', 'engineer', 'viewer'] as const

interface FormState {
  full_name: string
  email: string
  role: string
  phone: string
  is_active: boolean
}

const emptyForm: FormState = { full_name: '', email: '', role: 'viewer', phone: '', is_active: true }

export default function Users() {
  const { t, lang } = useI18n()
  const { version, bump } = useData()
  const { push } = useToast()
  const [users, setUsers] = useState<AppUser[] | null>(null)
  const [editing, setEditing] = useState<AppUser | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<AppUser | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    fetchUsers().then(setUsers).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const roleOptions = ROLES.map((r) => ({ value: r, label: t.users.roles[r] ?? r }))

  const columns: Column<AppUser>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t.users.fullName,
        sortValue: (u) => u.full_name,
        render: (u) => <span className="font-medium text-white">{u.full_name}</span>,
      },
      { key: 'email', header: t.common.email, sortValue: (u) => u.email, render: (u) => <span className="text-xs text-slate-400">{u.email}</span> },
      { key: 'role', header: t.users.role, sortValue: (u) => u.role, render: (u) => <RoleBadge role={u.role} /> },
      { key: 'phone', header: t.common.phone, sortValue: (u) => u.phone ?? '', render: (u) => <span className="text-xs text-slate-400">{u.phone ?? '—'}</span> },
      {
        key: 'active',
        header: t.common.status,
        sortValue: (u) => String(u.is_active),
        render: (u) => (
          <Badge color={u.is_active ? '#34d399' : '#64748b'}>{u.is_active ? t.common.active : t.common.inactive}</Badge>
        ),
      },
      { key: 'created', header: t.common.date, sortValue: (u) => u.created_at, render: (u) => fmtDate(u.created_at, lang) },
    ],
    [t, lang],
  )

  const openEdit = (target: AppUser | 'new') => {
    if (target === 'new') setForm(emptyForm)
    else setForm({ full_name: target.full_name, email: target.email, role: target.role, phone: target.phone ?? '', is_active: target.is_active })
    setEditing(target)
  }

  const save = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      push(t.request.invalid, 'error')
      return
    }
    const payload: AppUserInput = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      role: form.role,
      phone: form.phone.trim() || null,
      is_active: form.is_active,
    }
    setSaving(true)
    try {
      if (editing === 'new') await createUser(payload)
      else if (editing) await updateUser(editing.id, payload)
      push(t.users.saved)
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
      await deleteUser(deleting.id)
      push(t.toast.deleted(deleting.full_name))
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
        title={t.users.title}
        subtitle={t.users.subtitle}
        actions={
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openEdit('new')}>
            {t.users.add}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={users ?? []}
        loading={users === null}
        empty={<EmptyState icon={<UsersIcon className="h-6 w-6" />} title={t.users.empty} />}
        onRowClick={openEdit}
        getKey={(u) => u.id}
        pageSize={8}
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t.users.add : t.common.edit}
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
          <TextInput label={t.users.fullName} required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <TextInput label={t.common.email} required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label={t.users.role} required options={roleOptions} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <TextInput label={t.common.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 accent-neon-400"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            {form.is_active ? t.common.active : t.common.inactive}
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={t.common.deleteTitle}
        message={deleting ? t.common.deleteConfirm(deleting.full_name) : ''}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        loading={confirmLoading}
      />
    </div>
  )
}
