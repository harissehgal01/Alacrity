import { useMemo } from 'react'
import { aggregate, fmt } from '../lib/stats'

export default function Profile({ player, perfs, matches, punc = [], onClose }) {
  const s = useMemo(() => aggregate(perfs.filter(p => p.player_id === player.id)).get(player.id), [perfs, player.id])
  const myPunc = useMemo(() => punc.filter(r => r.player_id === player.id), [punc, player.id])

  const puncStats = useMemo(() => {
    const attended = myPunc.filter(r => !r.no_show && r.minutes_late != null)
    const noShows = myPunc.filter(r => r.no_show).length
    const total = attended.reduce((a, r) => a + r.minutes_late, 0)
    return {
      sessions: myPunc.length,
      noShows,
      totalLate: total,
      avgLate: attended.length ? total / attended.length : null,
      onTimeRate: myPunc.length ? attended.filter(r => r.minutes_late <= 0).length / punc.length : null,
    }
  }, [myPunc])

  const recentMatches = useMemo(() => {
    const mine = perfs.filter(p => p.player_id === player.id)
    return mine
      .map(p => ({ ...p, match: matches.find(m => m.id === p.match_id) }))
      .filter(p => p.match)
      .sort((a, b) => new Date(b.match.played_at) - new Date(a.match.played_at))
      .slice(0, 8)
  }, [perfs, matches, player.id])

  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <h2 className="grow" style={{ fontSize: 19, marginBottom: 0 }}>{player.name}</h2>
        <button className="btn sm ghost" onClick={onClose}>Close</button>
      </div>

      {!s && <p className="mute">No games logged yet for {player.name}.</p>}

      {s && (
        <>
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div className="stat"><div className="k">Win rate</div><div className="v num" style={{ color: 'var(--gold)' }}>{fmt.pct(s.winRate)}</div></div>
            <div className="stat"><div className="k">Record</div><div className="v num">{s.wins}–{s.losses}</div></div>
            <div className="stat"><div className="k">KDA <span className="formula">(K+A)/D</span></div><div className="v num">{fmt.d1(s.kda)}</div></div>
            <div className="stat"><div className="k">Avg kills</div><div className="v num">{fmt.d1(s.avgKills)}</div></div>
            <div className="stat"><div className="k">Avg deaths</div><div className="v num">{fmt.d1(s.avgDeaths)}</div></div>
            <div className="stat"><div className="k">Avg assists</div><div className="v num">{fmt.d1(s.avgAssists)}</div></div>
            <div className="stat"><div className="k">Avg hero dmg</div><div className="v num">{fmt.n(s.avgHeroDamage)}</div></div>
            <div className="stat"><div className="k">Max hero dmg</div><div className="v num">{fmt.n(s.maxHeroDamage)}</div></div>
            <div className="stat"><div className="k">Avg GPM</div><div className="v num">{fmt.n(s.avgGpm)}</div></div>
            <div className="stat"><div className="k">Avg XPM</div><div className="v num">{fmt.n(s.avgXpm)}</div></div>
            <div className="stat"><div className="k">Avg last hits</div><div className="v num">{fmt.n(s.avgLastHits)}</div></div>
            <div className="stat"><div className="k">Avg tower dmg</div><div className="v num">{fmt.n(s.avgTowerDamage)}</div></div>
            <div className="stat"><div className="k">Avg obs wards</div><div className="v num">{fmt.d1(s.avgObs)}</div></div>
            <div className="stat"><div className="k">Avg sentry wards</div><div className="v num">{fmt.d1(s.avgSen)}</div></div>
            <div className="stat"><div className="k">Avg gold spent</div><div className="v num">{fmt.n(s.avgGoldSpent)}</div></div>
          </div>

          <h2 style={{ fontSize: 14 }}>Recent games</h2>
          {recentMatches.map(p => (
            <div key={p.id} className="match-row small">
              <span className={`tag ${p.won ? 'rad' : 'dire'}`}>{p.won ? 'W' : 'L'}</span>
              <div className="grow">
                {p.hero_name || 'Unknown hero'} <span className="mute num">· {p.kills}/{p.deaths}/{p.assists} · {fmt.n(p.hero_damage)} dmg</span>
              </div>
              <span className="mute num">{new Date(p.match.played_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
        </>
      )}

      <h2 style={{ fontSize: 14, marginTop: 18 }}>Punctuality</h2>
      <p className="small mute" style={{ marginTop: 2 }}>Attendance only — never affects the leaderboard.</p>
      {myPunc.length === 0 && <p className="mute small">No sessions recorded.</p>}
      {myPunc.length > 0 && (
        <div className="stat-grid">
          <div className="stat"><div className="k">On-time rate</div><div className="v num">{puncStats.onTimeRate == null ? '—' : fmt.pct(puncStats.onTimeRate)}</div></div>
          <div className="stat"><div className="k">Avg minutes late</div><div className="v num">{puncStats.avgLate == null ? '—' : fmt.d1(puncStats.avgLate)}</div></div>
          <div className="stat"><div className="k">Total minutes late</div><div className="v num">{puncStats.totalLate}</div></div>
          <div className="stat"><div className="k">No-shows</div><div className="v num">{puncStats.noShows}</div></div>
        </div>
      )}
    </>
  )
}
