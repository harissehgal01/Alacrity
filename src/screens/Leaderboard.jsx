import { useMemo, useState } from 'react'
import { aggregate, fmt } from '../lib/stats'
import { puncSummary, tierLabel } from '../lib/punctuality'

export default function Leaderboard({ players, perfs, punc, openProfile }) {
  const [sortBy, setSortBy] = useState('winrate')
  const stats = useMemo(() => aggregate(perfs), [perfs])
  const puncByPlayer = useMemo(() => {
    const m = new Map()
    for (const p of players) m.set(p.id, puncSummary(punc.filter(r => r.player_id === p.id)))
    return m
  }, [players, punc])

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
    let mostKills = null, topAvgDmg = null, bestKda = null, topGpm = null
    for (const [id, s] of stats) {
      if (!mostKills || s.maxKills > mostKills.v) mostKills = { v: s.maxKills, who: named(id) }
      if (s.avgHeroDamage != null && (!topAvgDmg || s.avgHeroDamage > topAvgDmg.v)) topAvgDmg = { v: s.avgHeroDamage, who: named(id) }
      if (!bestKda || s.kda > bestKda.v) bestKda = { v: s.kda, who: named(id) }
      if (s.avgGpm != null && (!topGpm || s.avgGpm > topGpm.v)) topGpm = { v: s.avgGpm, who: named(id) }
    }
    return { mostKills, topAvgDmg, bestKda, topGpm }
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
        {leaders.mostKills && <div className="leader"><div className="k">Most kills · game</div><div className="v num">{leaders.mostKills.v}</div><div className="who">{leaders.mostKills.who}</div></div>}
        {leaders.topAvgDmg && <div className="leader"><div className="k">Avg hero damage</div><div className="v num">{fmt.n(leaders.topAvgDmg.v)}</div><div className="who">{leaders.topAvgDmg.who}</div></div>}
        {leaders.bestKda && <div className="leader"><div className="k">Best KDA</div><div className="v num">{fmt.d1(leaders.bestKda.v)}</div><div className="who">{leaders.bestKda.who}</div></div>}
        {leaders.topGpm && <div className="leader"><div className="k">Avg GPM</div><div className="v num">{fmt.n(leaders.topGpm.v)}</div><div className="who">{leaders.topGpm.who}</div></div>}
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
        const pz = puncByPlayer.get(player.id)
        return (
          <button key={player.id} className={`lb-row ${i === 0 ? 'first' : ''}`} onClick={() => openProfile(player)}>
            <div className="lb-rank num">{i + 1}</div>
            <div className="grow">
              <div className="lb-name">
                {player.name}
                {pz && <span className={`punc-dot ${pz.tier}`} title={`${tierLabel[pz.tier]}${pz.avg != null ? ` · avg ${Math.round(pz.avg)}m late` : ''}`} />}
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
      <p className="mute" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 12 }}>
        <span className="punc-dot good" /> reliable &nbsp; <span className="punc-dot mid" /> sometimes late &nbsp; <span className="punc-dot bad" /> often late — attendance only, never affects ranking
      </p>
    </>
  )
}
