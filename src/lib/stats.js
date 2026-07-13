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

export const fmt = {
  pct: v => `${Math.round(v * 100)}%`,
  n: v => v == null ? '—' : Math.round(v).toLocaleString(),
  d1: v => v == null ? '—' : (Math.round(v * 10) / 10).toFixed(1),
  dur: s => s == null ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
}
