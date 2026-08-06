import { useEffect, useState } from 'react'
import { onDisconnect, onValue, push, ref, serverTimestamp, set } from 'firebase/database'
import { database } from '../lib/firebase'

export function useOnlineVisitors() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    let active = true
    const presenceRef = ref(database, 'presence')
    const myRef = push(presenceRef)
    const connectedRef = ref(database, '.info/connected')

    const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
      if (!active || snapshot.val() !== true) return
      onDisconnect(myRef).remove()
      set(myRef, serverTimestamp())
    })

    const unsubscribeCount = onValue(presenceRef, (snapshot) => {
      setCount(snapshot.size)
    })

    return () => {
      active = false
      unsubscribeConnected()
      unsubscribeCount()
      onDisconnect(myRef).cancel()
      set(myRef, null)
    }
  }, [])

  return count
}
