import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function ClaimIdentity({ players, onDone }) {
  const { user } = useAuth()
  const [choice, setChoice] = useState('')
  const [busy, setBusy] = useState(false)

  const taken = new Set() // could be enhanced to hide already-claimed players

  async function claim() {
    setBusy(true)
    await supabase.from('profiles').update({ player_id: choice || null }).eq('id', user.id)
    setBusy(false); onDone()
  }
  async function skip() {
    setBusy(true)
    await supabase.from('profiles').update({ claim_skipped: true }).eq('id', user.id)
    setBusy(false); onDone()
  }

  return (
    <div className="modal-back">
      <div className="modal" style={{ maxWidth: 420 }}>
        <h2 style={{ marginBottom: 6 }}>Which player are you?</h2>
        <p className="small mute" style={{ marginTop: 0 }}>Link your account to your roster name so you can see your own stats and punctuality. You can only edit your own profile — the admin manages matches and attendance.</p>
        <select className="input" style={{ marginBottom: 12 }} value={choice} onChange={e => setChoice(e.target.value)}>
          <option value="">Select your name…</option>
          {players.filter(p => !taken.has(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="row">
          <button className="btn grow" disabled={busy || !choice} onClick={claim}>Link my account</button>
          <button className="btn ghost" disabled={busy} onClick={skip}>Skip</button>
        </div>
      </div>
    </div>
  )
}
