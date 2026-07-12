import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchMatch, fetchHeroes, heroById } from '../lib/opendota'
import { fmt } from '../lib/stats'

export default function ImportMatch({ players, reload }) {
  const [matchId, setMatchId] = useState('')
  const [fetched, setFetched] = useState(null)
  const [heroes, setHeroes] = useState([])
  const [mapping, setMapping] = useState({}) // slot -> player_id | ''
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function load() {
    setBusy(true); setMsg(null); setFetched(null)
    try {
      const [m, hs] = await Promise.all([fetchMatch(matchId.trim()), fetchHeroes()])
      setFetched(m); setHeroes(hs)
      // pre-map by exact persona name match against roster
      const pre = {}
      for (const p of m.players) {
        const hit = players.find(r => r.name.toLowerCase() === (p.persona || '').toLowerCase())
        pre[p.slot] = hit ? hit.id : ''
      }
      setMapping(pre)
    } catch (e) {
      setMsg({ err: true, text: e.message })
    } finally { setBusy(false) }
  }

  async function save() {
    setBusy(true); setMsg(null)
    try {
      const mapped = fetched.players.filter(p => mapping[p.slot])
      if (mapped.length === 0) throw new Error('Map at least one player to your roster before saving.')
      const { data: match, error: mErr } = await supabase.from('matches').insert({
        dota_match_id: fetched.dota_match_id,
        played_at: fetched.started_at,
        duration_seconds: fetched.duration_seconds,
        radiant_win: fetched.radiant_win,
      }).select().single()
      if (mErr) {
        if (mErr.code === '23505') throw new Error('This match is already logged.')
        throw mErr
      }
      const rows = mapped.map(p => ({
        match_id: match.id,
        player_id: mapping[p.slot],
        team: p.is_radiant ? 'radiant' : 'dire',
        hero_name: heroById(heroes, p.hero_id)?.name || null,
        won: p.is_radiant === fetched.radiant_win,
        kills: p.kills, deaths: p.deaths, assists: p.assists,
        gpm: p.gpm, xpm: p.xpm,
        hero_damage: p.hero_damage, tower_damage: p.tower_damage,
        last_hits: p.last_hits, net_worth: p.net_worth,
        obs_placed: p.obs_placed, sen_placed: p.sen_placed,
        camps_stacked: p.camps_stacked, gold_spent: p.gold_spent,
      }))
      const { error: pErr } = await supabase.from('match_performances').insert(rows)
      if (pErr) throw pErr
      setMsg({ err: false, text: `Match ${fetched.dota_match_id} saved with ${rows.length} player performances.` })
      setFetched(null); setMatchId('')
      reload()
    } catch (e) {
      setMsg({ err: true, text: e.message })
    } finally { setBusy(false) }
  }

  const side = which => fetched.players.filter(p => p.is_radiant === (which === 'radiant'))

  return (
    <div className="card">
      <h2>Log a match</h2>
      <div className="row">
        <input className="input grow num" inputMode="numeric" placeholder="OpenDota Match ID, e.g. 8231234567"
          value={matchId} onChange={e => setMatchId(e.target.value)} />
        <button className="btn" disabled={busy || !matchId.trim()} onClick={load}>{busy ? '…' : 'Fetch'}</button>
      </div>
      <p className="small mute" style={{ marginBottom: 0 }}>The Match ID is on the game's end screen and in the Dota client under Recent Games — or on opendota.com.</p>

      {msg && <div className={`notice ${msg.err ? 'err' : ''}`} style={{ marginTop: 10 }}>{msg.text}</div>}

      {fetched && (
        <div style={{ marginTop: 14 }}>
          <div className="row small mute" style={{ marginBottom: 8 }}>
            <span className={`tag ${fetched.radiant_win ? 'rad' : 'dire'}`}>{fetched.radiant_win ? 'Radiant victory' : 'Dire victory'}</span>
            <span className="num">{fmt.dur(fetched.duration_seconds)}</span>
          </div>
          {['radiant', 'dire'].map(team => (
            <div key={team} style={{ marginBottom: 10 }}>
              <div className="subtitle" style={{ marginBottom: 6 }}>{team}</div>
              {side(team).map(p => (
                <div key={p.slot} className="row" style={{ marginBottom: 6 }}>
                  <img src={heroById(heroes, p.hero_id)?.img} alt="" width="46" height="26" style={{ borderRadius: 4 }} />
                  <div className="grow small">
                    <div>{p.persona}</div>
                    <div className="mute num">{p.kills}/{p.deaths}/{p.assists} · {fmt.n(p.hero_damage)} dmg</div>
                  </div>
                  <select className="input" style={{ width: 140 }} value={mapping[p.slot] || ''}
                    onChange={e => setMapping(m => ({ ...m, [p.slot]: e.target.value }))}>
                    <option value="">Not in crew</option>
                    {players.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          ))}
          <button className="btn" disabled={busy} onClick={save} style={{ width: '100%' }}>Save match</button>
        </div>
      )}
    </div>
  )
}
