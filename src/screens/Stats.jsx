import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchHeroes } from '../lib/opendota'
import { aggregate, heroStats, banStats, funFacts, fmt } from '../lib/stats'

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
const VIEWS = [['players', 'Players'], ['heroes', 'Heroes'], ['facts', 'Fun facts']]

export default function Stats({ players, perfs, matches, openProfile }) {
  const [view, setView] = useState('players')
  const [statKey, setStatKey] = useState('maxKills')
  const [heroSort, setHeroSort] = useState('games')
  const [heroes, setHeroes] = useState([])
  const [draftRooms, setDraftRooms] = useState([])

  useEffect(() => { fetchHeroes().then(setHeroes).catch(() => {}) }, [])
  useEffect(() => {
    supabase.from('draft_rooms').select('actions').eq('status', 'completed')
      .then(({ data }) => setDraftRooms(data || []))
  }, [])

  const stats = useMemo(() => aggregate(perfs), [perfs])
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
      <div className="seg" style={{ marginBottom: 16 }}>
        {VIEWS.map(([id, label]) => <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>{label}</button>)}
      </div>

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
                <div className="lb-name">{player.name}</div>
                <div className="lb-sub num">{s.games} games</div>
              </div>
              <div className="right"><div className="lb-wr num">{active.fmt(s[statKey])}</div></div>
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

          <h2 style={{ fontSize: 14, marginTop: 20 }}>Most banned</h2>
          {bans.length === 0 && <p className="mute small">No completed drafts yet — bans show up here once a draft room finishes.</p>}
          {bans.slice(0, 10).map((b, i) => (
            <div key={b.hero} className="match-row">
              <span className="mute num" style={{ width: 22 }}>{i + 1}</span>
              <div className="grow">{b.hero}</div>
              <span className="mute num">{b.count} ban{b.count === 1 ? '' : 's'}</span>
            </div>
          ))}
        </>
      )}

      {view === 'facts' && (
        <div className="stat-grid">
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
