import { useMemo, useState } from 'react'
import { aggregate, fmt } from '../lib/stats'

export default function PublicLeaderboard({ profiles, players, perfs, user, online = new Set() }) {
  const [sortBy, setSortBy] = useState('winrate')
  const stats = useMemo(() => aggregate(perfs), [perfs])

  const rows = useMemo(() => {
    const withStats = profiles
      .map(pr => {
        const key = pr.player_id || pr.id  // crew members key on player_id; self-loggers key on profile id
        const s = stats.get(key)
        const name = pr.player_id ? (players.find(p => p.id === pr.player_id)?.name || pr.display_name) : (pr.display_name || pr.email)
        return { profile: pr, s, name }
      })
      .filter(r => r.s && r.s.games > 0)
    withStats.sort((a, b) => {
      if (sortBy === 'winrate') return b.s.winRate - a.s.winRate || b.s.games - a.s.games
      if (sortBy === 'wins') return b.s.wins - a.s.wins
      if (sortBy === 'kda') return b.s.kda - a.s.kda
      if (sortBy === 'damage') return (b.s.avgHeroDamage || 0) - (a.s.avgHeroDamage || 0)
      return 0
    })
    return withStats
  }, [profiles, players, stats, sortBy])

  if (rows.length === 0) {
    return (
      <div className="card">
        <h2>Public leaderboard</h2>
        <p className="mute">No one has logged a personal match yet. Use "Log your own match" below to add your first game — it'll show up here, ranked against everyone else who's signed in.</p>
      </div>
    )
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="grow eyebrow">Everyone who's logged a game · ranked by</div>
        <select className="input" style={{ width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="winrate">Win rate</option>
          <option value="wins">Total wins</option>
          <option value="kda">KDA</option>
          <option value="damage">Avg hero damage</option>
        </select>
      </div>
      {rows.map(({ profile, s, name }, i) => (
        <div key={profile.id} className={`lb-row ${i === 0 ? 'first' : ''} ${profile.id === user.id ? 'seat-me' : ''}`}>
          <div className="lb-rank num">{i + 1}</div>
          <div className="grow">
            <div className="lb-name">{name}{online.has(profile.id) && <span className="online-dot" title="Online now" />}{profile.player_id && <span className="small mute" style={{ marginLeft: 6, fontWeight: 400 }}>· crew</span>}</div>
            <div className="lb-sub num">
              {s.wins}W – {s.losses}L · {s.games} games
              <span className="pips">{s.form.map((w, j) => <span key={j} className={`pip ${w ? 'w' : 'l'}`} />)}</span>
            </div>
          </div>
          <div className="right">
            <div className="lb-wr num">{fmt.pct(s.winRate)}</div>
            <div className="lb-sub num">{fmt.d1(s.avgKills)} avg kills</div>
          </div>
        </div>
      ))}
    </>
  )
}
