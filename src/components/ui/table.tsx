import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from './primitives'

// ---------- DataTable ----------

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  empty?: ReactNode
  onRowClick?: (row: T) => void
  pageSize?: number
  initialSortKey?: string
  getKey?: (row: T) => string
}

type SortDir = 'asc' | 'desc'

export function DataTable<T>({
  columns,
  rows,
  loading = false,
  empty,
  onRowClick,
  pageSize = 8,
  initialSortKey,
  getKey,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortValue) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const va = col.sortValue!(a)
      const vb = col.sortValue!(b)
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va))
    })
    return copy
  }, [rows, sortKey, sortDir, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [page, totalPages])

  const paged = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize])

  const toggleSort = (key: string) => {
    const col = columns.find((c) => c.key === key)
    if (!col?.sortValue) return
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/8">
              {columns.map((col) => {
                const sortable = Boolean(col.sortValue)
                const active = sortKey === col.key
                return (
                  <th
                    key={col.key}
                    onClick={sortable ? () => toggleSort(col.key) : undefined}
                    className={cn(
                      'px-4 py-3 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-slate-400 uppercase select-none',
                      sortable && 'cursor-pointer transition-colors hover:text-neon-300',
                      active && 'text-neon-300',
                      col.headerClassName,
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {sortable ? (
                        active ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )
                      ) : null}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>{empty ?? null}</td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={getKey ? getKey(row) : i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'animate-fade-in border-b border-white/[0.04] transition-colors last:border-b-0',
                    onRowClick && 'cursor-pointer',
                    'hover:bg-neon-400/[0.04]',
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3 text-slate-300', col.className)}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && sorted.length > 0 ? (
        <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-2.5">
          <span className="text-xs text-slate-500">{sorted.length}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-14 text-center text-xs text-slate-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
