// Aggregate per-player stats from match_performances rows.
// key = player_id (crew) or profile_id (public self-logged), whichever is set.
export function aggregate(perfs) {
  const byKey = new Map()
  for (const p of perfs) {
    const key = p.player_id || p.profile_id
    if (!key) continue
    if (!byKey.has(key)) {
      byKey.set(key, {
        key, games: 0, wins: 0,
        kills: 0, deaths: 0, assists: 0,
        heroDamage: 0, heroDamageGames: 0,
        towerDamage: 0, towerDamageGames: 0,
        gpm: 0, gpmGames: 0,
        xpm: 0, xpmGames: 0,
        lastHits: 0, lastHitsGames: 0,
        maxKills: 0, maxHeroDamage: 0, maxTowerDamage: 0, maxNetWorth: 0, maxAssists: 0, maxCampsStacked: 0, maxDewards: 0,
        maxKillsHero: null, maxHeroDamageHero: null, maxTowerDamageHero: null, maxNetWorthHero: null, maxAssistsHero: null,
        heroesPlayed: new Set(),
        obs: 0, obsGames: 0, sen: 0, senGames: 0, camps: 0, campsGames: 0, goldSpent: 0, goldSpentGames: 0,
        dewards: 0, dewardsGames: 0, supportGold: 0, supportGoldGames: 0, smoke: 0, smokeGames: 0,
        recent: [],
      })
    }
    const s = byKey.get(key)
    s.games += 1
    if (p.won) s.wins += 1
    s.kills += p.kills || 0
    s.deaths += p.deaths || 0
    s.assists += p.assists || 0
    if (p.hero_damage != null) { s.heroDamage += p.hero_damage; s.heroDamageGames += 1 }
    if (p.tower_damage != null) { s.towerDamage += p.tower_damage; s.towerDamageGames += 1 }
    if (p.gpm != null) { s.gpm += p.gpm; s.gpmGames += 1 }
    if (p.xpm != null) { s.xpm += p.xpm; s.xpmGames += 1 }
    if (p.last_hits != null) { s.lastHits += p.last_hits; s.lastHitsGames += 1 }
    if ((p.kills || 0) >= s.maxKills) { s.maxKills = p.kills || 0; s.maxKillsHero = p.hero_name || s.maxKillsHero }
    if ((p.hero_damage || 0) >= s.maxHeroDamage) { s.maxHeroDamage = p.hero_damage || 0; s.maxHeroDamageHero = p.hero_name || s.maxHeroDamageHero }
    if (p.hero_name) s.heroesPlayed.add(p.hero_name)
    if ((p.tower_damage || 0) >= s.maxTowerDamage) { s.maxTowerDamage = p.tower_damage || 0; s.maxTowerDamageHero = p.hero_name || s.maxTowerDamageHero }
    if ((p.net_worth || 0) >= s.maxNetWorth) { s.maxNetWorth = p.net_worth || 0; s.maxNetWorthHero = p.hero_name || s.maxNetWorthHero }
    if ((p.assists || 0) >= s.maxAssists) { s.maxAssists = p.assists || 0; s.maxAssistsHero = p.hero_name || s.maxAssistsHero }
    if (p.obs_placed != null) { s.obs += p.obs_placed; s.obsGames += 1 }
    if (p.sen_placed != null) { s.sen += p.sen_placed; s.senGames += 1 }
    if (p.camps_stacked != null) { s.camps += p.camps_stacked; s.campsGames += 1; s.maxCampsStacked = Math.max(s.maxCampsStacked, p.camps_stacked) }
    if (p.gold_spent != null) { s.goldSpent += p.gold_spent; s.goldSpentGames += 1 }
    if (p.dewards != null) { s.dewards += p.dewards; s.dewardsGames += 1; s.maxDewards = Math.max(s.maxDewards, p.dewards) }
    if (p.support_gold_spent != null) { s.supportGold += p.support_gold_spent; s.supportGoldGames += 1 }
    if (p.smoke_purchased != null) { s.smoke += p.smoke_purchased; s.smokeGames += 1 }
    s.recent.push({ won: p.won, at: p._played_at })
  }
  for (const s of byKey.values()) {
    s.losses = s.games - s.wins
    s.winRate = s.games ? s.wins / s.games : 0
    s.avgKills = s.games ? s.kills / s.games : 0
    s.avgDeaths = s.games ? s.deaths / s.games : 0
    s.avgAssists = s.games ? s.assists / s.games : 0
    s.kda = s.deaths ? (s.kills + s.assists) / s.deaths : (s.kills + s.assists)
    s.avgHeroDamage = s.heroDamageGames ? s.heroDamage / s.heroDamageGames : null
    s.avgTowerDamage = s.towerDamageGames ? s.towerDamage / s.towerDamageGames : null
    s.avgGpm = s.gpmGames ? s.gpm / s.gpmGames : null
    s.avgXpm = s.xpmGames ? s.xpm / s.xpmGames : null
    s.avgLastHits = s.lastHitsGames ? s.lastHits / s.lastHitsGames : null
    s.avgObs = s.obsGames ? s.obs / s.obsGames : null
    s.avgSen = s.senGames ? s.sen / s.senGames : null
    s.avgCampsStacked = s.campsGames ? s.camps / s.campsGames : null
    s.avgGoldSpent = s.goldSpentGames ? s.goldSpent / s.goldSpentGames : null
    s.avgDewards = s.dewardsGames ? s.dewards / s.dewardsGames : null
    s.avgSupportGold = s.supportGoldGames ? s.supportGold / s.supportGoldGames : null
    s.avgSmoke = s.smokeGames ? s.smoke / s.smokeGames : null
    s.versatility = s.heroesPlayed.size
    s.recent.sort((a, b) => new Date(b.at) - new Date(a.at))
    s.form = s.recent.slice(0, 5).map(r => r.won)
    let streak = 0
    if (s.recent.length) {
      const kind = s.recent[0].won
      for (const r of s.recent) { if (r.won === kind) streak += 1; else break }
      s.streak = { kind: kind ? 'W' : 'L', n: streak }
    } else s.streak = null
  }
  return byKey
}

// Hero-level aggregation: pick counts, win rates, and each player's signature hero.
export function heroStats(perfs) {
  const byHero = new Map()
  const byPlayerHero = new Map() // player key -> Map(hero -> count)
  for (const p of perfs) {
    if (!p.hero_name) continue
    const key = p.player_id || p.profile_id
    if (!byHero.has(p.hero_name)) byHero.set(p.hero_name, { hero: p.hero_name, games: 0, wins: 0 })
    const h = byHero.get(p.hero_name)
    h.games += 1
    if (p.won) h.wins += 1
    if (key) {
      if (!byPlayerHero.has(key)) byPlayerHero.set(key, new Map())
      const m = byPlayerHero.get(key)
      m.set(p.hero_name, (m.get(p.hero_name) || 0) + 1)
    }
  }
  for (const h of byHero.values()) h.winRate = h.games ? h.wins / h.games : 0
  const signatureHero = new Map()
  for (const [key, m] of byPlayerHero) {
    let best = null
    for (const [hero, count] of m) if (!best || count > best.count) best = { hero, count }
    signatureHero.set(key, best)
  }
  return { byHero: [...byHero.values()], signatureHero }
}

// Ban counts from completed draft rooms.
export function banStats(draftRooms, heroes) {
  const byId = new Map(heroes.map(h => [h.id, h.name]))
  const counts = new Map()
  for (const room of draftRooms) {
    for (const a of room.actions || []) {
      if (a.type !== 'ban') continue
      const name = byId.get(a.hero_id) || `Hero #${a.hero_id}`
      counts.set(name, (counts.get(name) || 0) + 1)
    }
  }
  return [...counts.entries()].map(([hero, count]) => ({ hero, count })).sort((a, b) => b.count - a.count)
}

// Assorted crew-wide fun facts.
export function funFacts(matches, perfs, players) {
  const named = id => players.find(p => p.id === id)?.name || 'Unknown'
  const withDuration = matches.filter(m => m.duration_seconds != null)

  const teamKills = new Map() // match_id -> { radiant, dire }
  for (const p of perfs) {
    if (!teamKills.has(p.match_id)) teamKills.set(p.match_id, { radiant: 0, dire: 0 })
    teamKills.get(p.match_id)[p.team] += p.kills || 0
  }
  let biggestBlowout = null
  for (const m of matches) {
    const tk = teamKills.get(m.id)
    const r = m.radiant_score ?? tk?.radiant
    const d = m.dire_score ?? tk?.dire
    if (r == null || d == null) continue
    const margin = Math.abs(r - d)
    if (!biggestBlowout || margin > biggestBlowout.margin) {
      biggestBlowout = { margin, radiant: r, dire: d, winner: m.radiant_win ? 'Radiant' : 'Dire', played_at: m.played_at }
    }
  }

  let mostOneSided = null
  for (const p of perfs) {
    const kda = p.deaths > 0 ? (p.kills + p.assists) / p.deaths : (p.kills + p.assists)
    if (!mostOneSided || kda > mostOneSided.kda) {
      mostOneSided = { kda, who: named(p.player_id), hero: p.hero_name, kills: p.kills, deaths: p.deaths, assists: p.assists }
    }
  }

  const longest = withDuration.length ? withDuration.reduce((a, b) => (a.duration_seconds > b.duration_seconds ? a : b)) : null
  const shortest = withDuration.length ? withDuration.reduce((a, b) => (a.duration_seconds < b.duration_seconds ? a : b)) : null
  const totalSeconds = withDuration.reduce((sum, m) => sum + m.duration_seconds, 0)

  return {
    biggestBlowout, mostOneSided, longest, shortest,
    totalGames: matches.length,
    gamesWithDuration: withDuration.length,
    totalHours: totalSeconds / 3600,
  }
}


export const fmt = {
  pct: v => `${Math.round(v * 100)}%`,
  n: v => v == null ? '—' : Math.round(v).toLocaleString(),
  d1: v => v == null ? '—' : (Math.round(v * 10) / 10).toFixed(1),
  dur: s => s == null ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
}

// ── MVP engine ──────────────────────────────────────────────────────────
// Score each performance relative to the other 9 players in the same match.
// Weighted blend of normalized shares so cores and supports both can win:
// KDA 30%, hero damage 20%, net worth 15%, building damage 10%,
// assists 10%, support contribution (wards+dewards+stacks+support gold) 15%.
// Winners get a 1.15x multiplier.
function mvpScoreRows(rows) {
  const max = f => Math.max(1, ...rows.map(f))
  const mk = max(p => (p.kills + p.assists) / Math.max(1, p.deaths))
  const mhd = max(p => p.hero_damage || 0)
  const mnw = max(p => p.net_worth || 0)
  const mtd = max(p => p.tower_damage || 0)
  const ma = max(p => p.assists || 0)
  const sup = p => (p.obs_placed || 0) * 30 + (p.sen_placed || 0) * 20 + (p.dewards || 0) * 40 + (p.camps_stacked || 0) * 30 + (p.support_gold_spent || 0) / 10
  const msup = max(sup)
  return rows.map(p => {
    const kda = (p.kills + p.assists) / Math.max(1, p.deaths)
    let score =
      0.30 * (kda / mk) +
      0.20 * ((p.hero_damage || 0) / mhd) +
      0.15 * ((p.net_worth || 0) / mnw) +
      0.10 * ((p.tower_damage || 0) / mtd) +
      0.10 * ((p.assists || 0) / ma) +
      0.15 * (sup(p) / msup)
    if (p.won) score *= 1.15
    return { perf: p, score }
  })
}

// Map of match_id -> { player_id, hero_name, score } for the MVP of each match.
export function mvpByMatch(perfs) {
  const byMatch = new Map()
  for (const p of perfs) {
    if (!byMatch.has(p.match_id)) byMatch.set(p.match_id, [])
    byMatch.get(p.match_id).push(p)
  }
  const out = new Map()
  for (const [mid, rows] of byMatch) {
    if (rows.length < 4) continue
    const scored = mvpScoreRows(rows).sort((a, b) => b.score - a.score)
    const top = scored[0]
    out.set(mid, { player_id: top.perf.player_id, hero_name: top.perf.hero_name, score: top.score })
  }
  return out
}

// Most Impactful = highest average MVP-score across all games (min 5 games),
// plus MVP counts for everyone.
export function impactStats(perfs, minGames = 5) {
  const byMatch = new Map()
  for (const p of perfs) {
    if (!byMatch.has(p.match_id)) byMatch.set(p.match_id, [])
    byMatch.get(p.match_id).push(p)
  }
  const totals = new Map() // player_id -> { sum, games, mvps }
  for (const rows of byMatch.values()) {
    if (rows.length < 4) continue
    const scored = mvpScoreRows(rows)
    const top = scored.reduce((a, b) => (b.score > a.score ? b : a))
    for (const { perf, score } of scored) {
      if (!perf.player_id) continue
      if (!totals.has(perf.player_id)) totals.set(perf.player_id, { sum: 0, games: 0, mvps: 0 })
      const t = totals.get(perf.player_id)
      t.sum += score; t.games += 1
      if (perf === top.perf) t.mvps += 1
    }
  }
  const rows = [...totals.entries()].map(([player_id, t]) => ({
    player_id, games: t.games, mvps: t.mvps, avgImpact: t.sum / t.games,
  }))
  return {
    mvpLeaders: rows.filter(r => r.mvps > 0).sort((a, b) => b.mvps - a.mvps),
    mostImpactful: rows.filter(r => r.games >= minGames).sort((a, b) => b.avgImpact - a.avgImpact),
  }
}

// ── Seasons ─────────────────────────────────────────────────────────────
export function filterBySeason(matches, perfs, season) {
  if (!season) return { matches, perfs }
  const s = new Date(season.starts_at).getTime()
  const e = new Date(season.ends_at).getTime()
  const keep = new Set(matches.filter(m => {
    const t = new Date(m.played_at).getTime()
    return t >= s && t <= e
  }).map(m => m.id))
  return { matches: matches.filter(m => keep.has(m.id)), perfs: perfs.filter(p => keep.has(p.match_id)) }
}

// ── Rivalries: with/against records between players ─────────────────────
// sideA and sideB are arrays of player_ids. Returns games/wins when all of
// sideA were on one team and all of sideB on the other.
export function versusRecord(matches, perfs, sideA, sideB) {
  const byMatch = new Map()
  for (const p of perfs) {
    if (!p.player_id) continue
    if (!byMatch.has(p.match_id)) byMatch.set(p.match_id, [])
    byMatch.get(p.match_id).push(p)
  }
  let games = 0, winsA = 0
  for (const m of matches) {
    const rows = byMatch.get(m.id) || []
    const team = id => rows.find(r => r.player_id === id)?.team
    const teamsA = sideA.map(team), teamsB = sideB.map(team)
    if (teamsA.some(t => !t) || teamsB.some(t => !t)) continue
    const tA = teamsA[0]
    if (!teamsA.every(t => t === tA)) continue
    const tB = teamsB[0]
    if (!teamsB.every(t => t === tB) || tB === tA) continue
    games += 1
    const radiantWon = m.radiant_win
    if ((tA === 'radiant') === radiantWon) winsA += 1
  }
  return { games, winsA, winsB: games - winsA }
}

// Together record: all listed players on the same team.
export function togetherRecord(matches, perfs, ids) {
  const byMatch = new Map()
  for (const p of perfs) {
    if (!p.player_id) continue
    if (!byMatch.has(p.match_id)) byMatch.set(p.match_id, [])
    byMatch.get(p.match_id).push(p)
  }
  let games = 0, wins = 0
  for (const m of matches) {
    const rows = byMatch.get(m.id) || []
    const team = id => rows.find(r => r.player_id === id)?.team
    const teams = ids.map(team)
    if (teams.some(t => !t)) continue
    if (!teams.every(t => t === teams[0])) continue
    games += 1
    if ((teams[0] === 'radiant') === m.radiant_win) wins += 1
  }
  return { games, wins, losses: games - wins }
}
