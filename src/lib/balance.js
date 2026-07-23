import { impactStats } from './stats'

// Position labels, 1–5.
export const ROLES = {
  1: { short: 'POS 1', name: 'Carry', group: 'core' },
  2: { short: 'POS 2', name: 'Mid', group: 'core' },
  3: { short: 'POS 3', name: 'Offlane', group: 'core' },
  4: { short: 'POS 4', name: 'Soft support', group: 'support' },
  5: { short: 'POS 5', name: 'Hard support', group: 'support' },
}
export const roleLabel = pos => ROLES[pos]?.name || null
export const roleShort = pos => ROLES[pos]?.short || null

// ── Role inference ──────────────────────────────────────────────────────
// An assigned role_pos always wins. Only players without one get guessed
// from how they play: supports buy wards and spend support gold, cores farm.
export function playerProfiles(perfs, players) {
  const by = new Map()
  for (const p of perfs) {
    if (!p.player_id) continue
    if (!by.has(p.player_id)) by.set(p.player_id, [])
    by.get(p.player_id).push(p)
  }
  const impact = impactStats(perfs, 1)
  const impactBy = new Map(impact.mostImpactful.map(r => [r.player_id, r]))

  const out = []
  for (const pl of players) {
    const assigned = pl.role_pos || null
    const rows = by.get(pl.id) || []
    if (!rows.length) {
      out.push({ ...pl, games: 0, role: assigned ? ROLES[assigned].group : 'flex', pos: assigned, rating: 50, unknown: true })
      continue
    }
    const n = rows.length
    const avg = f => rows.reduce((a, r) => a + (f(r) || 0), 0) / n
    const wards = avg(r => (r.obs_placed || 0) + (r.sen_placed || 0))
    const supGold = avg(r => r.support_gold_spent)
    const lh = avg(r => r.last_hits)
    const nw = avg(r => r.net_worth)
    const winRate = rows.filter(r => r.won).length / n
    const imp = impactBy.get(pl.id)?.avgImpact ?? null
    const guessed = (wards >= 8 || supGold >= 500) ? 'support'
      : (lh >= 250 || nw >= 22000) ? 'core' : 'flex'
    out.push({
      ...pl, games: n, wards, supGold, lh, nw, winRate, impact: imp,
      pos: assigned,
      role: assigned ? ROLES[assigned].group : guessed,
    })
  }
  return rateAll(out)
}

// Blend impact + win rate, then shrink toward the crew mean by sample size,
// so a 4-game player can't swing a split.
function rateAll(list) {
  const known = list.filter(p => p.games > 0 && p.impact != null)
  if (!known.length) return list.map(p => ({ ...p, rating: 50 }))
  const imps = known.map(p => p.impact)
  const lo = Math.min(...imps), hi = Math.max(...imps)
  const span = hi - lo || 1
  const raws = new Map(known.map(p => [p.id, 0.65 * ((p.impact - lo) / span) + 0.35 * p.winRate]))
  const mean = [...raws.values()].reduce((a, b) => a + b, 0) / raws.size
  return list.map(p => {
    const raw = raws.get(p.id)
    if (raw == null) return { ...p, rating: Math.round(mean * 100), unknown: true }
    const w = p.games / (p.games + 6) // shrinkage
    return { ...p, rating: Math.round((mean + (raw - mean) * w) * 100) }
  })
}

// ── Position assignment ─────────────────────────────────────────────────
// Give a five-player team an actual 1-2-3-4-5 lineup. Primary role is free,
// secondary costs a little, offlane-as-last-resort costs more, anything else
// is off the table. Brute-forces all orderings — instant at five players.
const COST_PRIMARY = 0, COST_SECONDARY = 2, COST_FALLBACK_OFF = 5, IMPOSSIBLE = 1e6

function slotCost(p, pos) {
  if (p.role_pos === pos) return COST_PRIMARY
  if (p.role_pos2 === pos) return COST_SECONDARY
  if (pos === 3 && p.can_offlane !== false) return COST_FALLBACK_OFF
  return IMPOSSIBLE
}

// → { cost, lineup: [{ pos, player }] } or null when no legal lineup exists.
export function assignPositions(team) {
  if (team.length !== 5) return null
  const positions = [1, 2, 3, 4, 5]
  let best = null
  const permute = (remaining, acc, cost) => {
    if (cost >= (best?.cost ?? Infinity)) return
    if (!remaining.length) { best = { cost, lineup: [...acc] }; return }
    const pos = positions[acc.length]
    for (const p of remaining) {
      const c = slotCost(p, pos)
      if (c >= IMPOSSIBLE) continue
      permute(remaining.filter(x => x !== p), [...acc, { pos, player: p }], cost + c)
    }
  }
  permute(team, [], 0)
  return best
}

// ── Split enumeration ───────────────────────────────────────────────────
// All ways to halve the pool, filtered for a sane role mix, sorted by how
// close the two sides are. Returns the most balanced options.
export function suggestSplits(pool, { count = 3, requireSupport = true, maxCores = 3, pinA = [], pinB = [] } = {}) {
  const pinIds = new Set([...pinA, ...pinB].map(p => p.id))
  const free = pool.filter(p => !pinIds.has(p.id))
  const n = free.length
  if (n % 2) return []
  const half = n / 2
  const results = []
  const seen = new Set()

  const combos = (start, chosen) => {
    if (chosen.length === half) {
      const a = [...pinA, ...chosen]
      const b = [...pinB, ...free.filter(p => !chosen.includes(p))]
      const key = [a.map(p => p.id).sort().join(','), b.map(p => p.id).sort().join(',')].join('|')
      if (seen.has(key)) return
      seen.add(key)
      const sup = t => t.filter(p => p.role === 'support').length
      const cor = t => t.filter(p => p.role === 'core').length
      // For full five-a-side, demand a legal 1-5 lineup on both teams.
      let fitA = null, fitB = null
      if (a.length === 5 && b.length === 5) {
        fitA = assignPositions(a); fitB = assignPositions(b)
        if (!fitA || !fitB) return
      } else {
        if (requireSupport && (sup(a) < 1 || sup(b) < 1)) return
        if (cor(a) > maxCores || cor(b) > maxCores) return
      }
      const ra = a.reduce((s, p) => s + p.rating, 0)
      const rb = b.reduce((s, p) => s + p.rating, 0)
      const roleCost = (fitA?.cost || 0) + (fitB?.cost || 0)
      results.push({ a, b, ratingA: ra, ratingB: rb, gap: Math.abs(ra - rb), fitA, fitB, roleCost })
      return
    }
    for (let i = start; i < n; i++) combos(i + 1, [...chosen, free[i]])
  }
  combos(0, [])

  // Closest rating gap wins; among equally balanced splits prefer the one
  // where more people are on their primary role.
  results.sort((x, y) => (x.gap - y.gap) || (x.roleCost - y.roleCost))
  const out = []
  let i = 0
  while (out.length < count && i < results.length) {
    const { gap, roleCost } = results[i]
    const tier = results.filter(r => r.gap === gap && r.roleCost === roleCost)
    for (let j = tier.length - 1; j > 0; j--) { const k = Math.floor(Math.random() * (j + 1)); [tier[j], tier[k]] = [tier[k], tier[j]] }
    for (const t of tier) { if (out.length < count) out.push(t) }
    i += tier.length
  }
  return out
}

// Projected win share for side A, from the rating gap.
export function winShare(split) {
  const total = split.ratingA + split.ratingB
  if (!total) return 0.5
  return split.ratingA / total
}
