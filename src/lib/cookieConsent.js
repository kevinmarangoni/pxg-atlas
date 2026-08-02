const CONSENT_KEY = 'pxg-cookie-consent'
const CONSENT_EVENT = 'pxg-cookie-consent-change'

// Every localStorage key written elsewhere in the app for preferences/progress
// (not counting the consent flag itself, which is strictly necessary to keep
// the banner from reappearing). Cleared when the user declines.
const MANAGED_KEYS = [
  'pxg-theme',
  'pxg-view-mode',
  'pxg-atlas:user-data:v2',
  'pxg-atlas:boost-prices:v1',
  'pxg-team-builder:v1',
  'pxg-atlas:collected-orbs',
  'pxg-atlas:unown-capture:v1',
]

function clearManagedStorage() {
  try {
    for (const key of MANAGED_KEYS) localStorage.removeItem(key)
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key?.startsWith('pxg-pokelog-progress:')) localStorage.removeItem(key)
    }
  } catch { /* storage is optional */ }
}

export function getCookieConsent() {
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    return value === 'accepted' || value === 'declined' ? value : null
  } catch {
    return null
  }
}

export function hasStorageConsent() {
  return getCookieConsent() === 'accepted'
}

export function setCookieConsent(decision) {
  try { localStorage.setItem(CONSENT_KEY, decision) } catch { /* storage is optional */ }
  if (decision === 'declined') clearManagedStorage()
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: decision }))
}

export function onCookieConsentChange(handler) {
  window.addEventListener(CONSENT_EVENT, handler)
  return () => window.removeEventListener(CONSENT_EVENT, handler)
}
