import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { hasStorageConsent } from '../lib/cookieConsent'
import { en } from '../i18n/en'
import { es } from '../i18n/es'
import { pl } from '../i18n/pl'

export const LOCALES = [
  { id: 'pt-BR', label: 'Português' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
  { id: 'pl', label: 'Polski' },
]

const STORAGE_KEY = 'pxg-locale'
const DICTIONARIES = { en, es, pl }

function detectBrowserLocale() {
  const candidates = (typeof navigator !== 'undefined' && (navigator.languages?.length ? navigator.languages : [navigator.language])) || []
  for (const candidate of candidates) {
    const lower = String(candidate || '').toLowerCase()
    if (lower.startsWith('pt')) return 'pt-BR'
    if (lower.startsWith('en')) return 'en'
    if (lower.startsWith('es')) return 'es'
    if (lower.startsWith('pl')) return 'pl'
  }
  return 'pt-BR'
}

function getInitialLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (LOCALES.some((locale) => locale.id === stored)) return stored
  } catch { /* storage is optional */ }
  return detectBrowserLocale()
}

function interpolate(template, vars) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key) => (vars[key] != null ? String(vars[key]) : match))
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(getInitialLocale)

  const setLocale = useCallback((next) => {
    if (!LOCALES.some((entry) => entry.id === next)) return
    setLocaleState(next)
    if (hasStorageConsent()) {
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* storage is optional */ }
    }
  }, [])

  const dict = DICTIONARIES[locale] || null

  const t = useCallback((key, vars) => {
    const template = dict?.[key] ?? key
    return interpolate(template, vars)
  }, [dict])

  const value = useMemo(() => ({ locale, setLocale, t, locales: LOCALES }), [locale, setLocale, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage deve ser usado dentro de LanguageProvider.')
  return context
}
