import { useMemo, useState } from 'react'
import { aggregate, fmt } from '../lib/stats'
export default function Leaderboard({ players, perfs, openProfile, online = new Set(), profiles = [] }) {
  const [sortBy, setSortBy] = useState('winrate')
  const stats = useMemo(() => aggregate(perfs), [perfs])
  const onlinePlayerIds = useMemo(() => {
    const s = new Set()
    for (const pr of profiles) if (pr.player_id && online.has(pr.id)) s.add(pr.player_id)
    return s
  }, [profiles, online])
  const rows = useMemo(() => {
    const withStats = players.map(p => ({ player: p, s: stats.get(p.id) })).filter(r => r.s && r.s.games > 0)
    withStats.sort((a, b) => {
      if (sortBy === 'winrate') return b.s.winRate - a.s.winRate || b.s.games - a.s.games
      if (sortBy === 'wins') return b.s.wins - a.s.wins
      if (sortBy === 'kda') return b.s.kda - a.s.kda
      if (sortBy === 'damage') return (b.s.avgHeroDamage || 0) - (a.s.avgHeroDamage || 0)
      return 0
    })
    return withStats
  }, [players, stats, sortBy])

  const leaders = useMemo(() => {
    const named = id => players.find(p => p.id === id)?.name || '—'
    let mostKills = null, topGameDmg = null, bestKda = null, topNetWorth = null, topBuilding = null, mostAssists = null
    for (const [id, s] of stats) {
      if (!mostKills || s.maxKills > mostKills.v) mostKills = { v: s.maxKills, who: named(id) }
      if (s.maxHeroDamage > 0 && (!topGameDmg || s.maxHeroDamage > topGameDmg.v)) topGameDmg = { v: s.maxHeroDamage, who: named(id) }
      if (!bestKda || s.kda > bestKda.v) bestKda = { v: s.kda, who: named(id) }
      if (s.maxNetWorth > 0 && (!topNetWorth || s.maxNetWorth > topNetWorth.v)) topNetWorth = { v: s.maxNetWorth, who: named(id) }
      if (s.maxTowerDamage > 0 && (!topBuilding || s.maxTowerDamage > topBuilding.v)) topBuilding = { v: s.maxTowerDamage, who: named(id) }
      if (s.maxAssists > 0 && (!mostAssists || s.maxAssists > mostAssists.v)) mostAssists = { v: s.maxAssists, who: named(id) }
    }
    return { mostKills, topGameDmg, bestKda, topNetWorth, topBuilding, mostAssists }
  }, [stats, players])

  if (rows.length === 0) {
    return (
      <div className="card">
        <h2>Leaderboard</h2>
        <p className="mute">No games logged yet. Add your roster in the Roster tab, then import your first match from the Matches tab with an OpenDota Match ID.</p>
      </div>
    )
  }

  return (
    <>
      <div className="leaders">
        {leaders.mostKills && <div className="leader"><div className="k">Most kills</div><div className="v num">{leaders.mostKills.v}</div><div className="who">{leaders.mostKills.who}</div></div>}
        {leaders.topGameDmg && <div className="leader"><div className="k">Highest damage</div><div className="v num">{fmt.n(leaders.topGameDmg.v)}</div><div className="who">{leaders.topGameDmg.who}</div></div>}
        {leaders.bestKda && <div className="leader"><div className="k">Best KDA <span className="formula">(K+A)/D</span></div><div className="v num">{fmt.d1(leaders.bestKda.v)}</div><div className="who">{leaders.bestKda.who}</div></div>}
        {leaders.topNetWorth && <div className="leader"><div className="k">Highest net worth</div><div className="v num">{fmt.n(leaders.topNetWorth.v)}</div><div className="who">{leaders.topNetWorth.who}</div></div>}
        {leaders.topBuilding && <div className="leader"><div className="k">Building dmg</div><div className="v num">{fmt.n(leaders.topBuilding.v)}</div><div className="who">{leaders.topBuilding.who}</div></div>}
        {leaders.mostAssists && <div className="leader"><div className="k">Most assists</div><div className="v num">{leaders.mostAssists.v}</div><div className="who">{leaders.mostAssists.who}</div></div>}
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <div className="grow eyebrow">Ranked by</div>
        <select className="input" style={{ width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="winrate">Win rate</option>
          <option value="wins">Total wins</option>
          <option value="kda">KDA</option>
          <option value="damage">Avg hero damage</option>
        </select>
      </div>

      {rows.map(({ player, s }, i) => {
        return (
          <button key={player.id} className={`lb-row ${i === 0 ? 'first' : ''}`} onClick={() => openProfile(player)}>
            <div className="lb-rank num">{i + 1}</div>
            <div className="grow">
              <div className="lb-name">
                {player.name}
                {onlinePlayerIds.has(player.id) && <span className="online-dot" title="Online now" />}
              </div>
              <div className="lb-sub num">
                {s.wins}W – {s.losses}L · {s.games} games
                {s.streak && s.streak.n >= 3 && <> · {s.streak.n}{s.streak.kind}</>}
                <span className="pips">{s.form.map((w, j) => <span key={j} className={`pip ${w ? 'w' : 'l'}`} />)}</span>
              </div>
            </div>
            <div className="right">
              <div className="lb-wr num">{fmt.pct(s.winRate)}</div>
              <div className="lb-sub num">{fmt.d1(s.avgKills)} avg kills</div>
            </div>
          </button>
        )
      })}

    </>
  )
}
