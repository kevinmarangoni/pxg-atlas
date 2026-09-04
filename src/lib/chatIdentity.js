import { hasStorageConsent } from './cookieConsent'

const STORAGE_KEY = 'pxg-chat-name'
const LAST_SENT_KEY = 'pxg-chat-last-sent'

function randomGuestName() {
  return `Treinador${Math.floor(1000 + Math.random() * 9000)}`
}

export function getChatName() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return stored
  } catch { /* storage is optional */ }
  return randomGuestName()
}

export function setChatName(name) {
  if (!hasStorageConsent()) return
  try { localStorage.setItem(STORAGE_KEY, name) } catch { /* storage is optional */ }
}

// Persisted (when consent allows) so the send cooldown survives a page
// reload — otherwise refreshing the page would trivially bypass it.
export function getLastSentAt() {
  try {
    const stored = Number(localStorage.getItem(LAST_SENT_KEY))
    return Number.isFinite(stored) ? stored : 0
  } catch {
    return 0
  }
}

export function setLastSentAt(timestamp) {
  if (!hasStorageConsent()) return
  try { localStorage.setItem(LAST_SENT_KEY, String(timestamp)) } catch { /* storage is optional */ }
}
