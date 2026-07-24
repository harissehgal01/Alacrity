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
    if (!rec) return { rate: 0.5, games: 0, wins: 0 }
    let w = 0, g = 0
    for (const pid of playerIds) {
      const pr = rec.byPlayer.get(pid)
      if (pr) { w += pr.wins; g += pr.games }
    }
    if (!g) return { rate: wilson(rec.wins, rec.games), games: rec.games, wins: rec.wins }
    return { rate: wilson(w, g), games: g, wins: w }
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

  // Two suggestions driven by the matchup and our own record, plus one that's
  // simply strong in the current meta — so there's always a safe option.
  const scored = availableIds.map(id => {
    const s = score(id, myPlayerIds)
    return { heroId: id, ...s }
  })

  const situational = scored
    .map(x => ({ ...x, situScore: 0.55 * x.counter + 0.45 * x.comfort.rate + (x.comfort.games >= 2 ? 0.05 : 0) }))
    .sort((a, b) => b.situScore - a.situScore)

  const reasonsFor = x => {
    const r = []
    if (x.comfort.games >= 1) r.push(`${x.comfort.wins}-${x.comfort.games - x.comfort.wins} in crew games`)
    if (x.counter > 0.52) r.push('strong vs their draft')
    if (!r.length && x.meta > 0.5) r.push(`${Math.round(x.meta * 100)}% meta`)
    return r
  }

  const picks = []
  for (const x of situational) {
    if (picks.length >= 2) break
    picks.push({ heroId: x.heroId, score: x.situScore, reasons: reasonsFor(x) })
  }
  const chosen = new Set(picks.map(p => p.heroId))
  const metaPick = scored
    .filter(x => !chosen.has(x.heroId))
    .sort((a, b) => b.meta - a.meta)[0]
  if (metaPick) picks.push({ heroId: metaPick.heroId, score: metaPick.meta, reasons: [`${Math.round(metaPick.meta * 100)}% meta pick`] })

  // Bans: two heroes this enemy is genuinely comfortable on, plus one that's
  // just strong right now.
  const banScored = availableIds.map(id => {
    const meta = metaOf(id)
    const enemyComfort = comfortFor(id, enemyPlayerIds)
    return { heroId: id, meta, enemyComfort }
  })
  const bans = []
  for (const x of banScored.filter(x => x.enemyComfort.games >= 1).sort((a, b) =>
    (b.enemyComfort.rate * Math.min(b.enemyComfort.games, 5)) - (a.enemyComfort.rate * Math.min(a.enemyComfort.games, 5)))) {
    if (bans.length >= 2) break
    bans.push({ heroId: x.heroId, score: x.enemyComfort.rate, reasons: [`they're ${x.enemyComfort.wins}-${x.enemyComfort.games - x.enemyComfort.wins} on it`] })
  }
  const banned = new Set(bans.map(b => b.heroId))
  const metaBan = banScored.filter(x => !banned.has(x.heroId)).sort((a, b) => b.meta - a.meta)[0]
  if (metaBan) bans.push({ heroId: metaBan.heroId, score: metaBan.meta, reasons: [`${Math.round(metaBan.meta * 100)}% meta`] })

  return { picks, bans }
}
