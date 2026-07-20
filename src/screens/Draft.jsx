import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { fetchHeroes } from '../lib/opendota'
import { SEQUENCE, turnSeconds, phaseLabel } from '../lib/draftSequence'
import { createRoom, findRoom, claimSeat } from '../lib/room'

const ATTRS = [['str', 'Strength'], ['agi', 'Agility'], ['int', 'Intelligence'], ['all', 'Universal']]

const nameOf = user => user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest'

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('room')
    if (code) findRoom(code).then(r => { if (r) setRoom(r) }).catch(() => {})
  }, [])

  useEffect(() => {
    supabase.from('draft_rooms').select('*').eq('status', 'completed')
      .order('completed_at', { ascending: false }).limit(20)
      .then(({ data }) => setPast(data || []))
  }, [room])

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
    try { setRoom(await createRoom(user.id)) } catch (e) { setMsg({ err: true, text: e.message }) }
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
          <p className="small mute" style={{ marginTop: 0 }}>Create a room and share the code, or join one. Two captains claim seats, flip the coin, then draft — everyone else spectates live.</p>
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
  const [selected, setSelected] = useState(null) // hero staged, awaiting confirm
  const [search, setSearch] = useState('')
  const [nameDraft, setNameDraft] = useState({ team: '', players: '' })
  const [captains, setCaptains] = useState({}) // userId -> display_name
  const [roster, setRoster] = useState([])

  useEffect(() => {
    supabase.from('players').select('id, name').order('name')
      .then(({ data }) => setRoster(data || []))
  }, [])
  const [chat, setChat] = useState([])
  const [chatText, setChatText] = useState('')
  const chatEnd = useRef(null)
  const applying = useRef(false)

  // captain display names
  useEffect(() => {
    const ids = [room.radiant_seat, room.dire_seat].filter(Boolean)
    if (!ids.length) return
    supabase.from('profiles').select('id, display_name').in('id', ids)
      .then(({ data }) => setCaptains(Object.fromEntries((data || []).map(p => [p.id, p.display_name || 'Captain']))))
  }, [room.radiant_seat, room.dire_seat])

  // chat: load + realtime
  useEffect(() => {
    supabase.from('draft_messages').select('*').eq('room_id', room.id)
      .order('created_at', { ascending: true }).limit(200)
      .then(({ data }) => setChat(data || []))
    const ch = supabase.channel('chat-' + room.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'draft_messages', filter: `room_id=eq.${room.id}` },
        payload => setChat(c => c.some(m => m.id === payload.new.id) ? c : [...c, payload.new]))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [room.id])

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat.length])

  async function sendChat() {
    const body = chatText.trim()
    if (!body) return
    setChatText('')
    const senderName = captains[user.id] || nameOf(user)
    const { data } = await supabase.from('draft_messages')
      .insert({ room_id: room.id, sender_id: user.id, sender_name: senderName, body }).select().single()
    if (data) setChat(c => c.some(m => m.id === data.id) ? c : [...c, data])
  }
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 400); return () => clearInterval(t) }, [])
  useEffect(() => { setSelected(null) }, [room.current_step])

  // pre-toss: A/B are generic captain seats. Post-toss: cfg.sides maps A/B -> radiant/dire.
  const mySeatAB = room.radiant_seat === user.id ? 'A' : room.dire_seat === user.id ? 'B' : null
  const cfg = room.config || {}
  const stage = cfg.stage || (room.status === 'drafting' ? 'drafting' : 'lobby')
  const mySide = cfg.sides ? Object.keys(cfg.sides).find(k => cfg.sides[k] === cfg.sides[mySeatAB]) && cfg.sides[mySeatAB] : null
  const mySeat = mySide || (mySeatAB ? 'captain' : 'spectator')

  const step = room.current_step ?? 0
  const done = room.status === 'completed' || (stage === 'drafting' && step >= SEQUENCE.length)
  const current = stage === 'drafting' && !done ? SEQUENCE[step] : null
  const sideOfTeam = t => (t === 'F' ? cfg.firstPickSide : (cfg.firstPickSide === 'radiant' ? 'dire' : 'radiant'))
  const currentSide = current ? sideOfTeam(current.team) : null
  const myTurn = current && mySide === currentSide
  const heroById = id => heroes.find(h => h.id === id)
  const taken = useMemo(() => new Set((room.actions || []).map(a => a.hero_id)), [room])

  const paused = room.paused
  const pauseAccum = room.pause_accum_seconds || 0
  const rawElapsed = room.turn_started_at ? Math.max(0, Math.floor((now - new Date(room.turn_started_at).getTime()) / 1000)) : 0
  const liveAccum = paused && room.paused_at ? Math.max(0, Math.floor((now - new Date(room.paused_at).getTime()) / 1000)) : 0
  const elapsed = Math.max(0, rawElapsed - pauseAccum - liveAccum)
  const stdSecs = current ? turnSeconds(step) : 30
  const turnLeft = Math.max(0, stdSecs - elapsed)
  const reserveKey = currentSide === 'radiant' ? 'radiant_reserve_seconds' : 'dire_reserve_seconds'
  const reserveNow = current ? Math.max(0, room[reserveKey] - Math.max(0, elapsed - stdSecs)) : 0

  const shareLink = `${window.location.origin}${window.location.pathname}?room=${room.code}`
  const teamMeta = cfg.teamMeta || {}
  const seatLabel = seat => teamMeta[seat]?.team?.trim() || `Captain ${seat === 'A' ? 1 : 2}`
  const rosterName = id => roster.find(p => p.id === id)?.name
  const seatPlayers = seat => {
    const ids = teamMeta[seat]?.playerIds || []
    const fromIds = ids.map(rosterName).filter(Boolean).join(', ')
    return fromIds || teamMeta[seat]?.players?.trim() || ''
  }

  async function togglePlayer(pid) {
    if (!mySeatAB) return
    const cur = teamMeta[mySeatAB]?.playerIds || []
    const next = cur.includes(pid) ? cur.filter(x => x !== pid) : [...cur, pid]
    const meta = { ...teamMeta, [mySeatAB]: { ...(teamMeta[mySeatAB] || {}), playerIds: next } }
    const { data } = await supabase.from('draft_rooms').update({ config: { ...cfg, teamMeta: meta } }).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }

  async function saveNames() {
    if (!mySeatAB) return
    const meta = { ...teamMeta, [mySeatAB]: { ...(teamMeta[mySeatAB] || {}), team: nameDraft.team } }
    const { data } = await supabase.from('draft_rooms').update({ config: { ...cfg, teamMeta: meta } }).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }

  async function claim(seat) {
    try { setRoom(await claimSeat(room, seat, user.id)) } catch { /* taken */ }
  }

  async function startToss() {
    if (!room.radiant_seat || !room.dire_seat) return
    setSpinning(true)
    const winnerAB = Math.random() < 0.5 ? 'A' : 'B'
    setTimeout(async () => {
      const { data } = await supabase.from('draft_rooms').update({
        status: 'drafting',
        config: { ...cfg, stage: 'winner_choice', tossWinner: winnerAB },
      }).eq('id', room.id).select().single()
      setSpinning(false); if (data) setRoom(data)
    }, 1000)
  }

  async function winnerChoose(choice) {
    const w = cfg.tossWinner, l = w === 'A' ? 'B' : 'A'
    const next = { ...cfg, winnerChoice: choice }
    if (choice === 'first_pick' || choice === 'last_pick') {
      next.pickOrder = { [w]: choice === 'first_pick' ? 'F' : 'S', [l]: choice === 'first_pick' ? 'S' : 'F' }
      next.stage = 'loser_side'
    } else {
      next.sides = { [w]: choice, [l]: choice === 'radiant' ? 'dire' : 'radiant' }
      next.stage = 'loser_pick'
    }
    const { data } = await supabase.from('draft_rooms').update({ config: next }).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }

  async function loserChoose(choice) {
    const w = cfg.tossWinner, l = w === 'A' ? 'B' : 'A'
    const next = { ...cfg }
    if (cfg.stage === 'loser_side') next.sides = { [l]: choice, [w]: choice === 'radiant' ? 'dire' : 'radiant' }
    else next.pickOrder = { [l]: choice === 'first_pick' ? 'F' : 'S', [w]: choice === 'first_pick' ? 'S' : 'F' }
    const fSeat = Object.keys(next.pickOrder).find(k => next.pickOrder[k] === 'F')
    next.firstPickSide = next.sides[fSeat]
    next.stage = 'drafting'
    const { data } = await supabase.from('draft_rooms').update({
      config: next,
      radiant_name: (cfg.teamMeta?.[next.sides.A === 'radiant' ? 'A' : 'B']?.team) || (next.sides.A === 'radiant' ? 'Captain 1' : 'Captain 2'),
      dire_name: (cfg.teamMeta?.[next.sides.A === 'dire' ? 'A' : 'B']?.team) || (next.sides.A === 'dire' ? 'Captain 1' : 'Captain 2'),
      turn_started_at: new Date().toISOString(),
    }).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }

  async function confirmAction() {
    if (!selected || !myTurn || applying.current) return
    applying.current = true
    try {
      const overtime = Math.max(0, elapsed - stdSecs)
      const nextStep = step + 1
      const finishing = nextStep >= SEQUENCE.length
      const patch = {
        actions: [...room.actions, { order: step, type: current.type, team: current.team, side: currentSide, hero_id: selected.id, at: new Date().toISOString() }],
        current_step: nextStep,
        [reserveKey]: Math.max(0, room[reserveKey] - overtime),
        turn_started_at: new Date().toISOString(),
        pause_accum_seconds: 0,
      }
      if (finishing) { patch.status = 'completed'; patch.completed_at = new Date().toISOString() }
      const { data } = await supabase.from('draft_rooms').update(patch).eq('id', room.id).select().single()
      if (data) setRoom(data)
      setSelected(null)
    } finally { applying.current = false }
  }

  async function undo() {
    if (room.actions.length === 0) return
    const { data } = await supabase.from('draft_rooms').update({
      actions: room.actions.slice(0, -1), current_step: step - 1,
      status: 'drafting', completed_at: null, turn_started_at: new Date().toISOString(), pause_accum_seconds: 0,
    }).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }

  async function togglePause() {
    if (!paused) {
      const { data } = await supabase.from('draft_rooms').update({ paused: true, paused_at: new Date().toISOString() }).eq('id', room.id).select().single()
      if (data) setRoom(data)
    } else {
      const extra = room.paused_at ? Math.max(0, Math.floor((Date.now() - new Date(room.paused_at).getTime()) / 1000)) : 0
      const { data } = await supabase.from('draft_rooms').update({
        paused: false, paused_at: null, pause_accum_seconds: pauseAccum + extra,
      }).eq('id', room.id).select().single()
      if (data) setRoom(data)
    }
  }

  const pool = useMemo(() => {
    const q = search.trim().toLowerCase()
    const g = { str: [], agi: [], int: [], all: [] }
    for (const h of heroes) {
      if (q && !h.name.toLowerCase().includes(q)) continue
      ;(g[h.attr] || g.all).push(h)
    }
    return g
  }, [heroes, search])

  const lastAction = room.actions && room.actions.length ? room.actions[room.actions.length - 1] : null
  const lastActionHero = lastAction ? heroById(lastAction.hero_id) : null

  /* ── LOBBY: claim seats, then toss ── */
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
          <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => navigator.clipboard?.writeText(shareLink)}>Copy invite link</button>
        </div>
        <p className="small mute" style={{ textAlign: 'center' }}>Sides aren't decided yet — claim a captain seat, then flip the coin. Radiant/Dire and pick order come from the toss.</p>
        <div className="seat-grid">
          {['A', 'B'].map(seat => {
            const seatUser = seat === 'A' ? room.radiant_seat : room.dire_seat
            const isMe = seatUser === user.id
            const taken = !!seatUser
            return (
              <div key={seat} className={`seat ${taken ? 'taken' : ''} ${isMe ? 'seat-me' : ''}`}>
                <div style={{ fontWeight: 700 }}>{seatLabel(seat)}</div>
                <div className="st">
                  {taken ? (captains[seatUser] || 'Claimed') + (isMe ? ' (you)' : '') : 'Open'}
                  {seatPlayers(seat) && <div className="small mute" style={{ marginTop: 2 }}>{seatPlayers(seat)}</div>}
                </div>
                {!taken && !mySeatAB && <button className="btn sm" style={{ marginTop: 8 }} onClick={() => claim(seat)}>Claim</button>}
              </div>
            )
          })}
        </div>
        {mySeatAB && (
          <div className="card" style={{ background: 'var(--bg0)', margin: '10px 0' }}>
            <p className="small mute" style={{ marginTop: 0, marginBottom: 8 }}>Optional — name your team, and tap crew members to add them to your side. Shown to everyone in the room.</p>
            <input className="input" style={{ marginBottom: 8 }} placeholder="Team name (optional)"
              defaultValue={teamMeta[mySeatAB]?.team || ''} onChange={e => setNameDraft(n => ({ ...n, team: e.target.value }))} />
            <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {roster.map(p => {
                const mine = (teamMeta[mySeatAB]?.playerIds || []).includes(p.id)
                const otherSeat = mySeatAB === 'A' ? 'B' : 'A'
                const theirs = (teamMeta[otherSeat]?.playerIds || []).includes(p.id)
                return (
                  <button key={p.id} className={`btn sm ${mine ? '' : 'ghost'}`} disabled={theirs}
                    style={theirs ? { opacity: 0.35 } : {}}
                    onClick={() => togglePlayer(p.id)}>
                    {p.name}
                  </button>
                )
              })}
            </div>
            <button className="btn sm" onClick={saveNames}>Save team name</button>
          </div>
        )}
        {mySeatAB && (
          <div className="toss-wrap" style={{ paddingTop: 6 }}>
            <div className={`coin ${spinning ? 'spin' : ''}`}>{spinning ? '' : 'Toss'}</div>
            <button className="btn" onClick={startToss} disabled={!bothSeated || spinning || heroes.length === 0}>
              {heroes.length === 0 ? 'Loading heroes…' : !bothSeated ? 'Waiting for both captains…' : spinning ? 'Flipping…' : 'Flip coin & begin'}
            </button>
          </div>
        )}
        {!mySeatAB && <div className="waiting-lock">Spectating — waiting for the captains to begin…</div>}
        <ChatPanel chat={chat} chatText={chatText} setChatText={setChatText} sendChat={sendChat} chatEnd={chatEnd} myId={user.id} />
      </div>
    )
  }

  /* ── TOSS CHOICES ── */
  if (stage === 'winner_choice' || stage === 'loser_side' || stage === 'loser_pick') {
    const teamMeta = cfg.teamMeta || {}
    const lbl = seat => teamMeta[seat]?.team?.trim() || `Captain ${seat === 'A' ? 1 : 2}`
    const winnerLabel = lbl(cfg.tossWinner)
    const loserLabel = lbl(cfg.tossWinner === 'A' ? 'B' : 'A')
    const iWon = mySeatAB === cfg.tossWinner
    const iLost = mySeatAB && mySeatAB !== cfg.tossWinner
    const plist = seat => teamMeta[seat]?.players?.trim() || ''
    return (
      <div className="card toss-wrap">
        <div className="row" style={{ justifyContent: 'center', gap: 20, marginBottom: 8, flexWrap: 'wrap' }}>
          {['A', 'B'].map(seat => (
            <div key={seat} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700 }}>{lbl(seat)}{captains[seat === 'A' ? room.radiant_seat : room.dire_seat] ? ` · ${captains[seat === 'A' ? room.radiant_seat : room.dire_seat]}` : ''}</div>
              {plist(seat) && <div className="small mute">{plist(seat)}</div>}
            </div>
          ))}
        </div>
        <div className="coin">{winnerLabel}</div>
        <h2 style={{ marginBottom: 4 }}>{winnerLabel} wins the toss</h2>
        {stage === 'winner_choice' && (iWon ? (
          <>
            <p className="small mute">Choose one advantage — {loserLabel} gets the other category.</p>
            <div className="choice-grid">
              <button className="btn" onClick={() => winnerChoose('first_pick')}>First pick</button>
              <button className="btn" onClick={() => winnerChoose('last_pick')}>Last pick</button>
              <button className="btn" onClick={() => winnerChoose('radiant')}>Radiant</button>
              <button className="btn" onClick={() => winnerChoose('dire')}>Dire</button>
            </div>
          </>
        ) : <div className="waiting-lock">Waiting for {winnerLabel} to choose…</div>)}
        {stage === 'loser_side' && (iLost ? (
          <>
            <p className="small mute">{winnerLabel} took {cfg.winnerChoice === 'first_pick' ? 'first pick' : 'last pick'}. Choose your side.</p>
            <div className="choice-grid">
              <button className="btn" onClick={() => loserChoose('radiant')}>Radiant</button>
              <button className="btn" onClick={() => loserChoose('dire')}>Dire</button>
            </div>
          </>
        ) : <div className="waiting-lock">Waiting for {loserLabel} to choose a side…</div>)}
        {stage === 'loser_pick' && (iLost ? (
          <>
            <p className="small mute">{winnerLabel} took {cfg.winnerChoice}. Choose pick order.</p>
            <div className="choice-grid">
              <button className="btn" onClick={() => loserChoose('first_pick')}>First pick</button>
              <button className="btn" onClick={() => loserChoose('last_pick')}>Last pick</button>
            </div>
          </>
        ) : <div className="waiting-lock">Waiting for {loserLabel} to choose pick order…</div>)}
        <ChatPanel chat={chat} chatText={chatText} setChatText={setChatText} sendChat={sendChat} chatEnd={chatEnd} myId={user.id} />
      </div>
    )
  }

  /* ── DRAFTING ── */
  const radiantSeatAB = cfg.sides?.A === 'radiant' ? 'A' : 'B'
  const direSeatAB = cfg.sides?.A === 'dire' ? 'A' : 'B'
  const radiantLabel = seatLabel(radiantSeatAB)
  const direLabel = seatLabel(direSeatAB)
  const seatUserId = seat => (seat === 'A' ? room.radiant_seat : room.dire_seat)
  const radiantCaptain = captains[seatUserId(radiantSeatAB)] || ''
  const direCaptain = captains[seatUserId(direSeatAB)] || ''
  const radiantPlayers = seatPlayers(radiantSeatAB)
  const direPlayers = seatPlayers(direSeatAB)

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="eyebrow grow">Room {room.code} · you are {mySide ? mySide + ' captain' : 'spectating'}</div>
        {mySide && !done && <button className="btn sm ghost" onClick={togglePause}>{paused ? 'Resume' : 'Pause'}</button>}
        <button className="btn sm ghost" onClick={onExit}>Leave</button>
      </div>

      {paused && !done && <div className="notice" style={{ marginBottom: 10, textAlign: 'center' }}>⏸ Draft paused for both captains</div>}

      <div className="draft-top">
        <div className={`dt-team ${currentSide === 'radiant' ? 'turn' : ''}`}>
          <div className="nm radiant">{radiantLabel}</div>
          <div className="tag">Radiant{cfg.firstPickSide === 'radiant' ? ' · first pick' : ''}</div>
          {radiantCaptain && <div className="small" style={{ marginTop: 3, fontWeight: 600 }}>👑 {radiantCaptain}</div>}
          {radiantPlayers && <div className="small" style={{ marginTop: 3, fontWeight: 600, lineHeight: 1.4 }}>{radiantPlayers}</div>}
        </div>
        <div className="dt-clock">
          {!done ? (
            <>
              <div className={`t num ${turnLeft === 0 && reserveNow < 30 ? 'low' : ''}`}>
                {turnLeft > 0 ? `0:${String(turnLeft).padStart(2, '0')}` : `${Math.floor(reserveNow / 60)}:${String(reserveNow % 60).padStart(2, '0')}`}
              </div>
              <div className="mode">{paused ? 'Paused' : turnLeft > 0 ? 'Captains Mode' : 'Reserve'}</div>
              <div className="reserve-row">
                <span className="reserve-chip">R <b className="num">{Math.floor(room.radiant_reserve_seconds / 60)}:{String(room.radiant_reserve_seconds % 60).padStart(2, '0')}</b></span>
                <span className="reserve-chip">D <b className="num">{Math.floor(room.dire_reserve_seconds / 60)}:{String(room.dire_reserve_seconds % 60).padStart(2, '0')}</b></span>
              </div>
            </>
          ) : <div className="t" style={{ color: 'var(--gold)' }}>GG</div>}
        </div>
        <div className={`dt-team right ${currentSide === 'dire' ? 'turn' : ''}`}>
          <div className="nm dire">{direLabel}</div>
          <div className="tag">Dire{cfg.firstPickSide === 'dire' ? ' · first pick' : ''}</div>
          {direCaptain && <div className="small" style={{ marginTop: 3, fontWeight: 600 }}>👑 {direCaptain}</div>}
          {direPlayers && <div className="small" style={{ marginTop: 3, fontWeight: 600, lineHeight: 1.4 }}>{direPlayers}</div>}
        </div>
      </div>

      {!done && current && <div className="phase-banner">{phaseLabel(step)} — <b style={{ textTransform: 'capitalize' }}>{currentSide}</b> to {current.type} · slot {step + 1}/24</div>}
      {done && <div className="phase-banner">Draft complete · saved to history</div>}
      {!done && !myTurn && mySide && <div className="waiting-lock">Waiting for {currentSide} to {current?.type}…</div>}
      {!done && !mySide && <div className="waiting-lock">Spectating — {currentSide} to {current?.type}</div>}

      <div className="draft-layout">
        <div>
          {myTurn && !done && (
            <div className="row" style={{ marginBottom: 8 }}>
              <div className="grow small" style={{ color: 'var(--gold)', fontWeight: 600 }}>
                {selected ? `${current.type === 'ban' ? 'Ban' : 'Pick'} ${selected.name}?` : `Your turn to ${current.type}`}
              </div>
              {selected && <button className="btn sm ghost" onClick={() => setSelected(null)}>Cancel</button>}
              <button className="btn sm" disabled={!selected || paused} onClick={confirmAction}>Confirm</button>
              <button className="btn sm ghost" onClick={undo} disabled={room.actions.length === 0}>Undo</button>
            </div>
          )}
          <input className="input" style={{ marginBottom: 10 }} placeholder="Search heroes…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="pool">
            {ATTRS.map(([key, label]) => (
              <div key={key} className={`attr ${key}`}>
                <h3>{label}</h3>
                <div className="attr-grid">
                  {pool[key].map(h => (
                    <button key={h.id} className={`hero ${taken.has(h.id) ? 'gone' : ''} ${selected?.id === h.id ? 'picked' : ''}`}
                      onClick={() => myTurn && !paused && setSelected(h)} disabled={!myTurn || paused} title={h.name}>
                      <img src={h.img} alt={h.name} loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <Board room={room} step={step} heroById={heroById} sideOfTeam={sideOfTeam} />
      </div>

      {lastActionHero && (
        <div className="last-action-strip">
          <img src={lastActionHero.img} alt="" />
          <span><b style={{ textTransform: 'capitalize' }}>{lastAction.side}</b> {lastAction.type === 'ban' ? 'banned' : 'picked'} <b>{lastActionHero.name}</b></span>
        </div>
      )}
      <ChatPanel chat={chat} chatText={chatText} setChatText={setChatText} sendChat={sendChat} chatEnd={chatEnd} myId={user.id} />
    </div>
  )
}

function ChatPanel({ chat, chatText, setChatText, sendChat, chatEnd, myId }) {
  return (
    <div className="card" style={{ marginTop: 12, padding: 12 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Room chat</div>
      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {chat.length === 0 && <div className="small mute">No messages yet. Say hi.</div>}
        {chat.map(m => (
          <div key={m.id} className="small" style={{ lineHeight: 1.4 }}>
            <b style={{ color: m.sender_id === myId ? 'var(--gold)' : 'var(--radiant)' }}>{m.sender_name}</b>
            <span className="mute num" style={{ marginLeft: 6, fontSize: 10 }}>
              {new Date(m.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div>{m.body}</div>
          </div>
        ))}
        <div ref={chatEnd} />
      </div>
      <div className="row">
        <input className="input grow" placeholder="Message the room…" value={chatText}
          onChange={e => setChatText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendChat() }} maxLength={500} />
        <button className="btn sm" onClick={sendChat} disabled={!chatText.trim()}>Send</button>
      </div>
    </div>
  )
}

function Board({ room, step, heroById, sideOfTeam }) {
  const bySlot = Object.fromEntries((room.actions || []).map(a => [a.order, a]))
  return (
    <div className="board">
      <div className="board-head"><div className="nm" style={{ color: 'var(--radiant)' }}>Radiant</div><div /><div className="nm" style={{ color: 'var(--dire-hi)' }}>Dire</div></div>
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
      <div className="row" style={{ marginBottom: 10 }}><h2 className="grow" style={{ marginBottom: 0 }}>{room.code}</h2><button className="btn sm ghost" onClick={onBack}>Back</button></div>
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
