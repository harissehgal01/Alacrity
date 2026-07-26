// Summarise a player's punctuality into a reliability signal for the leaderboard.
// Anyone within ON_TIME_GRACE minutes of start is counted as on time.
export const ON_TIME_GRACE = 10

export function puncSummary(rows) {
  if (!rows || rows.length === 0) return null
  const attended = rows.filter(r => !r.no_show && r.minutes_late != null)
  const noShows = rows.filter(r => r.no_show).length
  const onTime = attended.filter(r => r.minutes_late <= ON_TIME_GRACE).length
  const total = attended.reduce((a, r) => a + Math.max(0, r.minutes_late), 0)
  const avg = attended.length ? total / attended.length : null
  const onTimeRate = rows.length ? onTime / rows.length : null
  // tier: green (reliable) / gold (sometimes late) / red (often late or absent)
  let tier = 'good'
  const noShowRate = rows.length ? noShows / rows.length : 0
  if (noShowRate >= 0.25 || (avg != null && avg > 20)) tier = 'bad'
  else if ((avg != null && avg > ON_TIME_GRACE) || noShowRate > 0) tier = 'mid'
  return { sessions: rows.length, noShows, avg, onTimeRate, tier }
}

export const tierLabel = { good: 'Reliable', mid: 'Sometimes late', bad: 'Often late' }
export const tierColor = { good: 'var(--radiant)', mid: 'var(--gold)', bad: 'var(--dire)' }

// Map of player_id -> puncSummary, for surfacing punctuality across the app.
export function puncByPlayer(rows) {
  const by = new Map()
  for (const r of rows || []) {
    if (!r.player_id) continue
    if (!by.has(r.player_id)) by.set(r.player_id, [])
    by.get(r.player_id).push(r)
  }
  const out = new Map()
  for (const [id, rs] of by) out.set(id, puncSummary(rs))
  return out
}

// Restrict punctuality rows to a season window (by session_date).
export function puncInSeason(rows, season) {
  if (!season) return rows || []
  const s = new Date(season.starts_at).getTime(), e = new Date(season.ends_at).getTime()
  return (rows || []).filter(r => {
    const t = new Date(r.session_date).getTime()
    return !isNaN(t) && t >= s && t <= e
  })
}
