// Draft suggestions: blends public meta data (OpenDota) with how this crew
// actually performs on each hero.
//
// Dotabuff blocks automated access, so meta comes from OpenDota's public API:
//   /heroStats                 pick + win counts per skill bracket
//   /heroes/{id}/matchups      head-to-head record vs every other hero

const API = 'https://api.opendota.com/api'
const HIGH_BRACKETS = [6, 7, 8] // Ancient and above

let statsCache = null
const matchupCache = new Map()

// heroId → { winRate, picks }
export async function fetchMetaStats() {
  if (statsCache) return statsCache
  const res = await fetch(`${API}/heroStats`)
  if (!res.ok) throw new Error('heroStats failed')
  const rows = await res.json()
  statsCache = new Map(rows.map(h => {
    let picks = 0, wins = 0
    for (const b of HIGH_BRACKETS) { picks += h[`${b}_pick`] || 0; wins += h[`${b}_win`] || 0 }
    return [h.id, { winRate: picks ? wins / picks : 0.5, picks, name: h.localized_name }]
  }))
  return statsCache
}

// For hero E: Map(otherHeroId → E's win rate against them).
export async function fetchMatchups(heroId) {
  if (matchupCache.has(heroId)) return matchupCache.get(heroId)
  const res = await fetch(`${API}/heroes/${heroId}/matchups`)
  if (!res.ok) return new Map()
  const rows = await res.json()
  const m = new Map(rows
    .filter(r => r.games_played >= 50)
    .map(r => [r.hero_id, r.wins / r.games_played]))
  matchupCache.set(heroId, m)
  return m
}

// How this crew does on each hero: heroId → { games, wins, players:Set }
export function crewHeroRecord(perfs, heroIdByName) {
  const out = new Map()
  for (const p of perfs) {
    const id = heroIdByName.get(p.hero_name)
    if (!id) continue
    if (!out.has(id)) out.set(id, { games: 0, wins: 0, byPlayer: new Map() })
    const rec = out.get(id)
    rec.games += 1
    if (p.won) rec.wins += 1
    const pr = rec.byPlayer.get(p.player_id) || { games: 0, wins: 0 }
    pr.games += 1; if (p.won) pr.wins += 1
    rec.byPlayer.set(p.player_id, pr)
  }
  return out
}

const wilson = (w, n) => n ? (w + 1.5) / (n + 3) : 0.5 // small-sample-safe rate

/**
 * Rank the available heroes for the side that's on the clock.
 *
 *  meta      — public high-bracket win rate
 *  counter   — average advantage against the heroes the enemy already has
 *  comfort   — how this crew (and specifically these players) has performed
 *
 * Returns { picks: [...], bans: [...] }, each entry { heroId, score, reasons }.
 */
export function rankHeroes({
  availableIds, metaStats, enemyMatchups, crewRecord,
  myPlayerIds = [], enemyPlayerIds = [], limit = 6,
}) {
  const metaOf = id => metaStats?.get(id)?.winRate ?? 0.5

  // Average advantage vs the enemy's current heroes.
  // enemyMatchups: Map(enemyHeroId → Map(otherId → enemy's win rate vs other))
  const counterOf = id => {
    if (!enemyMatchups?.size) return 0.5
    let sum = 0, n = 0
    for (const [, m] of enemyMatchups) {
      const enemyWr = m.get(id)
      if (enemyWr == null) continue
      sum += 1 - enemyWr // our advantage is the inverse
      n += 1
    }
    return n ? sum / n : 0.5
  }

  const comfortFor = (id, playerIds) => {
    const rec = crewRecord?.get(id)
    if (!rec) return { rate: 0.5, games: 0 }
    let w = 0, g = 0
    for (const pid of playerIds) {
      const pr = rec.byPlayer.get(pid)
      if (pr) { w += pr.wins; g += pr.games }
    }
    if (!g) return { rate: wilson(rec.wins, rec.games), games: rec.games }
    return { rate: wilson(w, g), games: g }
  }

  const score = (id, playerIds) => {
    const meta = metaOf(id)
    const counter = counterOf(id)
    const c = comfortFor(id, playerIds)
    // Comfort matters more when we've actually got games on it.
    const cw = Math.min(0.35, 0.07 * c.games)
    const total = (0.35 - cw / 2) * meta + (0.35 - cw / 2) * counter + cw * c.rate + (1 - 0.7 - cw) * 0.5
    return { total, meta, counter, comfort: c }
  }

  const picks = availableIds.map(id => {
    const s = score(id, myPlayerIds)
    const reasons = []
    if (s.comfort.games >= 2) reasons.push(`${Math.round(s.comfort.rate * 100)}% in ${s.comfort.games} crew games`)
    if (s.counter > 0.53) reasons.push('good vs their draft')
    if (s.meta > 0.52) reasons.push(`${Math.round(s.meta * 100)}% meta`)
    return { heroId: id, score: s.total, reasons }
  }).sort((a, b) => b.score - a.score).slice(0, limit)

  // Bans: what hurts us most — heroes the enemy is comfortable on, and heroes
  // that are simply strong right now.
  const bans = availableIds.map(id => {
    const meta = metaOf(id)
    const enemyComfort = comfortFor(id, enemyPlayerIds)
    const threat = 0.45 * meta + 0.55 * (enemyComfort.games ? enemyComfort.rate : 0.5)
    const reasons = []
    if (enemyComfort.games >= 2) reasons.push(`they're ${Math.round(enemyComfort.rate * 100)}% in ${enemyComfort.games} games`)
    if (meta > 0.53) reasons.push(`${Math.round(meta * 100)}% meta`)
    return { heroId: id, score: threat, reasons }
  }).filter(b => b.reasons.length).sort((a, b) => b.score - a.score).slice(0, limit)

  return { picks, bans }
}
