import { useMemo } from 'react'
import { fmt, mvpByMatch } from '../lib/stats'
import { GodAvatar } from '../lib/gods'

// Full scoreboard for one match: both teams, per-player K/D/A and core stats,
// MVP crown. Reused wherever a match can be clicked into (Match history,
// Stats → Heroes drill-down, Season Recap records).
export default function Scorecard({ matchId, matches, perfs, players, imgByHero = new Map(), onClose, openProfile }) {
  const match = matches.find(m => m.id === matchId)
  const rows = useMemo(() => perfs.filter(p => p.match_id === matchId), [perfs, matchId])
  const mvp = useMemo(() => mvpByMatch(perfs).get(matchId), [perfs, matchId])
  const named = id => players.find(p => p.id === id)?.name || '—'
  const playerOf = id => players.find(p => p.id === id)

  if (!match) return null
  const radiant = rows.filter(p => p.team === 'radiant')
  const dire = rows.filter(p => p.team === 'dire')

  const Team = ({ label, side, list }) => (
    <div style={{ marginBottom: 14 }}>
      <div className="row" style={{ alignItems: 'center', marginBottom: 6 }}>
        <span className={`tag ${side}`}>{label}</span>
        {match.radiant_score != null && (
          <span className="num mute" style={{ marginLeft: 8, fontSize: 12 }}>
            {side === 'rad' ? match.radiant_score : match.dire_score} kills
          </span>
        )}
        {((side === 'rad') === match.radiant_win) && <span className="tag" style={{ marginLeft: 'auto', color: 'var(--gold, #e8b93f)' }}>WIN</span>}
      </div>
      {list.map(p => {
        const p2 = playerOf(p.player_id)
        const isMvp = mvp && mvp.player_id === p.player_id
        return (
          <button
            key={p.player_id || p.hero_name}
            className="match-row"
            style={{ width: '100%', textAlign: 'left', background: isMvp ? 'color-mix(in srgb, var(--gold, #e8b93f) 10%, transparent)' : 'none', border: 'none', borderRadius: 8, cursor: p2 ? 'pointer' : 'default' }}
            onClick={() => p2 && openProfile && openProfile(p2)}
          >
            {imgByHero.get(p.hero_name)
              ? <img src={imgByHero.get(p.hero_name)} alt={p.hero_name} title={p.hero_name} style={{ width: 42, height: 24, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
              : <div style={{ width: 42, height: 24, borderRadius: 4, background: 'var(--glass)', flexShrink: 0 }} />}
            <div className="grow small">
              <div>{isMvp && '👑 '}{p2 ? named(p.player_id) : (p.guest_name || 'Guest')} <span className="mute">· {p.hero_name}</span></div>
              <div className="mute num" style={{ fontSize: 11 }}>{fmt.n(p.net_worth)} net · {fmt.n(p.gpm)} GPM</div>
            </div>
            <div className="right num" style={{ fontSize: 13 }}>{p.kills}/{p.deaths}/{p.assists}</div>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
          <div className="grow">
            <h2 style={{ marginBottom: 2 }}>{new Date(match.played_at).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
            <div className="mute small num">
              {new Date(match.played_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · {fmt.dur(match.duration_seconds)}
              {match.dota_match_id && <> · #{match.dota_match_id}</>}
            </div>
          </div>
          <button className="btn sm ghost" onClick={onClose}>Close</button>
        </div>
        {match.radiant_score != null && match.dire_score != null && (
          <div className="num" style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, margin: '10px 0 16px' }}>
            {match.radiant_score} <span className="mute" style={{ fontSize: 16, fontWeight: 500 }}>–</span> {match.dire_score}
          </div>
        )}
        <Team label="Radiant" side="rad" list={radiant} />
        <Team label="Dire" side="dire" list={dire} />
      </div>
    </div>
  )
}
