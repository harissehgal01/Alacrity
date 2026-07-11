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
  const { data, error } = await supabase.from('draft_rooms').select('*')
    .eq('code', code.trim().toUpperCase()).maybeSingle()
  if (error) throw error
  return data
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
