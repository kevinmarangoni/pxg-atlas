import { hasStorageConsent } from './cookieConsent'

const STORAGE_KEY = 'pxg-theme'

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  if (!hasStorageConsent()) return
  try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* storage is optional */ }
}
