import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { en } from './en'
import { fr } from './fr'
import type { Translations } from './en'

export type Lang = 'en' | 'fr'
export type { Translations }

const dictionaries: Record<Lang, Translations> = { en, fr }
const STORAGE_KEY = 'dare-lang'

export interface BilingualRow {
  label?: string | null
  label_en?: string | null
  label_fr?: string | null
}

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translations
  /** Picks the localized label of a database row (label_en / label_fr / label). */
  pick: (row: BilingualRow | null | undefined) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'fr') return 'fr'
    return 'en' // English is the default priority language
  })

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  const pick = (row: BilingualRow | null | undefined): string => {
    if (!row) return ''
    if (lang === 'fr') return row.label_fr || row.label_en || row.label || ''
    return row.label_en || row.label || row.label_fr || ''
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t: dictionaries[lang], pick }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
