import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Roster({ players, reload }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

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
      <h2>Roster</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input grow" placeholder="Player name" value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && add()} />
        <button className="btn" disabled={busy || !name.trim()} onClick={add}>Add</button>
      </div>
      {msg && <div className="notice err" style={{ marginBottom: 10 }}>{msg}</div>}
      {players.length === 0 && <p className="mute small">Add your crew — around 15 names, one per player.</p>}
      {players.map(p => (
        <div key={p.id} className="match-row">
          <div className="grow">{p.name}</div>
          <button className="btn sm ghost" onClick={() => rename(p)}>Rename</button>
          <button className="btn sm danger" onClick={() => remove(p)}>✕</button>
        </div>
      ))}
    </div>
  )
}
