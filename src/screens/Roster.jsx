import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { puncSummary, tierLabel } from '../lib/punctuality'

export default function Roster({ players, reload, isAdmin, punc = [] }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const puncByPlayer = useMemo(() => {
    const m = new Map()
    for (const p of players) m.set(p.id, puncSummary(punc.filter(r => r.player_id === p.id)))
    return m
  }, [players, punc])

  async function add() {
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('players').insert({ name: name.trim() })
    setBusy(false)
    if (error) setMsg(error.code === '23505' ? 'That name is already on the roster.' : error.message)
    else { setName(''); reload() }
  }

  async function rename(p) {
    const next = prompt('New name for ' + p.name, p.name)
    if (!next || next.trim() === p.name) return
    const { error } = await supabase.from('players').update({ name: next.trim() }).eq('id', p.id)
    if (error) alert(error.message); else reload()
  }

  async function remove(p) {
    if (!confirm(`Remove ${p.name}? Their match performances and punctuality records will be deleted too.`)) return
    await supabase.from('players').delete().eq('id', p.id)
    reload()
  }

  return (
    <div className="card">
      <h2>Crew roster</h2>
      <p className="small mute" style={{ marginTop: 0 }}>This is your named crew — it feeds the <b>Crew</b> leaderboard. Anyone who signs in can also appear on the separate <b>Public</b> leaderboard by logging their own matches, with no roster entry needed.</p>
      {isAdmin && <div className="row" style={{ marginBottom: 12 }}>
        <input className="input grow" placeholder="Player name" value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && add()} />
        <button className="btn" disabled={busy || !name.trim()} onClick={add}>Add</button>
      </div>}
      {!isAdmin && <p className="small mute">Only the admin can edit the roster.</p>}
      {msg && <div className="notice err" style={{ marginBottom: 10 }}>{msg}</div>}
      {players.length === 0 && <p className="mute small">Add your crew — around 15 names, one per player.</p>}
      {players.map(p => {
        const pz = puncByPlayer.get(p.id)
        return (
          <div key={p.id} className="match-row">
            <div className="grow row" style={{ gap: 8 }}>
              <span>{p.name}</span>
              {pz && <span className={`punc-badge ${pz.tier}`} title={pz.avg != null ? `Avg ${Math.round(pz.avg)}m late` : ''}>
                <ClockIcon /> {tierLabel[pz.tier]}
              </span>}
            </div>
            {isAdmin && <button className="btn sm ghost" onClick={() => rename(p)}>Rename</button>}
            {isAdmin && <button className="btn sm danger" onClick={() => remove(p)}>✕</button>}
          </div>
        )
      })}
    </div>
  )
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: -1, marginRight: 1 }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
