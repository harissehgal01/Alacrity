import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function cellClass(r) {
  if (!r) return 'cell-empty'
  if (r.no_show) return 'cell-noshow'
  const m = r.minutes_late ?? 0
  if (m <= 0) return 'cell-ontime'
  if (m <= 10) return 'cell-late10'
  if (m <= 20) return 'cell-late20'
  return 'cell-late30'
}
function cellText(r) {
  if (!r) return '·'
  if (r.no_show) return 'NS'
  const m = r.minutes_late ?? 0
  return m > 0 ? `+${m}` : `${m}`
}

export default function Punctuality({ players, isAdmin }) {
  const [rows, setRows] = useState([])
  const [adding, setAdding] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [entries, setEntries] = useState({})
  const [edit, setEdit] = useState(null) // { player, date, row|null }
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
      t.set(p.id, { total: late, avg: attended.length ? late / attended.length : null, noShows: mine.filter(r => r.no_show).length })
    }
    return t
  }, [rows, players])

  const arrivals = useMemo(() => {
    const m = new Map()
    for (const d of dates) {
      const attended = rows.filter(r => r.session_date === d && !r.no_show && r.minutes_late != null)
      if (attended.length === 0) { m.set(d, null); continue }
      const minVal = Math.min(...attended.map(r => r.minutes_late))
      const maxVal = Math.max(...attended.map(r => r.minutes_late))
      const nameOf = pid => players.find(p => p.id === pid)?.name || '—'
      m.set(d, {
        first: attended.filter(r => r.minutes_late === minVal).map(r => nameOf(r.player_id)),
        firstVal: minVal,
        last: attended.filter(r => r.minutes_late === maxVal).map(r => nameOf(r.player_id)),
        lastVal: maxVal,
      })
    }
    return m
  }, [dates, rows, players])

  async function saveSession() {
    setBusy(true)
    const payload = players.filter(p => entries[p.id] !== undefined).map(p => ({
      player_id: p.id, session_date: date,
      minutes_late: entries[p.id].noShow ? null : Number(entries[p.id].late || 0),
      no_show: !!entries[p.id].noShow,
    }))
    if (payload.length) await supabase.from('punctuality').upsert(payload, { onConflict: 'player_id,session_date' })
    setBusy(false); setAdding(false); setEntries({})
    load()
  }

  async function saveEdit(minutes, noShow) {
    setBusy(true)
    await supabase.from('punctuality').upsert([{
      player_id: edit.player.id, session_date: edit.date,
      minutes_late: noShow ? null : Number(minutes || 0), no_show: noShow,
    }], { onConflict: 'player_id,session_date' })
    setBusy(false); setEdit(null); load()
  }

  async function clearEdit() {
    setBusy(true)
    await supabase.from('punctuality').delete().eq('player_id', edit.player.id).eq('session_date', edit.date)
    setBusy(false); setEdit(null); load()
  }

  async function deleteSession(d) {
    if (!confirm(`Delete the whole ${d} session for everyone?`)) return
    await supabase.from('punctuality').delete().eq('session_date', d)
    load()
  }

  return (
    <>
      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          <h2 className="grow" style={{ marginBottom: 0 }}>Punctuality</h2>
          {isAdmin && <button className="btn sm" onClick={() => setAdding(a => !a)}>{adding ? 'Cancel' : 'Record session'}</button>}
        </div>
        <p className="small mute" style={{ marginTop: 0 }}>Minutes late per session — negative means early. Tap any cell to edit or clear it. Attendance only; never touches the leaderboard.</p>

        {adding && (
          <div style={{ marginBottom: 14 }}>
            <input type="date" className="input" style={{ width: 'auto', marginBottom: 10 }} value={date} onChange={e => setDate(e.target.value)} />
            {players.map(p => {
              const e = entries[p.id] || { late: '', noShow: false }
              return (
                <div key={p.id} className="row" style={{ marginBottom: 6 }}>
                  <div className="grow small">{p.name}</div>
                  <input className="input num" type="number" style={{ width: 90 }} placeholder="min late" disabled={e.noShow} value={e.late}
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
          <div className="arrivals-list">
            {[...dates].reverse().map(d => {
              const a = arrivals.get(d)
              if (!a) return null
              return (
                <div key={d} className="arrival-row">
                  <span className="mute num small">{new Date(d + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                  <span className="small"><span className="arrival-tag first">First</span> {a.first.join(', ')}{a.firstVal !== 0 && <span className="mute num"> ({a.firstVal > 0 ? `+${a.firstVal}` : a.firstVal}m)</span>}</span>
                  <span className="small"><span className="arrival-tag last">Last</span> {a.last.join(', ')}{a.lastVal !== 0 && <span className="mute num"> ({a.lastVal > 0 ? `+${a.lastVal}` : a.lastVal}m)</span>}</span>
                </div>
              )
            })}
          </div>
        )}

        {dates.length > 0 && (
          <div className="punc-scroll">
            <table className="punc-table">
              <thead>
                <tr>
                  <th>Player</th>
                  {dates.map(d => (
                    <th key={d}>
                      {new Date(d + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      {isAdmin && <button className="btn sm danger" style={{ padding: '0 5px', marginLeft: 4, fontSize: 10 }} title="Delete session" onClick={() => deleteSession(d)}>✕</button>}
                    </th>
                  ))}
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
                        return (
                          <td key={d}>
                            <button className={`cellbtn ${cellClass(r)}`} onClick={() => isAdmin && setEdit({ player: p, date: d, row: r || null })}>
                              {cellText(r)}
                            </button>
                          </td>
                        )
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

      {edit && <EditCell edit={edit} busy={busy} onSave={saveEdit} onClear={clearEdit} onClose={() => setEdit(null)} />}
    </>
  )
}

function EditCell({ edit, busy, onSave, onClear, onClose }) {
  const [minutes, setMinutes] = useState(edit.row && !edit.row.no_show ? String(edit.row.minutes_late ?? 0) : '')
  const [noShow, setNoShow] = useState(edit.row?.no_show || false)
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <h2 style={{ marginBottom: 4 }}>{edit.player.name}</h2>
        <p className="small mute" style={{ marginTop: 0 }}>{new Date(edit.date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
        <div className="row" style={{ marginBottom: 10 }}>
          <input className="input num grow" type="number" placeholder="Minutes late (negative = early)" disabled={noShow}
            value={minutes} onChange={e => setMinutes(e.target.value)} />
          <label className="small mute" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={noShow} onChange={e => setNoShow(e.target.checked)} /> no-show
          </label>
        </div>
        <div className="row">
          <button className="btn grow" disabled={busy} onClick={() => onSave(minutes, noShow)}>Save</button>
          {edit.row && <button className="btn danger" disabled={busy} onClick={onClear}>Clear entry</button>}
        </div>
      </div>
    </div>
  )
}
