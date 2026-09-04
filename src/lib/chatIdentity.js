import { hasStorageConsent } from './cookieConsent'

const STORAGE_KEY = 'pxg-chat-name'

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
