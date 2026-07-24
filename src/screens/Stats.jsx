import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchHeroes } from '../lib/opendota'
import { aggregate, heroStats, banStats, funFacts, fmt, impactStats, filterBySeason, versusRecord, togetherRecord } from '../lib/stats'
import { GodAvatar } from '../lib/gods'

// Per-game record keys → the performance column that sets them.
const MAX_FIELD = {
  maxKills: 'kills', maxHeroDamage: 'hero_damage', maxTowerDamage: 'tower_damage',
  maxNetWorth: 'net_worth', maxAssists: 'assists', maxCampsStacked: 'camps_stacked', maxDewards: 'dewards',
}
const RECORD_FRESH_DAYS = 7

const CATEGORIES = [
  { group: 'Per-game records', options: [
    { key: 'maxKills', label: 'Most kills in a game', fmt: v => v },
    { key: 'maxHeroDamage', label: 'Highest hero damage in a game', fmt: fmt.n },
    { key: 'maxTowerDamage', label: 'Highest building damage in a game', fmt: fmt.n },
    { key: 'maxNetWorth', label: 'Highest net worth in a game', fmt: fmt.n },
    { key: 'maxAssists', label: 'Most assists in a game', fmt: v => v },
    { key: 'maxCampsStacked', label: 'Most camps stacked in a game', fmt: v => v },
    { key: 'maxDewards', label: 'Most dewards in a game', fmt: v => v },
  ]},
  { group: 'Averages', options: [
    { key: 'avgKills', label: 'Avg kills', fmt: fmt.d1 },
    { key: 'avgDeaths', label: 'Avg deaths', fmt: fmt.d1 },
    { key: 'avgAssists', label: 'Avg assists', fmt: fmt.d1 },
    { key: 'avgHeroDamage', label: 'Avg hero damage', fmt: fmt.n },
    { key: 'avgTowerDamage', label: 'Avg building damage', fmt: fmt.n },
    { key: 'avgGpm', label: 'Avg GPM', fmt: fmt.n },
    { key: 'avgXpm', label: 'Avg XPM', fmt: fmt.n },
    { key: 'avgLastHits', label: 'Avg last hits', fmt: fmt.n },
    { key: 'avgObs', label: 'Avg observer wards', fmt: fmt.d1 },
    { key: 'avgSen', label: 'Avg sentry wards', fmt: fmt.d1 },
    { key: 'avgCampsStacked', label: 'Avg camps stacked', fmt: fmt.d1 },
    { key: 'avgDewards', label: 'Avg dewards', fmt: fmt.d1 },
    { key: 'avgSupportGold', label: 'Avg support gold', fmt: fmt.n },
    { key: 'avgSmoke', label: 'Avg smoke of deceit', fmt: fmt.d1 },
  ]},
  { group: 'Overall', options: [
    { key: 'versatility', label: 'Versatility (distinct heroes)', fmt: v => v },
    { key: 'winRate', label: 'Win rate', fmt: fmt.pct },
    { key: 'wins', label: 'Total wins', fmt: v => v },
    { key: 'games', label: 'Games played', fmt: v => v },
  ]},
]
const ALL_OPTIONS = CATEGORIES.flatMap(g => g.options)
const VIEWS = [['players', 'Players'], ['heroes', 'Heroes'], ['rivalries', 'Rivalries'], ['facts', 'Fun facts']]

export default function Stats({ players, perfs: allPerfs, matches: allMatches, openProfile, isAdmin }) {
  const [view, setView] = useState('players')
  const [statKey, setStatKey] = useState('maxKills')
  const [heroSort, setHeroSort] = useState('games')
  const [heroes, setHeroes] = useState([])
  const [draftRooms, setDraftRooms] = useState([])
  const [seasons, setSeasons] = useState([])
  const [seasonId, setSeasonId] = useState('all')
  const [newSeason, setNewSeason] = useState(null)
  const [rivalA, setRivalA] = useState([])
  const [rivalB, setRivalB] = useState([])

  useEffect(() => { fetchHeroes().then(setHeroes).catch(() => {}) }, [])
  useEffect(() => {
    supabase.from('draft_rooms').select('actions').eq('status', 'completed')
      .then(({ data }) => setDraftRooms(data || []))
    supabase.from('seasons').select('*').order('starts_at')
      .then(({ data }) => setSeasons(data || []))
  }, [])

  const season = seasons.find(s => s.id === seasonId) || null
  const { matches, perfs } = useMemo(() => filterBySeason(allMatches, allPerfs, season), [allMatches, allPerfs, season])

  const stats = useMemo(() => aggregate(perfs), [perfs])

  // A record counts as fresh if the game that set it was in the last week.
  const freshRecord = (playerId, value) => {
    const field = MAX_FIELD[statKey]
    if (!field || value == null) return false
    const hit = perfs.find(p => p.player_id === playerId && (p[field] || 0) === value)
    if (!hit) return false
    const when = hit._played_at || matches.find(m => m.id === hit.match_id)?.played_at
    if (!when) return false
    return (Date.now() - new Date(when).getTime()) / 86400000 <= RECORD_FRESH_DAYS
  }

  async function createSeason() {
    if (!newSeason?.name || !newSeason.starts_at || !newSeason.ends_at) return
    const { data } = await supabase.from('seasons').insert(newSeason).select().single()
    if (data) { setSeasons(ss => [...ss, data]); setNewSeason(null); setSeasonId(data.id) }
  }
  const impact = useMemo(() => impactStats(perfs), [perfs])
  const active = ALL_OPTIONS.find(o => o.key === statKey)

  const rows = useMemo(() => {
    const list = players.map(p => ({ player: p, s: stats.get(p.id) })).filter(r => r.s && r.s.games > 0 && r.s[statKey] != null)
    list.sort((a, b) => b.s[statKey] - a.s[statKey])
    return list
  }, [players, stats, statKey])

  const hStats = useMemo(() => heroStats(perfs), [perfs])
  const heroRows = useMemo(() => {
    const list = [...hStats.byHero]
    list.sort((a, b) => (heroSort === 'games' ? b.games - a.games : b.winRate - a.winRate))
    return list
  }, [hStats, heroSort])
  const bans = useMemo(() => banStats(draftRooms, heroes), [draftRooms, heroes])
  const facts = useMemo(() => funFacts(matches, perfs, players), [matches, perfs, players])
  const signatures = useMemo(() => players.map(p => ({ player: p, sig: hStats.signatureHero.get(p.id) })).filter(r => r.sig), [players, hStats])
  const cursedHero = heroRows.length ? [...heroRows].sort((a, b) => a.winRate - b.winRate)[0] : null

  return (
    <div className="card">
      <h2>Stats</h2>
      <p className="small mute" style={{ marginTop: 0 }}>Every crew stat, ranked.</p>
      <div className="seg" style={{ marginBottom: 10 }}>
        {VIEWS.map(([id, label]) => <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>{label}</button>)}
      </div>
      <div className="row" style={{ marginBottom: 16, alignItems: 'center' }}>
        <div className="eyebrow grow">Season</div>
        <select className="input" style={{ width: 'auto' }} value={seasonId} onChange={e => setSeasonId(e.target.value)}>
          <option value="all">All time</option>
          {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {isAdmin && <button className="btn sm ghost" onClick={() => setNewSeason(newSeason ? null : { name: '', starts_at: '', ends_at: '' })}>{newSeason ? 'Cancel' : '+ Season'}</button>}
      </div>
      {isAdmin && newSeason && (
        <div className="card" style={{ background: 'var(--bg0)', marginBottom: 14 }}>
          <input className="input" style={{ marginBottom: 8 }} placeholder="Season name (e.g. Autumn '26)"
            value={newSeason.name} onChange={e => setNewSeason(n => ({ ...n, name: e.target.value }))} />
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <input className="input grow" type="date" value={newSeason.starts_at} onChange={e => setNewSeason(n => ({ ...n, starts_at: e.target.value }))} />
            <input className="input grow" type="date" value={newSeason.ends_at} onChange={e => setNewSeason(n => ({ ...n, ends_at: e.target.value }))} />
          </div>
          <button className="btn sm" onClick={createSeason} disabled={!newSeason.name || !newSeason.starts_at || !newSeason.ends_at}>Create season</button>
        </div>
      )}

      {view === 'players' && (
        <>
          <select className="input" style={{ marginBottom: 16 }} value={statKey} onChange={e => setStatKey(e.target.value)}>
            {CATEGORIES.map(g => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>
          {rows.length === 0 && <p className="mute small">No data yet for this category.</p>}
          {rows.map(({ player, s }, i) => (
            <button key={player.id} className={`lb-row ${i === 0 ? 'first' : ''}`} onClick={() => openProfile(player)}>
              <div className="lb-rank num">{i + 1}</div>
              <div className="grow">
                <div className="lb-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><GodAvatar player={player} size={18} />{player.name}</div>
                <div className="lb-sub num">{s.games} games</div>
              </div>
              <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i === 0 && freshRecord(player.id, s[statKey]) && <span className="tag" style={{ fontSize: 9, background: 'rgba(240,180,41,.16)', color: 'var(--gold)' }}>NEW</span>}
                <div className="lb-wr num">{active.fmt(s[statKey])}</div>
              </div>
            </button>
          ))}
        </>
      )}

      {view === 'heroes' && (
        <>
          <div className="row" style={{ marginBottom: 12 }}>
            <div className="grow eyebrow">Ranked by</div>
            <select className="input" style={{ width: 'auto' }} value={heroSort} onChange={e => setHeroSort(e.target.value)}>
              <option value="games">Most picked</option>
              <option value="winRate">Win rate</option>
            </select>
          </div>
          {heroRows.length === 0 && <p className="mute small">No heroes logged yet.</p>}
          {heroRows.map((h, i) => (
            <div key={h.hero} className={`lb-row ${i === 0 ? 'first' : ''}`}>
              <div className="lb-rank num">{i + 1}</div>
              <div className="grow">
                <div className="lb-name">{h.hero}</div>
                <div className="lb-sub num">{h.wins}W – {h.games - h.wins}L · {h.games} games</div>
              </div>
              <div className="right"><div className="lb-wr num">{fmt.pct(h.winRate)}</div></div>
            </div>
          ))}

          <div className="row" style={{ marginTop: 20, alignItems: 'baseline' }}>
            <h2 className="grow" style={{ fontSize: 14, marginBottom: 0 }}>Most banned</h2>
            {bans.drafts > 0 && <span className="mute small num">from {bans.drafts} finished draft{bans.drafts === 1 ? '' : 's'}</span>}
          </div>
          {bans.length === 0 && <p className="mute small">No finished drafts yet — bans appear once a draft room runs all the way through.</p>}
          {bans.slice(0, 10).map((b, i) => {
            const h = heroes.find(x => x.name === b.hero)
            return (
              <div key={b.hero} className="match-row">
                <span className="mute num" style={{ width: 22 }}>{i + 1}</span>
                {h && <img src={h.img} alt="" style={{ width: 34, height: 19, objectFit: 'cover', borderRadius: 3, marginRight: 6 }} />}
                <div className="grow">{b.hero}</div>
                <span className="mute num">{b.count} · {Math.round(b.pct * 100)}%</span>
              </div>
            )
          })}
        </>
      )}

      {view === 'rivalries' && (() => {
        const toggle = (list, setList, id) => setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id].slice(-2))
        const nameOfId = id => players.find(p => p.id === id)?.name || '?'
        const vs = rivalA.length && rivalB.length ? versusRecord(matches, perfs, rivalA, rivalB) : null
        const togA = rivalA.length >= 2 ? togetherRecord(matches, perfs, rivalA) : null
        const togB = rivalB.length >= 2 ? togetherRecord(matches, perfs, rivalB) : null
        const chip = (list, setList) => (
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {players.map(p => (
              <button key={p.id} className={`btn sm ${list.includes(p.id) ? '' : 'ghost'}`} onClick={() => toggle(list, setList, p.id)}>{p.name}</button>
            ))}
          </div>
        )
        return (
          <>
            <p className="small mute" style={{ marginTop: 0 }}>Pick 1–2 players per side. Records count only games where everyone selected actually played, sides fully split.</p>
            <div className="eyebrow" style={{ margin: '10px 0 6px' }}>Side A</div>
            {chip(rivalA, setRivalA)}
            <div className="eyebrow" style={{ margin: '14px 0 6px' }}>Side B</div>
            {chip(rivalB, setRivalB)}
            {vs && (
              <div className="card" style={{ background: 'var(--bg0)', marginTop: 16, textAlign: 'center' }}>
                <div className="eyebrow">{rivalA.map(nameOfId).join(' + ')} vs {rivalB.map(nameOfId).join(' + ')}</div>
                {vs.games === 0
                  ? <p className="mute small">No games with these exact sides yet.</p>
                  : <div className="num" style={{ fontSize: 28, fontWeight: 700, margin: '8px 0' }}>{vs.winsA} <span className="mute" style={{ fontSize: 16 }}>–</span> {vs.winsB}
                      <div className="small mute" style={{ fontWeight: 400 }}>{vs.games} games · {Math.round(100 * vs.winsA / vs.games)}% for side A</div>
                    </div>}
              </div>
            )}
            {togA && togA.games > 0 && <p className="small mute" style={{ marginTop: 10 }}>Together, {rivalA.map(nameOfId).join(' + ')}: {togA.wins}W–{togA.losses}L in {togA.games} games.</p>}
            {togB && togB.games > 0 && <p className="small mute">Together, {rivalB.map(nameOfId).join(' + ')}: {togB.wins}W–{togB.losses}L in {togB.games} games.</p>}
          </>
        )
      })()}

      {view === 'facts' && (
        <div className="stat-grid">
          {impact.mvpLeaders.length > 0 && (
            <div className="stat" style={{ gridColumn: '1 / -1' }}>
              <div className="k">MVP leaders <span className="formula">weighted score vs the other 9 in each game</span></div>
              <div className="who" style={{ marginTop: 6, lineHeight: 2 }}>
                {impact.mvpLeaders.slice(0, 6).map(r => {
                  const p = players.find(x => x.id === r.player_id)
                  return p ? <span key={r.player_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 14 }}><GodAvatar player={p} size={20} /> {p.name} 👑×{r.mvps}</span> : null
                })}
              </div>
            </div>
          )}
          {impact.mostImpactful.length > 0 && (
            <div className="stat" style={{ gridColumn: '1 / -1' }}>
              <div className="k">Most impactful overall <span className="formula">avg MVP-score, min 5 games</span></div>
              <div className="v num">{(() => { const t = impact.mostImpactful[0]; const p = players.find(x => x.id === t.player_id); return p ? `${p.name} · ${(t.avgImpact * 100).toFixed(0)} impact` : '—' })()}</div>
              <div className="who">{impact.mostImpactful.slice(1, 4).map(r => { const p = players.find(x => x.id === r.player_id); return p ? `${p.name} ${(r.avgImpact * 100).toFixed(0)}` : '' }).filter(Boolean).join(' · ')}</div>
            </div>
          )}
          <div className="stat"><div className="k">Total games</div><div className="v num">{facts.totalGames}</div></div>
          <div className="stat"><div className="k">Total hours tracked</div><div className="v num">{facts.gamesWithDuration ? fmt.d1(facts.totalHours) : '—'}</div></div>
          {facts.biggestBlowout && (
            <div className="stat" style={{ gridColumn: '1 / -1' }}>
              <div className="k">Most one-sided game</div>
              <div className="v num">{facts.biggestBlowout.winner} won {facts.biggestBlowout.radiant}–{facts.biggestBlowout.dire} on total kills</div>
              <div className="who">{new Date(facts.biggestBlowout.played_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
            </div>
          )}
          {facts.mostOneSided && (
            <div className="stat" style={{ gridColumn: '1 / -1' }}>
              <div className="k">Most one-sided performance <span className="formula">(K+A)/D, single player</span></div>
              <div className="v num">{fmt.d1(facts.mostOneSided.kda)}</div>
              <div className="who">{facts.mostOneSided.who} · {facts.mostOneSided.hero} · {facts.mostOneSided.kills}/{facts.mostOneSided.deaths}/{facts.mostOneSided.assists}</div>
            </div>
          )}
          <div className="stat"><div className="k">Longest game</div><div className="v num">{facts.longest ? fmt.dur(facts.longest.duration_seconds) : '—'}</div></div>
          <div className="stat"><div className="k">Shortest game</div><div className="v num">{facts.shortest ? fmt.dur(facts.shortest.duration_seconds) : '—'}</div></div>
          {cursedHero && (
            <div className="stat" style={{ gridColumn: '1 / -1' }}>
              <div className="k">Cursed hero</div>
              <div className="v num">{cursedHero.hero}</div>
              <div className="who">{fmt.pct(cursedHero.winRate)} win rate over {cursedHero.games} game{cursedHero.games === 1 ? '' : 's'}</div>
            </div>
          )}
          {signatures.length > 0 && (
            <div className="stat" style={{ gridColumn: '1 / -1' }}>
              <div className="k">Signature heroes</div>
              <div className="who" style={{ marginTop: 6, lineHeight: 1.8 }}>
                {signatures.map(({ player, sig }) => (
                  <span key={player.id} style={{ display: 'inline-block', marginRight: 14 }}>{player.name} → {sig.hero} ({sig.count}×)</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
