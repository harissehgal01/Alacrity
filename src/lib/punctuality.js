// Summarise a player's punctuality into a reliability signal for the leaderboard.
export function puncSummary(rows) {
  if (!rows || rows.length === 0) return null
  const attended = rows.filter(r => !r.no_show && r.minutes_late != null)
  const noShows = rows.filter(r => r.no_show).length
  const onTime = attended.filter(r => r.minutes_late <= 0).length
  const total = attended.reduce((a, r) => a + Math.max(0, r.minutes_late), 0)
  const avg = attended.length ? total / attended.length : null
  const onTimeRate = rows.length ? onTime / rows.length : null
  // tier: green (reliable) / gold (sometimes late) / red (often late or absent)
  let tier = 'good'
  const noShowRate = rows.length ? noShows / rows.length : 0
  if (noShowRate >= 0.25 || (avg != null && avg > 20)) tier = 'bad'
  else if ((avg != null && avg > 7) || noShowRate > 0) tier = 'mid'
  return { sessions: rows.length, noShows, avg, onTimeRate, tier }
}

export const tierLabel = { good: 'Reliable', mid: 'Sometimes late', bad: 'Often late' }
