import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Live presence: everyone with the app open joins one shared channel.
// Returns a Set of online user ids (profile ids).
export function usePresence(user) {
  const [online, setOnline] = useState(new Set())

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('online-users', { config: { presence: { key: user.id } } })
    ch.on('presence', { event: 'sync' }, () => {
      setOnline(new Set(Object.keys(ch.presenceState())))
    })
    ch.subscribe(status => {
      if (status === 'SUBSCRIBED') ch.track({ at: Date.now() })
    })
    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  return online
}
