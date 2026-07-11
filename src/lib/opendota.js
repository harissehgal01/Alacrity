// OpenDota public API — no key required at this usage level.

let heroCache = null

export async function fetchHeroes() {
  if (heroCache) return heroCache
  const res = await fetch('https://api.opendota.com/api/heroStats')
  if (!res.ok) throw new Error('Could not load the hero pool from OpenDota.')
  const data = await res.json()
  heroCache = data
    .map(h => ({
      id: h.id,
      name: h.localized_name,
      attr: h.primary_attr, // str | agi | int | all
      roles: h.roles || [],
      img: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${h.name.replace('npc_dota_hero_', '')}.png`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return heroCache
}

export function heroById(heroes, id) {
  return heroes.find(h => h.id === id) || null
}

export async function fetchMatch(matchId) {
  const res = await fetch(`https://api.opendota.com/api/matches/${matchId}`)
  if (!res.ok) throw new Error('Match not found on OpenDota. Check the Match ID — and note brand-new matches can take a few minutes to appear.')
  const m = await res.json()
  if (!m.players || m.players.length === 0) {
    throw new Error('OpenDota returned this match without player data. Try again in a few minutes.')
  }
  return {
    dota_match_id: m.match_id,
    duration_seconds: m.duration,
    radiant_win: m.radiant_win,
    started_at: m.start_time ? new Date(m.start_time * 1000).toISOString() : new Date().toISOString(),
    players: m.players.map(p => ({
      slot: p.player_slot,
      is_radiant: p.player_slot < 128,
      persona: p.personaname || 'Anonymous',
      hero_id: p.hero_id,
      kills: p.kills ?? 0,
      deaths: p.deaths ?? 0,
      assists: p.assists ?? 0,
      gpm: p.gold_per_min ?? null,
      xpm: p.xp_per_min ?? null,
      hero_damage: p.hero_damage ?? null,
      tower_damage: p.tower_damage ?? null,
      last_hits: p.last_hits ?? null,
      net_worth: p.net_worth ?? p.total_gold ?? null,
    })),
  }
}
