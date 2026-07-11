import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchMatch, fetchHeroes, heroById } from '../lib/opendota'
import { fmt } from '../lib/stats'

export default function SelfLog({ user, reload }) {
  const [matchId, setMatchId] = useState('')
  const [fetched, setFetched] = useState(null)
  const [heroes, setHeroes] = useState([])
  const [mySlot, setMySlot] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function load() {
    setBusy(true); setMsg(null); setFetched(null); setMySlot(null)
    try {
      const [m, hs] = await Promise.all([fetchMatch(matchId.trim()), fetchHeroes()])
      setFetched(m); setHeroes(hs)
    } catch (e) { setMsg({ err: true, text: e.message }) }
    finally { setBusy(false) }
  }

  async function save() {
    if (mySlot == null) return
    setBusy(true); setMsg(null)
    try {
      const me = fetched.players.find(p => p.slot === mySlot)
      const { data: match, error: mErr } = await supabase.from('matches').insert({
        dota_match_id: fetched.dota_match_id,
        played_at: fetched.started_at,
        duration_seconds: fetched.duration_seconds,
        radiant_win: fetched.radiant_win,
        created_by: user.id,
      }).select().single()
      if (mErr) {
        if (mErr.code === '23505') throw new Error('This match is already logged.')
        throw mErr
      }
      const { error: pErr } = await supabase.from('match_performances').insert({
        match_id: match.id,
        profile_id: user.id,
        team: me.is_radiant ? 'radiant' : 'dire',
        hero_name: heroById(heroes, me.hero_id)?.name || null,
        won: me.is_radiant === fetched.radiant_win,
        kills: me.kills, deaths: me.deaths, assists: me.assists,
        gpm: me.gpm, xpm: me.xpm,
        hero_damage: me.hero_damage, tower_damage: me.tower_damage,
        last_hits: me.last_hits, net_worth: me.net_worth,
      })
      if (pErr) throw pErr
      setMsg({ err: false, text: `Match ${fetched.dota_match_id} added to your public profile.` })
      setFetched(null); setMatchId('')
      reload()
    } catch (e) { setMsg({ err: true, text: e.message }) }
    finally { setBusy(false) }
  }

  return (
    <div className="card">
      <h2>Log your own match</h2>
      <p className="small mute" style={{ marginTop: 0 }}>Paste an OpenDota Match ID, pick yourself from the scoreboard, and your stat line is added to your public profile — no crew mapping needed.</p>
      <div className="row">
        <input className="input grow num" inputMode="numeric" placeholder="OpenDota Match ID"
          value={matchId} onChange={e => setMatchId(e.target.value)} />
        <button className="btn" disabled={busy || !matchId.trim()} onClick={load}>{busy ? '…' : 'Fetch'}</button>
      </div>
      {msg && <div className={`notice ${msg.err ? 'err' : ''}`} style={{ marginTop: 10 }}>{msg.text}</div>}
      {fetched && (
        <div style={{ marginTop: 14 }}>
          <p className="small mute">Tap the row that's you.</p>
          {fetched.players.map(p => (
            <button key={p.slot} className="match-row" style={{ width: '100%', textAlign: 'left', background: mySlot === p.slot ? 'var(--bg3)' : 'none', borderRadius: 10 }} onClick={() => setMySlot(p.slot)}>
              <img src={heroById(heroes, p.hero_id)?.img} alt="" width="46" height="26" style={{ borderRadius: 4 }} />
              <div className="grow small">
                <div>{p.persona}</div>
                <div className="mute num">{p.kills}/{p.deaths}/{p.assists} · {fmt.n(p.hero_damage)} dmg</div>
              </div>
              {mySlot === p.slot && <span style={{ color: 'var(--brand)' }}>✓ You</span>}
            </button>
          ))}
          <button className="btn" style={{ width: '100%', marginTop: 10 }} disabled={busy || mySlot == null} onClick={save}>Save to my profile</button>
        </div>
      )}
    </div>
  )
}
