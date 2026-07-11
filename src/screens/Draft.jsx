import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchHeroes } from '../lib/opendota'
import { SEQUENCE, TURN_SECONDS, RESERVE_SECONDS, phaseLabel } from '../lib/draftSequence'

export default function Draft() {
  const [heroes, setHeroes] = useState([])
  const [draft, setDraft] = useState(null)
  const [heroErr, setHeroErr] = useState(null)
  const [search, setSearch] = useState('')
  const [now, setNow] = useState(Date.now())
  const [names, setNames] = useState({ A: '', B: '' })
  const [firstPick, setFirstPick] = useState('A')
  const applying = useRef(false)

  useEffect(() => {
    fetchHeroes().then(setHeroes).catch(e => setHeroErr(e.message))
  }, [])

  // load latest in-progress draft, subscribe to realtime updates
  useEffect(() => {
    supabase.from('drafts').select('*').eq('status', 'in_progress')
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => setDraft(data?.[0] || null))
    const ch = supabase.channel('draft-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drafts' }, payload => {
        if (payload.eventType === 'DELETE') { setDraft(d => d?.id === payload.old.id ? null : d); return }
        setDraft(d => {
          const row = payload.new
          if (row.status !== 'in_progress' && d?.id === row.id) return row
          if (!d || d.id === row.id || row.status === 'in_progress') return row
          return d
        })
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  const step = draft?.current_step ?? 0
  const done = draft && step >= SEQUENCE.length
  const current = !done && draft ? SEQUENCE[step] : null

  const taken = useMemo(() => new Set((draft?.actions || []).map(a => a.hero_id)), [draft])
  const picksOf = team => (draft?.actions || []).filter(a => a.type === 'pick' && a.team === team)
  const bansOf = team => (draft?.actions || []).filter(a => a.type === 'ban' && a.team === team)

  // timer math (advisory — the draft never auto-forfeits, captains keep honour)
  const elapsed = draft?.turn_started_at ? Math.floor((now - new Date(draft.turn_started_at).getTime()) / 1000) : 0
  const turnLeft = Math.max(0, TURN_SECONDS - elapsed)
  const reserveKey = current?.team === 'A' ? 'radiant_reserve_seconds' : 'dire_reserve_seconds'
  const reserveNow = draft ? Math.max(0, draft[reserveKey] - Math.max(0, elapsed - TURN_SECONDS)) : 0

  async function startDraft() {
    const { data, error } = await supabase.from('drafts').insert({
      radiant_captain: names.A || 'Team A',
      dire_captain: names.B || 'Team B',
      first_pick: 'radiant', // team A is always stored as radiant side internally
      radiant_reserve_seconds: RESERVE_SECONDS,
      dire_reserve_seconds: RESERVE_SECONDS,
      turn_started_at: new Date().toISOString(),
    }).select().single()
    if (!error) setDraft(data)
  }

  async function act(hero) {
    if (!draft || !current || taken.has(hero.id) || applying.current) return
    applying.current = true
    try {
      const overtime = Math.max(0, elapsed - TURN_SECONDS)
      const nextStep = step + 1
      const patch = {
        actions: [...draft.actions, { order: step, type: current.type, team: current.team, hero_id: hero.id, at: new Date().toISOString() }],
        current_step: nextStep,
        [reserveKey]: Math.max(0, draft[reserveKey] - overtime),
        turn_started_at: new Date().toISOString(),
        ...(nextStep >= SEQUENCE.length ? { status: 'completed' } : {}),
      }
      const { data } = await supabase.from('drafts').update(patch).eq('id', draft.id).select().single()
      if (data) setDraft(data)
      setSearch('')
    } finally { applying.current = false }
  }

  async function undo() {
    if (!draft || draft.actions.length === 0) return
    const { data } = await supabase.from('drafts').update({
      actions: draft.actions.slice(0, -1),
      current_step: step - 1,
      status: 'in_progress',
      turn_started_at: new Date().toISOString(),
    }).eq('id', draft.id).select().single()
    if (data) setDraft(data)
  }

  async function abandon() {
    if (!draft || !confirm('Abandon this draft?')) return
    await supabase.from('drafts').update({ status: 'abandoned' }).eq('id', draft.id)
    setDraft(null)
  }

  const heroImg = id => heroes.find(h => h.id === id)?.img

  const filtered = useMemo(() =>
    heroes.filter(h => h.name.toLowerCase().includes(search.toLowerCase())),
  [heroes, search])

  if (heroErr) return <div className="card"><div className="notice err">{heroErr}</div></div>

  if (!draft || draft.status !== 'in_progress') {
    return (
      <div className="card">
        <h2>Captain's Mode draft</h2>
        <p className="small mute">Both captains open this tab — every ban and pick syncs live between devices. 30s per turn plus a {RESERVE_SECONDS}s reserve each; timers are advisory, nothing auto-skips.</p>
        <div className="row" style={{ marginBottom: 8 }}>
          <input className="input grow" placeholder="Team A captain (first pick)" value={names.A} onChange={e => setNames(n => ({ ...n, A: e.target.value }))} />
          <input className="input grow" placeholder="Team B captain" value={names.B} onChange={e => setNames(n => ({ ...n, B: e.target.value }))} />
        </div>
        <button className="btn" style={{ width: '100%' }} onClick={startDraft} disabled={heroes.length === 0}>
          {heroes.length === 0 ? 'Loading hero pool…' : 'Start draft'}
        </button>
        {draft?.status === 'completed' && <FinalBoard draft={draft} heroImg={heroImg} heroes={heroes} />}
      </div>
    )
  }

  const teamName = t => t === 'A' ? (draft.radiant_captain || 'Team A') : (draft.dire_captain || 'Team B')

  return (
    <>
      <div className="card">
        <div className="draft-head">
          <div className={`team-col ${current?.team === 'A' ? 'active' : ''}`}>
            <h3>{teamName('A')}</h3>
            <div className="slots">{picksOf('A').map(a => <span key={a.order} className="slot"><img src={heroImg(a.hero_id)} alt="" /></span>)}</div>
            <div className="slots">{bansOf('A').map(a => <span key={a.order} className="slot ban"><img src={heroImg(a.hero_id)} alt="" /></span>)}</div>
          </div>
          <div>
            {!done && (
              <>
                <div className={`timer num ${turnLeft === 0 && reserveNow < 30 ? 'low' : ''}`}>
                  {turnLeft > 0 ? `0:${String(turnLeft).padStart(2, '0')}` : `R ${Math.floor(reserveNow / 60)}:${String(reserveNow % 60).padStart(2, '0')}`}
                </div>
                <div className="reserve num">reserve A {draft.radiant_reserve_seconds}s · B {draft.dire_reserve_seconds}s</div>
              </>
            )}
            {done && <div className="timer" style={{ color: 'var(--gold)' }}>Done</div>}
          </div>
          <div className={`team-col right ${current?.team === 'B' ? 'active' : ''}`}>
            <h3>{teamName('B')}</h3>
            <div className="slots" style={{ justifyContent: 'flex-end' }}>{picksOf('B').map(a => <span key={a.order} className="slot"><img src={heroImg(a.hero_id)} alt="" /></span>)}</div>
            <div className="slots" style={{ justifyContent: 'flex-end' }}>{bansOf('B').map(a => <span key={a.order} className="slot ban"><img src={heroImg(a.hero_id)} alt="" /></span>)}</div>
          </div>
        </div>

        <div className="phase-strip">
          {SEQUENCE.map((s, i) => (
            <span key={i} className={`step-dot ${s.type} ${i < step ? 'done-' + SEQUENCE[i].team : ''} ${i === step ? 'now' : ''}`} title={`${s.type} · team ${s.team}`} />
          ))}
        </div>

        {!done && current && (
          <div className="notice" style={{ marginBottom: 10 }}>
            <strong>{phaseLabel(step)}</strong> — {teamName(current.team)} to <strong>{current.type}</strong>. Tap a hero below.
          </div>
        )}
        {done && <FinalBoard draft={draft} heroImg={heroImg} heroes={heroes} />}

        <div className="row" style={{ marginBottom: 10 }}>
          <input className="input grow" placeholder="Search heroes" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn sm ghost" onClick={undo} disabled={draft.actions.length === 0}>Undo</button>
          <button className="btn sm danger" onClick={abandon}>End</button>
        </div>

        {!done && (
          <div className="hero-grid">
            {filtered.map(h => (
              <button key={h.id} className={`hero ${taken.has(h.id) ? 'gone' : ''}`} onClick={() => act(h)} title={h.name}>
                <img src={h.img} alt={h.name} loading="lazy" />
                <span className="nm">{h.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function FinalBoard({ draft, heroImg, heroes }) {
  const nameOf = id => heroes.find(h => h.id === id)?.name || ''
  const picks = t => draft.actions.filter(a => a.type === 'pick' && a.team === t)
  return (
    <div style={{ margin: '10px 0' }}>
      {['A', 'B'].map(t => (
        <div key={t} style={{ marginBottom: 8 }}>
          <div className="subtitle" style={{ marginBottom: 4 }}>{t === 'A' ? draft.radiant_captain : draft.dire_captain}</div>
          <div className="slots">
            {picks(t).map(a => (
              <span key={a.order} className="slot" style={{ width: 76, height: 43 }} title={nameOf(a.hero_id)}>
                <img src={heroImg(a.hero_id)} alt={nameOf(a.hero_id)} />
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
