import { useEffect, useMemo, useRef, useState } from 'react'
import { Database, Pencil, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { fetchCapacity, updateCapacityEntitlement, upsertCapacityEntitlement } from '@/data/api'
import type { CapacityEntitlement, CapacityEntitlementInput } from '@/lib/types'
import { Button, Card, EmptyState, PageHeader, Select, TextInput } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { Modal, useToast } from '@/components/ui/feedback'
import { fmtNumber } from '@/lib/utils'

/** Tolerant header lookup: lowercased, spaces stripped. */
const cell = (row: Record<string, unknown>, ...names: string[]): unknown => {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')
  for (const [k, v] of Object.entries(row)) {
    if (names.some((n) => norm(n) === norm(k))) return v
  }
  return undefined
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function Capacity() {
  const { t, lang } = useI18n()
  const { refs, maps, version, bump } = useData()
  const { push } = useToast()
  const [rows, setRows] = useState<CapacityEntitlement[] | null>(null)
  const [opFilter, setOpFilter] = useState('')
  const [stationFilter, setStationFilter] = useState('')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  /** Row being edited in the rights modal (click on a table row). */
  const [editing, setEditing] = useState<CapacityEntitlement | null>(null)
  const [editForm, setEditForm] = useState({ entitlement: '0', day1_10g: '0', day1_100g: '0', fp: 'FP1', dls: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    fetchCapacity()
      .then(setRows)
      .catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter(
      (r) =>
        (!opFilter || r.operator_id === opFilter) &&
        (!stationFilter || r.station_a_id === stationFilter || r.station_b_id === stationFilter),
    )
  }, [rows, opFilter, stationFilter])

  const totals = useMemo(() => {
    let entitled = 0
    let provisioned = 0
    for (const r of filtered) {
      entitled += Number(r.entitlement_gbps)
      provisioned += Number(r.provisioned_10g_gbps) + Number(r.provisioned_100g_gbps)
    }
    return { entitled, provisioned, remaining: entitled - provisioned }
  }, [filtered])


  const columns: Column<CapacityEntitlement>[] = useMemo(
    () => [
      {
        key: 'operator',
        header: t.capacity.operator,
        sortValue: (r) => maps?.operatorById.get(r.operator_id)?.name ?? '',
        render: (r) => (
          <span className="text-xs font-medium text-white">
            {maps?.operatorById.get(r.operator_id)?.name ?? '—'}
            {r.party_code ? <span className="ml-1.5 text-[10px] text-slate-500">({r.party_code})</span> : null}
          </span>
        ),
      },
      {
        key: 'route',
        header: t.capacity.route,
        sortValue: (r) =>
          `${maps?.stationById.get(r.station_a_id)?.name}→${maps?.stationById.get(r.station_b_id)?.name}`,
        render: (r) => (
          <span className="text-xs">
            {maps?.stationById.get(r.station_a_id)?.name ?? '—'} <span className="text-slate-600">→</span>{' '}
            {maps?.stationById.get(r.station_b_id)?.name ?? '—'}
          </span>
        ),
      },
      {
        key: 'fp',
        header: 'FP',
        sortValue: (r) => r.fp_pair,
        render: (r) => <span className="font-mono text-xs text-slate-300">{r.fp_pair}</span>,
      },
      {
        key: 'dls',
        header: 'DLS',
        sortValue: (r) => r.dls_number ?? 0,
        render: (r) => <span className="font-mono text-xs text-slate-400">{r.dls_number ?? '—'}</span>,
      },
      {
        key: 'entitled',
        header: t.capacity.entitled,
        sortValue: (r) => Number(r.entitlement_gbps),
        render: (r) => (
          <span className="text-xs font-semibold text-white">{fmtNumber(Number(r.entitlement_gbps), lang)}</span>
        ),
      },
      {
        key: 'day1',
        header: t.capacity.day1,
        sortValue: (r) => Number(r.day1_10g_gbps) + Number(r.day1_100g_gbps),
        render: (r) => (
          <span className="text-xs text-slate-400">
            {fmtNumber(Number(r.day1_10g_gbps) + Number(r.day1_100g_gbps), lang)}
            <span className="ml-1 text-[10px] text-slate-600">
              (10G {fmtNumber(Number(r.day1_10g_gbps), lang)} · 100G {fmtNumber(Number(r.day1_100g_gbps), lang)})
            </span>
          </span>
        ),
      },
      {
        key: 'provisioned',
        header: t.capacity.provisioned,
        sortValue: (r) => Number(r.provisioned_10g_gbps) + Number(r.provisioned_100g_gbps),
        render: (r) => (
          <span className="text-xs text-neon-300">
            {fmtNumber(Number(r.provisioned_10g_gbps) + Number(r.provisioned_100g_gbps), lang)}
            <span className="ml-1 text-[10px] text-slate-600">
              (10G {fmtNumber(Number(r.provisioned_10g_gbps), lang)} · 100G{' '}
              {fmtNumber(Number(r.provisioned_100g_gbps), lang)})
            </span>
          </span>
        ),
      },
      {
        key: 'remaining',
        header: t.capacity.remaining,
        sortValue: (r) =>
          Number(r.entitlement_gbps) - Number(r.provisioned_10g_gbps) - Number(r.provisioned_100g_gbps),
        render: (r) => {
          const rem = Number(r.entitlement_gbps) - Number(r.provisioned_10g_gbps) - Number(r.provisioned_100g_gbps)
          const cls =
            rem <= 0 ? 'text-rose-400' : rem < Number(r.entitlement_gbps) * 0.2 ? 'text-amber-400' : 'text-emerald-400'
          return <span className={`text-xs font-semibold ${cls}`}>{fmtNumber(rem, lang)}</span>
        },
      },
      {
        key: 'usage',
        header: t.capacity.usage,
        sortValue: (r) =>
          Number(r.entitlement_gbps) > 0
            ? (Number(r.provisioned_10g_gbps) + Number(r.provisioned_100g_gbps)) / Number(r.entitlement_gbps)
            : 0,
        render: (r) => {
          const pct =
            Number(r.entitlement_gbps) > 0
              ? ((Number(r.provisioned_10g_gbps) + Number(r.provisioned_100g_gbps)) / Number(r.entitlement_gbps)) * 100
              : 0
          return (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/8">
                <div
                  className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-400' : pct >= 70 ? 'bg-amber-400' : 'bg-neon-400'}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400">{pct.toFixed(0)}%</span>
            </div>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, lang, maps],
  )

  /**
   * Import from the operator's capacity spreadsheet (.xlsx): each row is
   * resolved against the operators / landing_stations refs (by code, then by
   * name) and upserted on the (operator, A, B, FP) unique key.
   */
  const importFile = async (file: File) => {
    setImporting(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const sheet = wb.Sheets[wb.SheetNames[0]]
      // Headers live on row 2 of the operator file → data starts at row 3.
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { range: 1 })
      if (json.length === 0) throw new Error(t.capacity.importEmpty)

      const findOperator = (code: unknown, name: unknown): string | undefined => {
        const c = String(code ?? '').trim().toUpperCase()
        const n = String(name ?? '').trim().toLowerCase()
        return (
          refs?.operators.find((o) => o.code.toUpperCase() === c)?.id ??
          refs?.operators.find((o) => o.name.toLowerCase() === n)?.id
        )
      }
      const findStation = (code: unknown, name: unknown): string | undefined => {
        const c = String(code ?? '').trim().toUpperCase()
        const n = String(name ?? '').trim().toLowerCase()
        return (
          refs?.stations.find((s) => s.code.toUpperCase() === c)?.id ??
          refs?.stations.find((s) => s.name.toLowerCase() === n)?.id
        )
      }

      let ok = 0
      const skipped: string[] = []
      for (const raw of json) {
        const operatorId = findOperator(cell(raw, 'party code'), cell(raw, 'party name'))
        const stationA = findStation(cell(raw, 'station A code', ' station A code'), cell(raw, 'station A'))
        const stationB = findStation(cell(raw, 'station B code'), cell(raw, 'station b', 'station B'))
        const fp = String(cell(raw, 'fp pair') ?? '').trim().toUpperCase()
        if (!operatorId || !stationA || !stationB || !fp) {
          skipped.push(String(cell(raw, 'party name') ?? '?'))
          continue
        }
        const dls = num(cell(raw, 'DLS Number')) || null
        const payload: CapacityEntitlementInput = {
          operator_id: operatorId,
          party_code: String(cell(raw, 'party code') ?? '').trim() || null,
          station_a_id: stationA,
          station_b_id: stationB,
          fp_pair: fp,
          dls_number: dls,
          entitlement_gbps: num(cell(raw, 'capacity entiltement', 'capacity entitlement')),
          day1_10g_gbps: num(cell(raw, '10G day1')),
          day1_100g_gbps: num(cell(raw, '100G day1')),
          provisioned_10g_gbps: num(cell(raw, '10G provionned', '10G provisioned', '10G provisionned')),
          provisioned_100g_gbps: num(cell(raw, '100G provionned', '100G provisioned', '100G provisionned')),
        }
        await upsertCapacityEntitlement(payload)
        ok += 1
      }
      push(t.capacity.imported(ok, skipped.length))
      if (skipped.length > 0) console.warn('Capacity import — unresolved rows:', skipped)
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const stat = (label: string, value: number, cls: string) => (
    <Card key={label} className="flex-1">
      <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${cls}`}>
        {fmtNumber(value, lang)} <span className="text-sm font-medium text-slate-500">Gbps</span>
      </p>
    </Card>
  )

  /** Click a capacity row → edit its rights in a modal. */
  const openEdit = (row: CapacityEntitlement) => {
    setEditing(row)
    setEditForm({
      entitlement: String(row.entitlement_gbps),
      day1_10g: String(row.day1_10g_gbps),
      day1_100g: String(row.day1_100g_gbps),
      fp: row.fp_pair,
      dls: row.dls_number != null ? String(row.dls_number) : '',
    })
  }

  const saveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    try {
      await updateCapacityEntitlement(editing.id, {
        entitlement_gbps: num(editForm.entitlement),
        day1_10g_gbps: num(editForm.day1_10g),
        day1_100g_gbps: num(editForm.day1_100g),
        fp_pair: editForm.fp.trim().toUpperCase() || editing.fp_pair,
        dls_number: editForm.dls.trim() ? num(editForm.dls) : null,
      })
      push(t.capacity.updated)
      setEditing(null)
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  const editLabel = editing
    ? `${maps?.operatorById.get(editing.operator_id)?.name ?? ''} · ${maps?.stationById.get(editing.station_a_id)?.name ?? ''} → ${maps?.stationById.get(editing.station_b_id)?.name ?? ''} · ${editing.fp_pair}`
    : ''


  return (
    <div>
      <PageHeader
        title={t.capacity.title}
        subtitle={t.capacity.subtitle}
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importFile(f)
              }}
            />
            <Button
              variant="outline"
              loading={importing}
              icon={<Upload className="h-4 w-4" />}
              onClick={() => fileRef.current?.click()}
            >
              {t.capacity.import}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        {stat(t.capacity.totalEntitled, totals.entitled, 'text-white')}
        {stat(t.capacity.totalProvisioned, totals.provisioned, 'text-neon-300')}
        {stat(t.capacity.totalRemaining, totals.remaining, totals.remaining <= 0 ? 'text-rose-400' : 'text-emerald-400')}
      </div>

      <div className="glass mb-4 flex flex-wrap items-end gap-3 p-4">
        <Select
          label={t.capacity.operator}
          placeholder={t.common.all}
          className="max-w-xs flex-1"
          options={(refs?.operators ?? []).map((o) => ({ value: o.id, label: o.name }))}
          value={opFilter}
          onChange={(e) => setOpFilter(e.target.value)}
        />
        <Select
          label={t.capacity.station}
          placeholder={t.common.all}
          className="max-w-xs flex-1"
          options={(refs?.stations ?? []).map((s) => ({ value: s.id, label: s.name }))}
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
        />
        <p className="ml-auto pb-2.5 text-xs text-slate-500">{t.common.results(filtered.length)}</p>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={rows === null}
        empty={
          <EmptyState
            icon={<Database className="h-6 w-6" />}
            title={t.capacity.empty}
            hint={t.capacity.emptyHint}
          />
        }
        onRowClick={openEdit}
        getKey={(r) => r.id}
        initialSortKey="operator"
      />

      <p className="mt-3 text-right text-xs text-slate-500">
        {t.capacity.syncHint}
      </p>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={
          <span className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-neon-300" />
            {t.capacity.editTitle}
          </span>
        }
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t.common.cancel}
            </Button>
            <Button loading={savingEdit} onClick={() => void saveEdit()}>
              {t.common.save}
            </Button>
          </div>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5 text-xs text-slate-300">
              {editLabel}
            </p>
            <TextInput
              label={t.capacity.entitled}
              type="number"
              min={0}
              required
              value={editForm.entitlement}
              onChange={(e) => setEditForm({ ...editForm, entitlement: e.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                label={`${t.capacity.day1} — 10G`}
                type="number"
                min={0}
                value={editForm.day1_10g}
                onChange={(e) => setEditForm({ ...editForm, day1_10g: e.target.value })}
              />
              <TextInput
                label={`${t.capacity.day1} — 100G`}
                type="number"
                min={0}
                value={editForm.day1_100g}
                onChange={(e) => setEditForm({ ...editForm, day1_100g: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                label="FP pair"
                value={editForm.fp}
                onChange={(e) => setEditForm({ ...editForm, fp: e.target.value })}
                className="font-mono"
              />
              <TextInput
                label="DLS Number"
                type="number"
                min={0}
                placeholder="—"
                value={editForm.dls}
                onChange={(e) => setEditForm({ ...editForm, dls: e.target.value })}
              />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">{t.capacity.editHint}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
