import { useMemo, useState } from 'react'
import { aggregate, fmt } from '../lib/stats'

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

export default function Stats({ players, perfs, openProfile }) {
  const [statKey, setStatKey] = useState('maxKills')
  const stats = useMemo(() => aggregate(perfs), [perfs])
  const active = ALL_OPTIONS.find(o => o.key === statKey)

  const rows = useMemo(() => {
    const list = players
      .map(p => ({ player: p, s: stats.get(p.id) }))
      .filter(r => r.s && r.s.games > 0 && r.s[statKey] != null)
    list.sort((a, b) => b.s[statKey] - a.s[statKey])
    return list
  }, [players, stats, statKey])

  return (
    <div className="card">
      <h2>Stats</h2>
      <p className="small mute" style={{ marginTop: 0 }}>Every crew stat, ranked. Pick a category below.</p>
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
          <div className="right">
            <div className="lb-wr num">{active.fmt(s[statKey])}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
