import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'

export interface ComboboxProps<T> {
  label?: ReactNode
  items: readonly T[]
  /** Human-readable label used for display AND for filtering while typing. */
  getItemLabel: (item: T) => string
  getItemKey: (item: T) => string
  /** Currently selected item's key ('' = nothing selected). */
  value: string
  onChange: (key: string) => void
  placeholder?: string
  maxSuggestions?: number
  /** Shown when the typed query matches nothing. */
  emptyLabel?: string
}

/**
 * Searchable combobox — type to filter the list, click or press Enter to pick.
 * Unlike a native <select>, users never scroll through a long dropdown: they
 * write what they are looking for (designation, ID, name…).
 */
export function Combobox<T>({
  label,
  items,
  getItemLabel,
  getItemKey,
  value,
  onChange,
  placeholder,
  maxSuggestions = 50,
  emptyLabel,
}: ComboboxProps<T>) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedLabel = useMemo(() => {
    const match = items.find((i) => getItemKey(i) === value)
    return match ? getItemLabel(match) : ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, value])

  /** While typing: filter. On focus: show the full list (sorted as provided). */
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? items.filter((i) => getItemLabel(i).toLowerCase().includes(q)) : items
    return list.slice(0, maxSuggestions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, maxSuggestions])

  // Close the dropdown when clicking outside of the component.
  useEffect(() => {
    const onDocMouseDown = (e: globalThis.MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const pick = (item: T) => {
    onChange(getItemKey(item))
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      return
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      setActive(0)
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const chosen = suggestions[active]
      if (chosen) pick(chosen)
    }
  }

  // The field shows the selected item's label, unless the user is typing.
  const text = open ? query : selectedLabel

  return (
    <div ref={wrapRef} className="relative">
      {label ? <p className="mb-1.5 block text-[13px] font-medium text-slate-300">{label}</p> : null}
      <input
        ref={inputRef}
        className="field cursor-text"
        type="text"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        onFocus={() => {
          setQuery('')
          setActive(0)
          setOpen(true)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <ul className="absolute z-50 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-white/10 bg-abyss-800/95 p-1 shadow-2xl backdrop-blur-2xl">
          {suggestions.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-slate-500">{emptyLabel ?? t.common.noResults}</li>
          ) : (
            suggestions.map((item, i) => (
              <li key={getItemKey(item)}>
                <button
                  type="button"
                  className={cn(
                    'w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    i === active ? 'bg-neon-400/10 text-white' : 'text-slate-300 hover:bg-white/5',
                  )}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()} // keep input focus until the pick happens
                  onClick={() => pick(item)}
                >
                  <span className="block truncate">{getItemLabel(item)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
