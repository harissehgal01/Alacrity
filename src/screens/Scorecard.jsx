import { useMemo } from 'react'
import { fmt, mvpByMatch } from '../lib/stats'

// The team + player rows for one match. This is the actual scorecard content —
// shared verbatim so Matches, Stats → Heroes, and a player's own Profile all
// render the identical view. Sorted by kills within each team, matching the
// original Profile match-log behavior.
export function MatchDetail({ match, rows, players, imgByHero = new Map(), mvpId, openProfile }) {
  const nameOf = row => {
    if (row.player_id) return players.find(p => p.id === row.player_id)?.name || 'Unknown'
    return 'Guest'
  }
  const sorted = useMemo(() => [...rows].sort((a, b) => b.kills - a.kills), [rows])
  const radiant = sorted.filter(r => r.team === 'radiant')
  const dire = sorted.filter(r => r.team === 'dire')

  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <span className={`tag ${match.radiant_win ? 'rad' : 'dire'}`}>{match.radiant_win ? 'Radiant' : 'Dire'} won</span>
        <span className="mute small">{new Date(match.played_at).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
        {match.duration_seconds != null && <span className="mute small num">· {fmt.dur(match.duration_seconds)}</span>}
        {match.dota_match_id && <span className="mute small num">· #{match.dota_match_id}</span>}
      </div>

      {[['Radiant', radiant], ['Dire', dire]].map(([label, side]) => (
        <div key={label} style={{ marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 6, color: label === 'Radiant' ? 'var(--radiant)' : 'var(--dire-hi)' }}>{label}</div>
          {side.map(r => {
            const p2 = players.find(p => p.id === r.player_id)
            const Row = openProfile && p2 ? 'button' : 'div'
            return (
              <Row
                key={r.id || `${r.match_id}-${r.player_id}`}
                className="match-log-detail-row"
                style={openProfile && p2 ? { width: '100%', textAlign: 'left', border: '1px solid var(--line)', cursor: 'pointer', font: 'inherit', color: 'inherit' } : undefined}
                onClick={openProfile && p2 ? () => openProfile(p2) : undefined}
              >
                {r.player_id === mvpId && <span title="MVP" style={{ marginRight: 4 }}>👑</span>}
                {imgByHero.get(r.hero_name) && <img src={imgByHero.get(r.hero_name)} alt="" style={{ width: 40, height: 22, objectFit: 'cover', borderRadius: 4, marginRight: 8, flexShrink: 0 }} />}
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{nameOf(r)}<span className="mute" style={{ fontWeight: 400 }}> · {r.hero_name || '—'}</span></div>
                  <div className="mute small num">
                    {r.kills}/{r.deaths}/{r.assists} · {fmt.n(r.net_worth)} net · {fmt.n(r.gpm)} GPM · {fmt.n(r.hero_damage)} dmg
                    {r.tower_damage != null && <> · {fmt.n(r.tower_damage)} tower</>}
                  </div>
                  {(r.obs_placed != null || r.sen_placed != null || r.support_gold_spent != null) && (
                    <div className="mute small num">
                      {r.obs_placed != null && <>{r.obs_placed} obs · </>}
                      {r.sen_placed != null && <>{r.sen_placed} sen · </>}
                      {r.dewards != null && <>{r.dewards} dewards · </>}
                      {r.support_gold_spent != null && <>{fmt.n(r.support_gold_spent)} support gold</>}
                    </div>
                  )}
                </div>
                {r.won && <span className="mute" style={{ color: 'var(--gold)' }}>W</span>}
              </Row>
            )
          })}
        </div>
      ))}
    </>
  )
}

// Modal wrapper around MatchDetail — used by Matches and Stats → Heroes, where
// the match opens as an overlay rather than inline inside a Profile panel.
export default function Scorecard({ matchId, matches, perfs, players, imgByHero = new Map(), onClose, openProfile }) {
  const match = matches.find(m => m.id === matchId)
  const rows = useMemo(() => perfs.filter(p => p.match_id === matchId), [perfs, matchId])
  const mvpId = useMemo(() => mvpByMatch(perfs).get(matchId)?.player_id, [perfs, matchId])

  if (!match) return null

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 10 }}>
          <span className="grow" />
          <button className="btn sm ghost" onClick={onClose}>Close</button>
        </div>
        <MatchDetail match={match} rows={rows} players={players} imgByHero={imgByHero} mvpId={mvpId} openProfile={openProfile} />
      </div>
    </div>
  )
}
