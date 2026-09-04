import { useEffect, useState } from 'react'
import { limitToLast, onValue, push, query, ref, serverTimestamp } from 'firebase/database'
import { database } from '../lib/firebase'

const MAX_MESSAGES = 60
const MAX_NAME_LENGTH = 24
const MAX_TEXT_LENGTH = 240

export function useChatMessages() {
  const [messages, setMessages] = useState(null)

  useEffect(() => {
    const chatQuery = query(ref(database, 'chat'), limitToLast(MAX_MESSAGES))
    const unsubscribe = onValue(chatQuery, (snapshot) => {
      const list = []
      snapshot.forEach((child) => {
        list.push({ id: child.key, ...child.val() })
      })
      setMessages(list)
    })
    return unsubscribe
  }, [])

  const sendMessage = (name, text) => {
    const trimmedText = text.trim().slice(0, MAX_TEXT_LENGTH)
    if (!trimmedText) return
    const trimmedName = (name || '').trim().slice(0, MAX_NAME_LENGTH) || 'Treinador'
    push(ref(database, 'chat'), { name: trimmedName, text: trimmedText, timestamp: serverTimestamp() })
      .catch(() => { /* transient network/permission errors are not actionable here */ })
  }

  return { messages, sendMessage, maxTextLength: MAX_TEXT_LENGTH, maxNameLength: MAX_NAME_LENGTH }
}
