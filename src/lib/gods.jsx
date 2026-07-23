// Greek god personas for the crew — flat 2D symbol icons, no background circle.
// Each entry: default owner (by roster name), a distinctive line-icon, and an accent color.
export const GODS = [
  { key: 'zeus', title: 'Zeus', color: '#818cf8', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M13 2 4 14h6l-2 8 10-13h-6l1-7z" /></svg>) },
  { key: 'poseidon', title: 'Poseidon', color: '#22d3ee', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M11 2v6H8l4 5 4-5h-3V2h-2zM11 13v9h2v-9h-2zM6 15c1 2 3 3 6 3s5-1 6-3l-1.5-1c-.8 1.3-2.3 2-4.5 2s-3.7-.7-4.5-2L6 15z" /></svg>) },
  { key: 'apollo', title: 'Apollo', color: '#fbbf24', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="4" fill="currentColor" /><g stroke="currentColor" strokeWidth="1.6"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></g></svg>) },
  { key: 'ares', title: 'Ares', color: '#f87171', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M14 2h8v8h-2V5.4l-6.3 6.3-1.4-1.4L18.6 4H14V2zM4 22l7-7-1-1-7 7v1h1z" /><path fill="currentColor" d="m11.5 9.5 3 3-7 7-3-3z" /></svg>) },
  { key: 'achilles', title: 'Achilles', color: '#d97706', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M12 2 3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4zm0 2.2 7 3.1v4.4c0 3.8-2.9 6.6-7 8-4.1-1.4-7-4.2-7-8V7.3l7-3.1z" /><path fill="currentColor" d="M11 8h2v6h-2z" /></svg>) },
  { key: 'odysseus', title: 'Odysseus', color: '#34d399', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M3 13c4-8 12-11 18-10-3 3-3 6-6 6-1 3-4 5-8 5l-4-1z" /><path fill="currentColor" d="M2 21 12 11l1.5 1.5L3.5 22.5z" /></svg>) },
  { key: 'hermes', title: 'Hermes', color: '#a78bfa', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M12 2c-3 0-5 2-5 5h2c0-1.7 1.3-3 3-3s3 1.3 3 3h2c0-3-2-5-5-5z" /><path fill="currentColor" d="M6 9h12l-1 4H7L6 9zm2 6h8l-1 4H9l-1-4z" /><path fill="currentColor" d="M3 7c1.5 0 3 .8 3 2H4c0-.6-.5-1-1-1V7zm18 0c-1.5 0-3 .8-3 2h2c0-.6.5-1 1-1V7z" /></svg>) },
  { key: 'hephaestus', title: 'Hephaestus', color: '#fb923c', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M14 2 3 13l2 2 3-3v9h2v-9l3 3 2-2z" /><path fill="currentColor" d="m15 3 6 6-2 2-6-6z" /></svg>) },
  { key: 'hades', title: 'Hades', color: '#818cf8', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M12 2C7 2 4 5.5 4 10c0 4 2.2 7 4.5 9.5.6-1.5 1-3 1-4.5 0-1-.3-1.8-.7-2.5.9.4 1.6 1.2 2.2 2.5.6-1.3 1.3-2.1 2.2-2.5-.4.7-.7 1.5-.7 2.5 0 1.5.4 3 1 4.5C19.8 17 22 14 22 10c0-4.5-3-8-10-8zm-3 6a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" /></svg>) },
  { key: 'perseus', title: 'Perseus', color: '#67e8f9', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M4 4c4 0 6 3 6 7 0 3-1.5 5-4 6l-2-2c2-.7 3.2-2 3.5-4C6.5 12.5 4 11.5 4 8V4z" /><path fill="currentColor" d="M13 5 20 12l-1.5 1.5L11 6.5z" /><circle cx="18.5" cy="10.5" r="1.3" fill="currentColor" /></svg>) },
  { key: 'dionysus', title: 'Dionysus', color: '#e879f9', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><g fill="currentColor"><circle cx="9" cy="15" r="2.3" /><circle cx="13" cy="17" r="2.3" /><circle cx="11" cy="11" r="2.3" /><circle cx="15" cy="12" r="2.3" /><path d="M11 4c1 2 0 4-1 5l-1.5-1c1-1 1.5-2.5 1-3.7L11 4z" /></g></svg>) },
  { key: 'pan', title: 'Pan', color: '#a3e635', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M4 6c2-2 5-2 6 0l1 2 1-2c1-2 4-2 6 0-1 4-3 6-7 6S5 10 4 6z" /><path fill="currentColor" d="M6 14v6h2v-5l2 1v-2l-2-1-2 1zm10 0v6h-2v-5l-2 1v-2l2-1 2 1z" /></svg>) },
  { key: 'morpheus', title: 'Morpheus', color: '#818cf8', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M14 3a9 9 0 100 18 9 9 0 01-4-17c1.2 0 2.4.2 4-1z" /><circle cx="17" cy="6" r="1" fill="currentColor" /><circle cx="19" cy="9" r=".7" fill="currentColor" /></svg>) },
  { key: 'atlas', title: 'Atlas', color: '#9ca3af', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" /><path fill="currentColor" d="M8.5 22c.5-4 1.5-6 3.5-8 2 2 3 4 3.5 8h-7z" /><path stroke="currentColor" strokeWidth="1.4" fill="none" d="M6 9h12M12 3v12" /></svg>) },
  { key: 'athena', title: 'Athena', color: '#93c5fd', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M12 2 5 6v6c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6l-7-4zm-1 6h2v4h3l-4 5-4-5h3V8z" /></svg>) },
]

// Default assignments — Haris can reshuffle any player's god from their profile.
export const GOD_MAP = {
  'Vibe': 'zeus',
  '@RR0W™': 'odysseus',
  'Hysterical': 'ares',
  'DotaKing™': 'achilles',
  'Usama': 'poseidon',
  'A™': 'athena',
  'Ryse': 'hermes',
  'Troublemaker': 'hephaestus',
  'DarkLord™': 'hades',
  'Cormac': 'perseus',
  'Danish': 'dionysus',
  'DankShomu': 'pan',
  'Shady': 'morpheus',
  'Zain': 'atlas',
}

export function godByKey(key) {
  return GODS.find(g => g.key === key) || null
}

// player: { name, god_key? } — god_key from DB wins, else the default map, else null.
export function godOf(player) {
  const name = typeof player === 'string' ? player : player?.name
  const key = (typeof player === 'object' && player?.god_key) || GOD_MAP[name] || null
  return (key && godByKey(key)) || { key: null, title: 'Titan', color: '#94a3b8', Icon: p => <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M4 20V9l8-5 8 5v11h-3v-6H7v6H4z" /></svg> }
}

export function GodAvatar({ player, size = 34, showName = false }) {
  const name = typeof player === 'string' ? player : player?.name
  const g = godOf(player)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <g.Icon width={size} height={size} style={{ color: g.color, flexShrink: 0 }} />
      {showName && (
        <span style={{ lineHeight: 1.2 }}>
          <span style={{ fontWeight: 600 }}>{name}</span>
          <span className="small mute" style={{ display: 'block', fontSize: 11 }}>{g.title}</span>
        </span>
      )}
    </span>
  )
}

// Tap-to-pick god selector. Excludes gods already claimed by other players.
export function GodPicker({ player, allPlayers, onPick }) {
  const takenKeys = new Set(allPlayers.filter(p => p.id !== player.id).map(p => (p.god_key || GOD_MAP[p.name])).filter(Boolean))
  const current = godOf(player).key
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
      {GODS.map(g => {
        const taken = takenKeys.has(g.key) && g.key !== current
        return (
          <button key={g.key} disabled={taken} onClick={() => onPick(g.key)}
            className={`btn sm ${current === g.key ? '' : 'ghost'}`}
            style={{ opacity: taken ? 0.3 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <g.Icon width={16} height={16} style={{ color: g.color }} />
            {g.title}
          </button>
        )
      })}
    </div>
  )
}

