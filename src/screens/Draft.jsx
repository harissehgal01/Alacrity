import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { fetchHeroes } from '../lib/opendota'
import { SEQUENCE, RESERVE_SECONDS, turnSeconds, phaseLabel } from '../lib/draftSequence'
import { createRoom, findRoom, claimSeat } from '../lib/room'

const ATTRS = [['str', 'Strength'], ['agi', 'Agility'], ['int', 'Intelligence'], ['all', 'Universal']]

export default function Draft() {
  const { user } = useAuth()
  const [heroes, setHeroes] = useState([])
  const [heroErr, setHeroErr] = useState(null)
  const [room, setRoom] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [msg, setMsg] = useState(null)
  const [past, setPast] = useState([])
  const [viewPast, setViewPast] = useState(null)

  useEffect(() => { fetchHeroes().then(setHeroes).catch(e => setHeroErr(e.message)) }, [])

  // deep link ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('room')
    if (code) findRoom(code).then(r => { if (r) setRoom(r) }).catch(() => {})
  }, [])

  // load past drafts
  useEffect(() => {
    supabase.from('draft_rooms').select('*').eq('status', 'completed')
      .order('completed_at', { ascending: false }).limit(20)
      .then(({ data }) => setPast(data || []))
  }, [room])

  // live subscription to current room
  useEffect(() => {
    if (!room) return
    const ch = supabase.channel('room-' + room.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'draft_rooms', filter: `id=eq.${room.id}` },
        payload => setRoom(payload.new))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [room?.id])

  async function doCreate() {
    setMsg(null)
    try { setRoom(await createRoom(user.id)) }
    catch (e) { setMsg({ err: true, text: e.message }) }
  }
  async function doJoin() {
    setMsg(null)
    try {
      const r = await findRoom(joinCode)
      if (!r) return setMsg({ err: true, text: 'No room with that code.' })
      setRoom(r)
    } catch (e) { setMsg({ err: true, text: e.message }) }
  }

  if (heroErr) return <div className="card"><div className="notice err">{heroErr}</div></div>

  if (viewPast) return <PastDraftView room={viewPast} heroes={heroes} onBack={() => setViewPast(null)} />

  if (!room) {
    return (
      <>
        <div className="card">
          <h2>Draft room</h2>
          <p className="small mute" style={{ marginTop: 0 }}>Create a room and share the code, or join one. Two captains claim seats; everyone else spectates. Current Captain's Mode sequence with live turn control.</p>
          <button className="btn" style={{ width: '100%', marginBottom: 12 }} onClick={doCreate}>Create a room</button>
          <div className="row">
            <input className="input grow" placeholder="Enter room code (e.g. DOTA-7F3K)" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
            <button className="btn ghost" onClick={doJoin} disabled={!joinCode.trim()}>Join</button>
          </div>
          {msg && <div className={`notice ${msg.err ? 'err' : ''}`} style={{ marginTop: 10 }}>{msg.text}</div>}
        </div>

        {past.length > 0 && (
          <div className="card">
            <h2>Past drafts</h2>
            {past.map(r => (
              <div key={r.id} className="past-draft" onClick={() => setViewPast(r)}>
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{r.radiant_name} <span className="mute">vs</span> {r.dire_name}</div>
                  <div className="small mute num">{r.completed_at ? new Date(r.completed_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''} · {r.code}</div>
                </div>
                <span className="mute">→</span>
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  return <Room room={room} setRoom={setRoom} heroes={heroes} user={user} onExit={() => { setRoom(null); window.history.replaceState({}, '', window.location.pathname) }} />
}

function Room({ room, setRoom, heroes, user, onExit }) {
  const [now, setNow] = useState(Date.now())
  const [spinning, setSpinning] = useState(false)
  const applying = useRef(false)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 400); return () => clearInterval(t) }, [])

  const mySeat = room.radiant_seat === user.id ? 'radiant' : room.dire_seat === user.id ? 'dire' : 'spectator'
  const cfg = room.config || {}
  const stage = cfg.stage || (room.status === 'drafting' ? 'drafting' : 'lobby')
  const step = room.current_step ?? 0
  const done = room.status === 'completed' || (stage === 'drafting' && step >= SEQUENCE.length)
  const current = stage === 'drafting' && !done ? SEQUENCE[step] : null

  const sideOfTeam = t => (t === 'F' ? cfg.firstPickSide : (cfg.firstPickSide === 'radiant' ? 'dire' : 'radiant'))
  const currentSide = current ? sideOfTeam(current.team) : null
  const myTurn = current && currentSide === mySeat
  const heroById = id => heroes.find(h => h.id === id)
  const taken = useMemo(() => new Set((room.actions || []).map(a => a.hero_id)), [room])

  const elapsed = room.turn_started_at ? Math.max(0, Math.floor((now - new Date(room.turn_started_at).getTime()) / 1000)) : 0
  const stdSecs = current ? turnSeconds(step) : 30
  const turnLeft = Math.max(0, stdSecs - elapsed)
  const reserveKey = currentSide === 'radiant' ? 'radiant_reserve_seconds' : 'dire_reserve_seconds'
  const reserveNow = current ? Math.max(0, room[reserveKey] - Math.max(0, elapsed - stdSecs)) : 0

  const shareLink = `${window.location.origin}${window.location.pathname}?room=${room.code}`

  async function claim(side) {
    try { setRoom(await claimSeat(room, side, user.id)) }
    catch { /* seat taken */ }
  }

  async function startToss() {
    if (!room.radiant_seat || !room.dire_seat) return
    setSpinning(true)
    const winnerSide = Math.random() < 0.5 ? 'radiant' : 'dire'
    setTimeout(async () => {
      const { data } = await supabase.from('draft_rooms').update({
        status: 'drafting',
        config: { stage: 'winner_choice', tossWinnerSide: winnerSide },
      }).eq('id', room.id).select().single()
      setSpinning(false); if (data) setRoom(data)
    }, 1000)
  }

  async function winnerChoose(choice) {
    const w = cfg.tossWinnerSide, l = w === 'radiant' ? 'dire' : 'radiant'
    const next = { ...cfg, winnerChoice: choice }
    if (choice === 'first_pick' || choice === 'last_pick') {
      next.firstPickSide = choice === 'first_pick' ? w : l
      next.stage = 'drafting'
      const { data } = await supabase.from('draft_rooms').update({ config: next, turn_started_at: new Date().toISOString() }).eq('id', room.id).select().single()
      if (data) setRoom(data)
    } else {
      // winner chose a side; they still need pick order from loser
      next.chosenSide = { winner: choice }
      next.stage = 'loser_pickorder'
      const { data } = await supabase.from('draft_rooms').update({ config: next }).eq('id', room.id).select().single()
      if (data) setRoom(data)
    }
  }

  async function loserChoosePickOrder(choice) {
    const w = cfg.tossWinnerSide, l = w === 'radiant' ? 'dire' : 'radiant'
    // loser picks first/last; winner already took a side
    const next = { ...cfg }
    next.firstPickSide = choice === 'first_pick' ? l : w
    next.stage = 'drafting'
    const { data } = await supabase.from('draft_rooms').update({ config: next, turn_started_at: new Date().toISOString() }).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }

  async function act(hero) {
    if (!myTurn || taken.has(hero.id) || applying.current) return
    applying.current = true
    try {
      const overtime = Math.max(0, elapsed - stdSecs)
      const nextStep = step + 1
      const finishing = nextStep >= SEQUENCE.length
      const patch = {
        actions: [...room.actions, { order: step, type: current.type, team: current.team, side: currentSide, hero_id: hero.id, at: new Date().toISOString() }],
        current_step: nextStep,
        [reserveKey]: Math.max(0, room[reserveKey] - overtime),
        turn_started_at: new Date().toISOString(),
      }
      if (finishing) {
        patch.status = 'completed'
        patch.completed_at = new Date().toISOString()
        patch.radiant_name = captainName('radiant'); patch.dire_name = captainName('dire')
      }
      const { data } = await supabase.from('draft_rooms').update(patch).eq('id', room.id).select().single()
      if (data) setRoom(data)
    } finally { applying.current = false }
  }

  async function undo() {
    if (room.actions.length === 0) return
    const { data } = await supabase.from('draft_rooms').update({
      actions: room.actions.slice(0, -1), current_step: step - 1,
      status: 'drafting', completed_at: null, turn_started_at: new Date().toISOString(),
    }).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }

  function captainName(side) {
    // display: show the seat holder as Radiant/Dire; fall back to label
    return side === 'radiant' ? 'Radiant' : 'Dire'
  }

  const pool = useMemo(() => {
    const g = { str: [], agi: [], int: [], all: [] }
    for (const h of heroes) (g[h.attr] || g.all).push(h)
    return g
  }, [heroes])

  /* ── LOBBY ── */
  if (stage === 'lobby') {
    const bothSeated = room.radiant_seat && room.dire_seat
    return (
      <div className="card">
        <div className="row" style={{ marginBottom: 4 }}>
          <h2 className="grow" style={{ marginBottom: 0 }}>Draft lobby</h2>
          <button className="btn sm ghost" onClick={onExit}>Leave</button>
        </div>
        <div className="room-hero">
          <div className="eyebrow">Room code</div>
          <div className="room-code">{room.code}</div>
          <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => { navigator.clipboard?.writeText(shareLink); }}>Copy invite link</button>
        </div>
        <div className="seat-grid">
          {['radiant', 'dire'].map(side => {
            const seatUser = side === 'radiant' ? room.radiant_seat : room.dire_seat
            const isMe = seatUser === user.id
            const taken = !!seatUser
            return (
              <div key={side} className={`seat ${side} ${taken ? 'taken' : ''} ${isMe ? 'seat-me' : ''}`}>
                <div style={{ fontWeight: 700, color: side === 'radiant' ? 'var(--radiant)' : 'var(--dire-hi)', textTransform: 'capitalize' }}>{side}</div>
                <div className="st">{taken ? (isMe ? 'You' : 'Claimed') : 'Open'}</div>
                {!taken && mySeat === 'spectator' && <button className="btn sm" style={{ marginTop: 8 }} onClick={() => claim(side)}>Claim</button>}
              </div>
            )
          })}
        </div>
        <p className="small mute" style={{ textAlign: 'center' }}>You are: <b style={{ color: 'var(--text)' }}>{mySeat === 'spectator' ? 'Spectator' : mySeat + ' captain'}</b>. Spectators watch without controls.</p>
        {mySeat !== 'spectator' && (
          <>
            <div className="toss-wrap" style={{ paddingTop: 6 }}>
              <div className={`coin ${spinning ? 'spin' : ''}`}>{spinning ? '' : 'Toss'}</div>
              <button className="btn" onClick={startToss} disabled={!bothSeated || spinning || heroes.length === 0}>
                {heroes.length === 0 ? 'Loading heroes…' : !bothSeated ? 'Waiting for both captains…' : spinning ? 'Flipping…' : 'Flip coin & begin'}
              </button>
            </div>
          </>
        )}
        {mySeat === 'spectator' && <div className="waiting-lock">Waiting for the captains to begin the draft…</div>}
      </div>
    )
  }

  /* ── TOSS CHOICES ── */
  if (stage === 'winner_choice' || stage === 'loser_pickorder') {
    const winnerSide = cfg.tossWinnerSide
    const iWon = mySeat === winnerSide
    const iLost = mySeat !== 'spectator' && mySeat !== winnerSide
    return (
      <div className="card toss-wrap">
        <div className="coin" style={{ textTransform: 'capitalize' }}>{winnerSide}</div>
        <h2 style={{ marginBottom: 4 }}><span style={{ textTransform: 'capitalize' }}>{winnerSide}</span> wins the toss</h2>
        {stage === 'winner_choice' && (
          iWon ? (
            <>
              <p className="small mute">Choose your advantage.</p>
              <div className="choice-grid">
                <button className="btn" onClick={() => winnerChoose('first_pick')}>First pick</button>
                <button className="btn" onClick={() => winnerChoose('last_pick')}>Last pick</button>
                <button className="btn" onClick={() => winnerChoose('radiant')}>Take Radiant</button>
                <button className="btn" onClick={() => winnerChoose('dire')}>Take Dire</button>
              </div>
            </>
          ) : <div className="waiting-lock">Waiting for {winnerSide} to choose…</div>
        )}
        {stage === 'loser_pickorder' && (
          iLost ? (
            <>
              <p className="small mute">{winnerSide} took a side. Choose pick order.</p>
              <div className="choice-grid">
                <button className="btn" onClick={() => loserChoosePickOrder('first_pick')}>First pick</button>
                <button className="btn" onClick={() => loserChoosePickOrder('last_pick')}>Last pick</button>
              </div>
            </>
          ) : <div className="waiting-lock">Waiting for the other captain to choose pick order…</div>
        )}
      </div>
    )
  }

  /* ── DRAFTING ── */
  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="eyebrow grow">Room {room.code} · you are {mySeat === 'spectator' ? 'spectating' : mySeat}</div>
        <button className="btn sm ghost" onClick={onExit}>Leave</button>
      </div>

      <div className="draft-top">
        <div className={`dt-team ${currentSide === 'radiant' ? 'turn' : ''}`}>
          <div className="nm radiant">Radiant</div>
          <div className="tag">{cfg.firstPickSide === 'radiant' ? 'First pick' : 'Second pick'}{mySeat === 'radiant' ? ' · you' : ''}</div>
        </div>
        <div className="dt-clock">
          {!done ? (
            <>
              <div className={`t num ${turnLeft === 0 && reserveNow < 30 ? 'low' : ''}`}>
                {turnLeft > 0 ? `0:${String(turnLeft).padStart(2, '0')}` : `${Math.floor(reserveNow / 60)}:${String(reserveNow % 60).padStart(2, '0')}`}
              </div>
              <div className="mode">{turnLeft > 0 ? 'Captains Mode' : 'Reserve'}</div>
              <div className="reserve-row">
                <span className="reserve-chip">R <b className="num">{Math.floor(room.radiant_reserve_seconds / 60)}:{String(room.radiant_reserve_seconds % 60).padStart(2, '0')}</b></span>
                <span className="reserve-chip">D <b className="num">{Math.floor(room.dire_reserve_seconds / 60)}:{String(room.dire_reserve_seconds % 60).padStart(2, '0')}</b></span>
              </div>
            </>
          ) : <div className="t" style={{ color: 'var(--gold)' }}>GG</div>}
        </div>
        <div className={`dt-team right ${currentSide === 'dire' ? 'turn' : ''}`}>
          <div className="nm dire">Dire</div>
          <div className="tag">{cfg.firstPickSide === 'dire' ? 'First pick' : 'Second pick'}{mySeat === 'dire' ? ' · you' : ''}</div>
        </div>
      </div>

      {!done && current && (
        <div className="phase-banner">
          {phaseLabel(step)} — <b style={{ textTransform: 'capitalize' }}>{currentSide}</b> to {current.type} · slot {step + 1}/24
        </div>
      )}
      {done && <div className="phase-banner">Draft complete · saved to history</div>}

      {!done && !myTurn && mySeat !== 'spectator' && <div className="waiting-lock">Waiting for {currentSide} to {current?.type}…</div>}
      {!done && mySeat === 'spectator' && <div className="waiting-lock">Spectating — {currentSide} to {current?.type}</div>}

      <div className="draft-layout">
        <div>
          {myTurn && (
            <div className="row" style={{ marginBottom: 8 }}>
              <div className="grow small" style={{ color: 'var(--gold)', fontWeight: 600 }}>Your turn to {current.type}</div>
              <button className="btn sm ghost" onClick={undo} disabled={room.actions.length === 0}>Undo</button>
            </div>
          )}
          <div className="pool">
            {ATTRS.map(([key, label]) => (
              <div key={key} className={`attr ${key}`}>
                <h3>{label}</h3>
                <div className="attr-grid">
                  {pool[key].map(h => (
                    <button key={h.id} className={`hero ${taken.has(h.id) ? 'gone' : ''}`} onClick={() => act(h)} disabled={!myTurn} title={h.name}>
                      <img src={h.img} alt={h.name} loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <Board room={room} step={step} heroById={heroById} sideOfTeam={sideOfTeam} />
      </div>
    </div>
  )
}

function Board({ room, step, heroById, sideOfTeam }) {
  const bySlot = Object.fromEntries((room.actions || []).map(a => [a.order, a]))
  return (
    <div className="board">
      <div className="board-head">
        <div className="nm" style={{ color: 'var(--radiant)' }}>Radiant</div><div />
        <div className="nm" style={{ color: 'var(--dire-hi)' }}>Dire</div>
      </div>
      {SEQUENCE.map((s, i) => {
        const side = sideOfTeam(s.team)
        const a = bySlot[i]
        const img = a ? heroById(a.hero_id)?.img : null
        const slot = (
          <div className={`bslot ${s.type === 'ban' ? 'ban ' + (side === 'radiant' ? 'side-l' : 'side-r') : 'pickslot'} ${i === step && room.status !== 'completed' ? 'now' : ''} ${!a && s.type === 'pick' ? 'empty-pick' : ''}`}>
            {img && <img src={img} alt="" />}
          </div>
        )
        return (
          <div key={i} className="board-row">
            <div>{side === 'radiant' && slot}</div>
            <div className="board-num">{i + 1}</div>
            <div>{side === 'dire' && slot}</div>
          </div>
        )
      })}
    </div>
  )
}

function PastDraftView({ room, heroes, onBack }) {
  const heroById = id => heroes.find(h => h.id === id)
  const cfg = room.config || {}
  const sideOfTeam = t => (t === 'F' ? cfg.firstPickSide : (cfg.firstPickSide === 'radiant' ? 'dire' : 'radiant'))
  const picks = side => (room.actions || []).filter(a => a.type === 'pick' && sideOfTeam(a.team) === side)
  const bans = side => (room.actions || []).filter(a => a.type === 'ban' && sideOfTeam(a.team) === side)
  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <h2 className="grow" style={{ marginBottom: 0 }}>{room.code}</h2>
        <button className="btn sm ghost" onClick={onBack}>Back</button>
      </div>
      <p className="small mute num">{room.completed_at ? new Date(room.completed_at).toLocaleString() : ''}</p>
      {['radiant', 'dire'].map(side => (
        <div key={side} style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ color: side === 'radiant' ? 'var(--radiant)' : 'var(--dire-hi)', marginBottom: 6, textTransform: 'capitalize' }}>{side} · picks</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {picks(side).map(a => (
              <div key={a.order} style={{ width: 72, textAlign: 'center' }}>
                <img src={heroById(a.hero_id)?.img} alt="" style={{ width: '100%', borderRadius: 6 }} />
                <div style={{ fontSize: 10 }} className="mute">{heroById(a.hero_id)?.name}</div>
              </div>
            ))}
          </div>
          <div className="small mute" style={{ marginTop: 6 }}>Bans: {bans(side).map(a => heroById(a.hero_id)?.name).join(', ') || '—'}</div>
        </div>
      ))}
    </div>
  )
}
