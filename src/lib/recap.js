// Season Recap computations — awards, duo synergy, single-game records and
// per-player "wrapped" cards. Built on top of the shared helpers in stats.js
// so numbers always match the rest of the app. Roast energy: high.
import { aggregate, heroStats, impactStats } from './stats'

// ── Sessions ──────────────────────────────────────────────────────────────
// A "session" is one continuous sitting. Because games run late into the early
// morning, counting calendar dates overcounts (one night splits across two
// dates). Instead we sort by time and start a new session only when the gap to
// the previous game exceeds `gapHours`. This is midnight-safe by construction.
export function sessionCount(matches, gapHours = 6) {
  const times = matches.map(m => new Date(m.played_at).getTime()).filter(t => !isNaN(t)).sort((a, b) => a - b)
  if (!times.length) return 0
  let sessions = 1
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] > gapHours * 3600000) sessions += 1
  }
  return sessions
}

// ── Season headline totals ────────────────────────────────────────────────
export function seasonTotals(matches) {
  const withDur = matches.filter(m => m.duration_seconds != null)
  const seconds = withDur.reduce((s, m) => s + m.duration_seconds, 0)
  const kills = matches.reduce((s, m) => s + (m.radiant_score || 0) + (m.dire_score || 0), 0)
  return {
    games: matches.length,
    kills,
    seconds,
    hours: seconds / 3600,
    avgSeconds: withDur.length ? seconds / withDur.length : 0,
    sessions: sessionCount(matches),
  }
}

// ── Single-game records (season highs) ─────────────────────────────────────
export function singleGameRecords(perfs) {
  const crew = perfs.filter(p => p.player_id)
  const pick = (fn) => crew.reduce((a, b) => (fn(b) > fn(a) ? b : a), crew[0])
  if (!crew.length) return null
  const kdaOf = p => (p.kills + p.assists) / Math.max(1, p.deaths)
  return {
    mostKills: pick(p => p.kills || 0),
    mostAssists: pick(p => p.assists || 0),
    richest: pick(p => p.net_worth || 0),
    mostDamage: pick(p => p.hero_damage || 0),
    bestKda: pick(kdaOf),
    feeder: pick(p => p.deaths || 0),
  }
}

// ── Duo synergy: scan every crew pair that has played together ─────────────
export function duoSynergy(matches, perfs, minGames = 6) {
  // match_id -> Map(player_id -> team), built once.
  const byMatch = new Map()
  for (const p of perfs) {
    if (!p.player_id) continue
    if (!byMatch.has(p.match_id)) byMatch.set(p.match_id, new Map())
    byMatch.get(p.match_id).set(p.player_id, p.team)
  }
  const radiantWin = new Map(matches.map(m => [m.id, m.radiant_win]))
  const pairs = new Map() // "a|b" -> { a, b, games, wins }
  for (const [mid, teams] of byMatch) {
    const rw = radiantWin.get(mid)
    if (rw == null) continue
    const ids = [...teams.keys()]
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i], b = ids[j]
        if (teams.get(a) !== teams.get(b)) continue // same team only
        const key = a < b ? `${a}|${b}` : `${b}|${a}`
        if (!pairs.has(key)) pairs.set(key, { a: key.split('|')[0], b: key.split('|')[1], games: 0, wins: 0 })
        const rec = pairs.get(key)
        rec.games += 1
        if ((teams.get(a) === 'radiant') === rw) rec.wins += 1
      }
    }
  }
  const rows = [...pairs.values()]
    .filter(r => r.games >= minGames)
    .map(r => ({ ...r, winRate: r.wins / r.games }))
  if (!rows.length) return { best: null, worst: null, mostPlayed: null }
  const byWr = [...rows].sort((x, y) => y.winRate - x.winRate || y.games - x.games)
  const byGames = [...rows].sort((x, y) => y.games - x.games)
  return { best: byWr[0], worst: byWr[byWr.length - 1], mostPlayed: byGames[0] }
}

// ── Awards ─────────────────────────────────────────────────────────────────
// Each award ranks candidates and picks the top one not already awarded, so
// winners are spread across the crew. Marquee awards run first.
export function seasonAwards(perfs, players) {
  const crewPerfs = perfs.filter(p => p.player_id)
  const agg = aggregate(crewPerfs)
  const { signatureHero } = heroStats(crewPerfs)
  const impact = impactStats(crewPerfs, 5)
  const nameOf = id => players.find(p => p.id === id)?.name || 'Someone'
  const impactById = new Map(impact.mostImpactful.map(r => [r.player_id, r]))
  const mvpCount = new Map(impact.mvpLeaders.map(r => [r.player_id, r.mvps]))

  // candidate list: array of { id, s } for crew players present in agg
  const list = [...agg.values()]
    .filter(s => players.some(p => p.id === s.key))
    .map(s => ({ id: s.key, s }))

  // True statistical winner for each award (repeats allowed — a sweep is a story).
  const take = (ranked) => ranked[0] || null
  const pct = v => `${Math.round(v * 100)}%`
  const n = v => Math.round(v).toLocaleString()

  const awards = []
  const push = (emoji, title, cand, statline, roast) => {
    if (!cand) return
    awards.push({ id: title, emoji, title, winnerId: cand.id, statline, roast })
  }

  // 1. Season MVP — highest average impact (min 5 games)
  {
    const ranked = list
      .filter(c => impactById.has(c.id))
      .sort((a, b) => impactById.get(b.id).avgImpact - impactById.get(a.id).avgImpact)
    const w = take(ranked)
    if (w) push('🏆', 'Season MVP', w,
      `${mvpCount.get(w.id) || 0} MVPs · ${w.s.games} games`,
      `Top dog by impact this season. Carried more weight than the crew's collective KDA. The rest of you are welcome.`)
  }
  // 2. The Wall — best win rate (min 15 games)
  {
    const ranked = list.filter(c => c.s.games >= 15).sort((a, b) => b.s.winRate - a.s.winRate)
    const w = take(ranked)
    if (w) push('🧱', 'The Wall', w,
      `${pct(w.s.winRate)} win rate · ${w.s.wins}-${w.s.losses}`,
      `Wins games he has no business winning. Farms like it's a criminal offence and still ends the night with the best record.`)
  }
  // 3. The Assassin — best KDA (min 15 games)
  {
    const ranked = list.filter(c => c.s.games >= 15).sort((a, b) => b.s.kda - a.s.kda)
    const w = take(ranked)
    if (w) push('🔪', 'The Assassin', w,
      `${w.s.kda.toFixed(2)} KDA · ${w.s.deaths} deaths all season`,
      `Dies less often than your internet drops mid-teamfight. Allergic to the fountain.`)
  }
  // 4. The Playmaker — most total assists
  {
    const ranked = [...list].sort((a, b) => b.s.assists - a.s.assists)
    const w = take(ranked)
    if (w) push('🎩', 'The Playmaker', w,
      `${n(w.s.assists)} assists · ${w.s.avgAssists.toFixed(1)}/game`,
      `Padded everyone else's killstreaks all season. The kills say teammates, the assists say who actually set them up.`)
  }
  // 5. Iron Man — most games played
  {
    const ranked = [...list].sort((a, b) => b.s.games - a.s.games || b.s.winRate - a.s.winRate)
    const w = take(ranked)
    if (w) push('🐴', 'The Iron Man', w,
      `${w.s.games} games · never missed a night`,
      `Showed up to everything. Sleep is a myth, touching grass is a rumour. A machine that queues.`)
  }
  // 6. The Farmer — highest avg GPM (min 15 games)
  {
    const ranked = list.filter(c => c.s.games >= 15 && c.s.avgGpm != null).sort((a, b) => b.s.avgGpm - a.s.avgGpm)
    const w = take(ranked)
    if (w) push('💰', 'The Farmer', w,
      `${n(w.s.avgGpm)} GPM avg`,
      `Talks to lane creeps more than teammates. Will AFK jungle through a Roshan fight and call it "efficiency".`)
  }
  // 7. Hard Luck Hero — big fragger, losing record (min 15 games, sub .500)
  {
    const ranked = list.filter(c => c.s.games >= 15 && c.s.winRate < 0.5).sort((a, b) => b.s.kills - a.s.kills)
    const w = take(ranked)
    if (w) push('💔', 'Hard Luck Hero', w,
      `${n(w.s.kills)} kills · only ${pct(w.s.winRate)} wins`,
      `Leads the fragging and still can't crack .500. Elite mechanics, cursed matchmaking, the tragic hero we don't deserve.`)
  }
  // 8. The One-Trick — smallest hero pool for the games played (min 20 games)
  {
    const ranked = list.filter(c => c.s.games >= 20).sort((a, b) => a.s.versatility - b.s.versatility || b.s.games - a.s.games)
    const w = take(ranked)
    if (w) push('🎯', 'The One-Trick', w,
      `${w.s.games} games on just ${w.s.versatility} heroes`,
      `A man who knows what he likes and flatly refuses to grow. Ban his comfort pick and watch the soul leave his body.`)
  }
  // 9. Mr. 50/50 — win rate closest to exactly .500 (min 15 games)
  {
    const ranked = list.filter(c => c.s.games >= 15).sort((a, b) => Math.abs(a.s.winRate - 0.5) - Math.abs(b.s.winRate - 0.5))
    const w = take(ranked)
    if (w) push('⚖️', 'Mr. 50/50', w,
      `${pct(w.s.winRate)} win rate · ${w.s.wins}-${w.s.losses}`,
      `Perfectly balanced, as all things should be. Wins exactly as often as he loses. A human coin flip.`)
  }

  return { awards, agg, signatureHero }
}

// ── Per-player cards ────────────────────────────────────────────────────────
export function playerCards(perfs, players, awards, agg, signatureHero, minGames = 3) {
  const awardByPlayer = new Map()
  for (const a of awards) if (!awardByPlayer.has(a.winnerId)) awardByPlayer.set(a.winnerId, a)

  // Title falls back to the player's actual roster role, not a stat guess —
  // in this crew even hard carries rack big assists in teamfights.
  const roleTitle = { 1: 'The Carry', 2: 'The Midlaner', 3: 'The Offlaner', 4: 'The Support', 5: 'The Hard Support' }
  const titleFor = (p, s) => {
    if (p.role_pos && roleTitle[p.role_pos]) return roleTitle[p.role_pos]
    if (s.avgGpm != null && s.avgGpm >= 500) return 'The Carry'
    if (s.avgAssists > s.avgKills * 1.5) return 'The Support'
    return 'The Role Player'
  }

  const cards = []
  for (const p of players) {
    const s = agg.get(p.id)
    if (!s || s.games < minGames) continue
    const sig = signatureHero.get(p.id)
    const award = awardByPlayer.get(p.id)
    cards.push({
      player: p,
      s,
      signature: sig ? sig.hero : null,
      signatureGames: sig ? sig.count : 0,
      title: award ? award.title : titleFor(p, s),
      titleEmoji: award ? award.emoji : '🎮',
      isAward: !!award,
      bestGame: s.maxKills ? { kills: s.maxKills, hero: s.maxKillsHero } : null,
    })
  }
  // Award winners first, then by games played.
  return cards.sort((a, b) => (b.isAward - a.isAward) || (b.s.games - a.s.games))
}
