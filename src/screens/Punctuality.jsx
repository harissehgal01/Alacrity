import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function cellClass(r) {
  if (!r) return 'empty'
  if (r.no_show) return 'noshow'
  const m = r.minutes_late ?? 0
  if (m <= 0) return 'ontime'
  if (m <= 10) return 'late10'
  if (m <= 20) return 'late20'
  return 'late30'
}
function cellText(r) {
  if (!r) return '·'
  if (r.no_show) return 'NS'
  const m = r.minutes_late ?? 0
  return m <= 0 ? (m === 0 ? '0' : `${m}`) : `+${m}`
}

export default function Punctuality({ players }) {
  const [rows, setRows] = useState([])
  const [adding, setAdding] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [entries, setEntries] = useState({}) // player_id -> {late, noShow}
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.from('punctuality').select('*').order('session_date')
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  const dates = useMemo(() => [...new Set(rows.map(r => r.session_date))].sort(), [rows])
  const byKey = useMemo(() => {
    const m = new Map()
    for (const r of rows) m.set(`${r.player_id}|${r.session_date}`, r)
    return m
  }, [rows])

  const totals = useMemo(() => {
    const t = new Map()
    for (const p of players) {
      const mine = rows.filter(r => r.player_id === p.id)
      const attended = mine.filter(r => !r.no_show && r.minutes_late != null)
      const late = attended.reduce((a, r) => a + Math.max(0, r.minutes_late), 0)
      t.set(p.id, {
        total: late,
        avg: attended.length ? late / attended.length : null,
        noShows: mine.filter(r => r.no_show).length,
      })
    }
    return t
  }, [rows, players])

  async function saveSession() {
    setBusy(true)
    const payload = players
      .filter(p => entries[p.id] !== undefined)
      .map(p => ({
        player_id: p.id,
        session_date: date,
        minutes_late: entries[p.id].noShow ? null : Number(entries[p.id].late || 0),
        no_show: !!entries[p.id].noShow,
      }))
    if (payload.length) {
      await supabase.from('punctuality').upsert(payload, { onConflict: 'player_id,session_date' })
    }
    setBusy(false); setAdding(false); setEntries({})
    load()
  }

  return (
    <>
      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <h2 className="grow" style={{ marginBottom: 0 }}>Punctuality</h2>
          <button className="btn sm" onClick={() => setAdding(a => !a)}>{adding ? 'Cancel' : 'Record session'}</button>
        </div>
        <p className="small mute" style={{ marginTop: 0 }}>Minutes late per session. Negative = early. Attendance only — it never touches the leaderboard.</p>

        {adding && (
          <div style={{ marginBottom: 14 }}>
            <input type="date" className="input" style={{ width: 'auto', marginBottom: 10 }} value={date} onChange={e => setDate(e.target.value)} />
            {players.map(p => {
              const e = entries[p.id] || { late: '', noShow: false }
              return (
                <div key={p.id} className="row" style={{ marginBottom: 6 }}>
                  <div className="grow small">{p.name}</div>
                  <input className="input num" type="number" style={{ width: 90 }} placeholder="min late"
                    disabled={e.noShow}
                    value={e.late}
                    onChange={ev => setEntries(s => ({ ...s, [p.id]: { ...e, late: ev.target.value } }))} />
                  <label className="small mute" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={e.noShow}
                      onChange={ev => setEntries(s => ({ ...s, [p.id]: { ...e, noShow: ev.target.checked } }))} />
                    no-show
                  </label>
                </div>
              )
            })}
            <p className="small mute">Leave a player untouched to skip them for this session.</p>
            <button className="btn" style={{ width: '100%' }} disabled={busy} onClick={saveSession}>Save session</button>
          </div>
        )}

        {dates.length === 0 && !adding && <p className="mute small">No sessions yet. Record the first one above.</p>}

        {dates.length > 0 && (
          <div className="punc-scroll">
            <table className="punc-table">
              <thead>
                <tr>
                  <th>Player</th>
                  {dates.map(d => <th key={d}>{new Date(d + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</th>)}
                  <th>Total</th><th>Avg</th><th>NS</th>
                </tr>
              </thead>
              <tbody>
                {players.map(p => {
                  const t = totals.get(p.id)
                  return (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      {dates.map(d => {
                        const r = byKey.get(`${p.id}|${d}`)
                        return <td key={d}><span className={`cell num ${cellClass(r)}`}>{cellText(r)}</span></td>
                      })}
                      <td className="num">{t.total}</td>
                      <td className="num">{t.avg == null ? '—' : Math.round(t.avg * 10) / 10}</td>
                      <td className="num">{t.noShows || ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
