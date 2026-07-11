import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmt } from '../lib/stats'

export default function Matches({ matches, perfs, players, reload }) {
  const [filter, setFilter] = useState('')
  const byMatch = useMemo(() => {
    const m = new Map()
    for (const p of perfs) {
      if (!m.has(p.match_id)) m.set(p.match_id, [])
      m.get(p.match_id).push(p)
    }
    return m
  }, [perfs])

  const named = id => players.find(p => p.id === id)?.name || '?'

  const shown = useMemo(() => {
    if (!filter) return matches
    return matches.filter(m => (byMatch.get(m.id) || []).some(p => p.player_id === filter))
  }, [matches, filter, byMatch])

  async function remove(match) {
    if (!confirm(`Delete match ${match.dota_match_id || ''}? This removes its stats from the leaderboard.`)) return
    await supabase.from('matches').delete().eq('id', match.id)
    reload()
  }

  if (matches.length === 0) return null

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 8 }}>
        <h2 className="grow" style={{ marginBottom: 0 }}>Match history</h2>
        <select className="input" style={{ width: 150 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All players</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {shown.map(m => {
        const ps = byMatch.get(m.id) || []
        return (
          <div key={m.id} className="match-row">
            <span className={`tag ${m.radiant_win ? 'rad' : 'dire'}`}>{m.radiant_win ? 'RAD' : 'DIRE'}</span>
            <div className="grow small">
              <div>{new Date(m.played_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · <span className="mute num">{fmt.dur(m.duration_seconds)}</span> {m.dota_match_id && <span className="mute num">· #{m.dota_match_id}</span>}</div>
              <div className="mute" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ps.map(p => `${named(p.player_id)}${p.won ? ' ✓' : ''}`).join(' · ')}
              </div>
            </div>
            <button className="btn sm danger" onClick={() => remove(m)}>✕</button>
          </div>
        )
      })}
    </div>
  )
}
