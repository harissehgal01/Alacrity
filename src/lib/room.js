import { supabase } from './supabase'

export function makeCode() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]
  return 'DOTA-' + s
}

export async function createRoom(userId) {
  const code = makeCode()
  const { data, error } = await supabase.from('draft_rooms').insert({
    code, created_by: userId, status: 'lobby',
  }).select().single()
  if (error) throw error
  return data
}

export async function findRoom(code) {
  const c = code.trim().toUpperCase()
  // Prefer a live room (lobby/drafting) with this code; fall back to the latest completed one.
  const { data: live, error: e1 } = await supabase.from('draft_rooms').select('*')
    .eq('code', c).neq('status', 'completed')
    .order('created_at', { ascending: false }).limit(1)
  if (e1) throw e1
  if (live && live.length) return live[0]
  const { data: past, error: e2 } = await supabase.from('draft_rooms').select('*')
    .eq('code', c).order('created_at', { ascending: false }).limit(1)
  if (e2) throw e2
  return past?.[0] || null
}

// seat is 'A' or 'B' — generic captain slots, claimed BEFORE the toss.
// Radiant/Dire is decided only after the toss (see Draft.jsx toss flow).
export async function claimSeat(room, seat, userId) {
  const col = seat === 'A' ? 'radiant_seat' : 'dire_seat'
  const { data, error } = await supabase.from('draft_rooms')
    .update({ [col]: userId }).eq('id', room.id).is(col, null).select().single()
  if (error) throw error
  return data
}
