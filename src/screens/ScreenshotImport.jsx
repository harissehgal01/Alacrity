import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmt } from '../lib/stats'

// Downscale + JPEG-compress a screenshot in the browser so the payload stays small.
function fileToJpegBase64(file, maxW = 1920) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      resolve(dataUrl.split(',')[1])
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export default function ScreenshotImport({ players, reload }) {
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [mapping, setMapping] = useState({}) // index -> player_id | ''
  const [playedAt, setPlayedAt] = useState(() => new Date().toISOString().slice(0, 16))
  const inputRef = useRef()

  function prefillMapping(playersParsed) {
    const pre = {}
    playersParsed.forEach((p, i) => {
      const hit = players.find(r => {
        const a = norm(r.name), b = norm(p.persona)
        return a === b || a.includes(b) || b.includes(a)
      })
      pre[i] = hit ? hit.id : ''
    })
    return pre
  }

  async function analyze() {
    setBusy(true); setMsg(null); setParsed(null)
    try {
      // server-side daily quota: 10 screenshot reads per user per day
      const { data: remaining, error: qErr } = await supabase.rpc('use_screenshot_quota', { daily_limit: 10 })
      if (qErr) throw qErr
      if (remaining === -1) throw new Error('Daily limit reached: 10 screenshot reads per day. Try again tomorrow.')
      const images = []
      for (const f of files.slice(0, 2)) {
        images.push({ media_type: 'image/jpeg', data: await fileToJpegBase64(f) })
      }
      const r = await fetch('/api/parse-screenshot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ images }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Reading failed')
      setParsed(data)
      setMapping(prefillMapping(data.players))
      if (typeof remaining === 'number' && remaining >= 0 && remaining <= 3) setMsg({ err: false, text: `${remaining} screenshot reads left today.` })
    } catch (e) {
      setMsg({ err: true, text: e.message })
    } finally { setBusy(false) }
  }

  async function save() {
    setBusy(true); setMsg(null)
    try {
      const rows = parsed.players.map((p, i) => ({ p, playerId: mapping[i] })).filter(r => r.playerId)
      if (rows.length === 0) throw new Error('Map at least one player to the roster before saving.')
      const { data: match, error: mErr } = await supabase.from('matches').insert({
        played_at: new Date(playedAt).toISOString(),
        radiant_win: parsed.winner === 'radiant',
      }).select().single()
      if (mErr) throw mErr
      const { error: pErr } = await supabase.from('match_performances').insert(rows.map(({ p, playerId }) => ({
        match_id: match.id,
        player_id: playerId,
        team: p.team,
        hero_name: p.hero || null,
        won: p.team === parsed.winner,
        kills: p.kills ?? 0, deaths: p.deaths ?? 0, assists: p.assists ?? 0,
        gpm: p.gpm, xpm: p.xpm,
        hero_damage: p.hero_damage, tower_damage: p.tower_damage,
        last_hits: p.last_hits, net_worth: p.net_worth,
      })))
      if (pErr) throw pErr
      setMsg({ err: false, text: `Match saved with ${rows.length} crew performances.` })
      setParsed(null); setFiles([]); if (inputRef.current) inputRef.current.value = ''
      reload()
    } catch (e) {
      setMsg({ err: true, text: e.message })
    } finally { setBusy(false) }
  }

  return (
    <div className="card">
      <h2>Import from screenshots</h2>
      <p className="small mute" style={{ marginTop: 0 }}>Upload the post-match scoreboard (page 1, and page 2 if you have it). The stats are read automatically; you confirm who's who before anything is saved. Use this for games OpenDota can't retrieve.</p>
      <div className="row" style={{ marginBottom: 10 }}>
        <input ref={inputRef} className="input grow" type="file" accept="image/*" multiple
          onChange={e => setFiles([...e.target.files].slice(0, 2))} />
        <button className="btn" disabled={busy || files.length === 0} onClick={analyze}>{busy ? 'Reading…' : 'Read'}</button>
      </div>
      {msg && <div className={`notice ${msg.err ? 'err' : ''}`} style={{ marginBottom: 10 }}>{msg.text}</div>}

      {parsed && (
        <>
          <div className="row" style={{ marginBottom: 10 }}>
            <span className={`tag ${parsed.winner === 'radiant' ? 'rad' : 'dire'}`}>{parsed.winner} victory</span>
            <input type="datetime-local" className="input" style={{ width: 'auto' }} value={playedAt} onChange={e => setPlayedAt(e.target.value)} />
          </div>
          {['radiant', 'dire'].map(team => (
            <div key={team} style={{ marginBottom: 10 }}>
              <div className="eyebrow" style={{ marginBottom: 6, textTransform: 'capitalize' }}>{team}</div>
              {parsed.players.map((p, i) => p.team === team && (
                <div key={i} className="row" style={{ marginBottom: 6 }}>
                  <div className="grow small">
                    <div>{p.persona} <span className="mute">· {p.hero}</span></div>
                    <div className="mute num">{p.kills}/{p.deaths}/{p.assists} · {fmt.n(p.hero_damage)} dmg · {fmt.n(p.net_worth)} net</div>
                  </div>
                  <select className="input" style={{ width: 140 }} value={mapping[i] || ''}
                    onChange={e => setMapping(m => ({ ...m, [i]: e.target.value }))}>
                    <option value="">Guest / skip</option>
                    {players.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          ))}
          <button className="btn" style={{ width: '100%' }} disabled={busy} onClick={save}>Save match</button>
        </>
      )}
    </div>
  )
}
