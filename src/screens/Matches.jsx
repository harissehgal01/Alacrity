import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmt, mvpByMatch } from '../lib/stats'
import { fetchHeroes } from '../lib/opendota'

// Games within this many minutes of each other are grouped into one session.
const SESSION_GAP_MIN = 720

export default function Matches({ matches, perfs, players, reload }) {
  const [filter, setFilter] = useState('')
  const [heroes, setHeroes] = useState([])
  useEffect(() => { fetchHeroes().then(setHeroes).catch(() => {}) }, [])
  const imgByHero = useMemo(() => new Map(heroes.map(h => [h.name, h.img])), [heroes])

  const byMatch = useMemo(() => {
    const m = new Map()
    for (const p of perfs) {
      if (!m.has(p.match_id)) m.set(p.match_id, [])
      m.get(p.match_id).push(p)
    }
    return m
  }, [perfs])

  const mvps = useMemo(() => mvpByMatch(perfs), [perfs])
  const named = id => players.find(p => p.id === id)?.name || '?'

  const shown = useMemo(() => {
    if (!filter) return matches
    return matches.filter(m => (byMatch.get(m.id) || []).some(p => p.player_id === filter))
  }, [matches, filter, byMatch])

  // Group consecutive (already-sorted, newest-first) matches into sessions by time gap.
  const sessions = useMemo(() => {
    const sorted = [...shown].sort((a, b) => new Date(b.played_at) - new Date(a.played_at))
    const groups = []
    for (const m of sorted) {
      const last = groups[groups.length - 1]
      const t = new Date(m.played_at).getTime()
      if (last && (last.start - t) / 60000 <= SESSION_GAP_MIN) {
        last.matches.push(m); last.start = t
      } else {
        groups.push({ start: t, matches: [m] })
      }
    }
    return groups
  }, [shown])

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
      {sessions.map((sess, si) => {
        const wins = sess.matches.filter(m => filter ? (byMatch.get(m.id) || []).find(p => p.player_id === filter)?.won : m.radiant_win).length
        return (
          <div key={si} style={{ marginBottom: 14 }}>
            <div className="small mute" style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 2px 6px' }}>
              <span>{new Date(sess.start).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
              <span className="num">{sess.matches.length} game{sess.matches.length > 1 ? 's' : ''} · {wins}W {sess.matches.length - wins}L</span>
            </div>
            {sess.matches.map(m => {
              const ps = byMatch.get(m.id) || []
              const mine = filter ? ps.find(p => p.player_id === filter) : null
              const won = filter ? mine?.won : m.radiant_win
              const heroImg = mine ? imgByHero.get(mine.hero_name) : null
              return (
                <div key={m.id} className="match-row" style={{ borderLeft: `3px solid ${won ? 'var(--radiant, #3fb950)' : 'var(--dire, #f85149)'}`, paddingLeft: 10 }}>
                  {heroImg
                    ? <img src={heroImg} alt={mine.hero_name} title={mine.hero_name} style={{ width: 40, height: 22, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                    : <span className={`tag ${m.radiant_win ? 'rad' : 'dire'}`}>{m.radiant_win ? 'RAD' : 'DIRE'}</span>}
                  <div className="grow small">
                    <div>{new Date(m.played_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · <span className="mute num">{fmt.dur(m.duration_seconds)}</span> {m.dota_match_id && <span className="mute num">· #{m.dota_match_id}</span>}</div>
                    <div className="mute" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ps.map(p => `${mvps.get(m.id)?.player_id === p.player_id ? '👑 ' : ''}${named(p.player_id)}${p.won ? ' ✓' : ''}`).join(' · ')}
                    </div>
                  </div>
                  <button className="btn sm danger" onClick={() => remove(m)}>✕</button>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
