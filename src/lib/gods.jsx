// Greek god personas for the crew — flat 2D symbol icons, no background circle.
// Each entry: default owner (by roster name), a distinctive line-icon, and an accent color.
import { useState } from 'react'

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
  // ── Norse ──
  { key: 'odin', title: 'Odin', color: '#cbd5e1', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /></svg>) },
  { key: 'thor', title: 'Thor', color: '#60a5fa', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M5 4h14v7h-4v9h-6v-9H5V4zm2 2v3h4v9h2V9h4V6H7z" /></svg>) },
  { key: 'loki', title: 'Loki', color: '#4ade80', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M12 3c-2 3-6 3-6 8 0 3 2 6 6 10 4-4 6-7 6-10 0-5-4-5-6-8zm0 5c1.5 1.5 3 2.5 3 4.5S13.5 17 12 18.5 9 14.5 9 12.5 10.5 9.5 12 8z" /></svg>) },
  { key: 'freya', title: 'Freya', color: '#f9a8d4', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M12 21C7 16.5 4 13.5 4 10a4.5 4.5 0 018-3 4.5 4.5 0 018 3c0 3.5-3 6.5-8 11z" /><circle cx="12" cy="10" r="2" fill="#0D0B14" /></svg>) },
  // ── Egyptian ──
  { key: 'anubis', title: 'Anubis', color: '#a1a1aa', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M7 2l3 5 2-2 2 2 3-5 1 8c0 3-1.5 5-4 6v5h-4v-5c-2.5-1-4-3-4-6l1-8z" /></svg>) },
  { key: 'ra', title: 'Ra', color: '#facc15', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="10" r="4" fill="currentColor" /><circle cx="12" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" /><path fill="currentColor" d="M11 18h2v4h-2z" /></svg>) },
  { key: 'horus', title: 'Horus', color: '#38bdf8', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M2 9c4-3 8-4 12-3 3 .7 6 .5 8-1-1 4-4 6-8 6h-2c1.5 2 1 4-1 6-.5-2-1.7-3.4-3.5-4C5.5 12.4 3.5 11 2 9zm12 5c2 1 3 3 3 6-2-1-3.5-3-3-6z" /></svg>) },
  { key: 'isis', title: 'Isis', color: '#c4b5fd', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M12 4a4 4 0 014 4v2h3l-2 3h-1v7h-8v-7H7l-2-3h3V8a4 4 0 014-4zm0 2a2 2 0 00-2 2v2h4V8a2 2 0 00-2-2z" /></svg>) },
  // ── Insignias ──
  { key: 'spartan', title: 'Spartan', color: '#e5e7eb', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M12 1c1 2.5 1.6 4.5 1.6 6.5h2.2c.5-1.5 1.5-2.5 3.2-3-.6 1.8-.8 3.4-.5 5 .3 2-.2 3.8-1.5 5.3V20l-2.5 3v-6.2c.8-.9 1.2-2 1.2-3.3h-3V9.7h-1.4v3.8h-3c0 1.3.4 2.4 1.2 3.3V23L7 20v-5.2C5.7 13.3 5.2 11.5 5.5 9.5c.3-1.6.1-3.2-.5-5 1.7.5 2.7 1.5 3.2 3h2.2C10.4 5.5 11 3.5 12 1z" /></svg>) },
  { key: 'ace', title: 'Ace', color: '#f8fafc', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M12 2c2.5 4 7 6.5 7 10.5 0 2.5-2 4.5-4.5 4.5-1 0-1.8-.3-2.5-.8.3 1.8 1 3.1 2 3.8h-4c1-.7 1.7-2 2-3.8-.7.5-1.5.8-2.5.8C7 17 5 15 5 12.5 5 8.5 9.5 6 12 2z" /></svg>) },
  { key: 'crown', title: 'Crown', color: '#fbbf24', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M3 7l4.5 4L12 4l4.5 7L21 7l-1.5 11h-15L3 7zm2.7 13h12.6v2H5.7v-2z" /></svg>) },
  { key: 'phoenix', title: 'Phoenix', color: '#fb923c', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M12 2c.5 2.5 2 4 4.5 4.5C14 8 13 10 13.5 12.5 16 11 19 11 22 12.5c-2.5 1-4 2.5-4.5 5-1.5-2-3.3-3-5.5-3s-4 1-5.5 3C6 15 4.5 13.5 2 12.5 5 11 8 11 10.5 12.5 11 10 10 8 7.5 6.5 10 6 11.5 4.5 12 2zm0 14c1.5 0 2.8.8 3.7 2.3L12 23l-3.7-4.7C9.2 16.8 10.5 16 12 16z" /></svg>) },
  { key: 'dragon', title: 'Dragon', color: '#34d399', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M20 4c-4 0-6.5 1.5-8 4-1-1.5-2.7-2.3-5-2.5L8.5 8C6 8.7 4.3 10.5 3.5 13.5c2-1 3.8-1.2 5.5-.7-1.8 1.5-2.7 3.6-2.5 6.2 1.5-2 3.2-3 5.2-3.2.5 2.2 1.9 4 4.3 5.2-.7-2-.8-3.8-.2-5.5 2.2 1 4.3.8 6.2-.5-2.3-.5-3.9-1.5-4.7-3.2 1.7-.4 3-1.4 3.7-3-1.8.4-3.3.2-4.5-.5C17.8 7.2 19 5.8 20 4zm-9.5 8a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" /></svg>) },
  { key: 'wolf', title: 'Wolf', color: '#94a3b8', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M4 3l4 3h8l4-3-1 6c1 2 1 4-.5 6L14 22h-4l-4.5-4C4 16 4 14 5 12L4 3zm5 8a1.3 1.3 0 100 2.6A1.3 1.3 0 009 11zm6 0a1.3 1.3 0 100 2.6A1.3 1.3 0 0015 11zm-3 4l1.5 2h-3L12 15z" /></svg>) },
  { key: 'reaper', title: 'Reaper', color: '#a78bfa', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M12 2a7 7 0 00-7 7c0 2 .7 3.6 2 4.8V22l2.5-2 2.5 2 2.5-2 2.5 2v-8.2c1.3-1.2 2-2.8 2-4.8a7 7 0 00-7-7zM9.5 8a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm5 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" /></svg>) },
  { key: 'katana', title: 'Katana', color: '#f87171', Icon: p => (
    <svg viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M21 2c-5 1-9.5 3.5-13.5 7.5L9 11 21 2zM7 12l-1.5-1.5-2 2L5 14l-2.5 2.5L4 18l2.5-2.5L8 17l1.5-2L8 13.5 19 5 7 12z" /></svg>) },
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
  const url = typeof player === 'object' ? player?.avatar_url : null
  const g = godOf(player)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {url
        ? <img src={url} alt="" style={{ width: size, height: size, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
        : <g.Icon width={size} height={size} style={{ color: g.color, flexShrink: 0 }} />}
      {showName && (
        <span style={{ lineHeight: 1.2 }}>
          <span style={{ fontWeight: 600 }}>{name}</span>
          {!url && <span className="small mute" style={{ display: 'block', fontSize: 11 }}>{g.title}</span>}
        </span>
      )}
    </span>
  )
}

// Profile background themes — subtle gradients.
export const THEMES = [
  { key: null, name: 'None', bg: 'transparent' },
  { key: 'indigo', name: 'Indigo', bg: 'radial-gradient(ellipse at top, rgba(99,102,241,0.22), transparent 65%)' },
  { key: 'navy', name: 'Navy Blue', bg: 'radial-gradient(ellipse at top, rgba(30,58,138,0.35), transparent 65%)' },
  { key: 'neonpink', name: 'Neon Pink', bg: 'radial-gradient(ellipse at top, rgba(236,72,153,0.20), transparent 65%)' },
  { key: 'emerald', name: 'Emerald', bg: 'radial-gradient(ellipse at top, rgba(16,185,129,0.20), transparent 65%)' },
  { key: 'crimson', name: 'Crimson', bg: 'radial-gradient(ellipse at top, rgba(220,38,38,0.22), transparent 65%)' },
  { key: 'gold', name: 'Gold', bg: 'radial-gradient(ellipse at top, rgba(245,158,11,0.20), transparent 65%)' },
  { key: 'violet', name: 'Violet', bg: 'radial-gradient(ellipse at top, rgba(139,92,246,0.22), transparent 65%)' },
]
export function themeOf(player) {
  return THEMES.find(t => t.key === player?.theme_key) || THEMES[0]
}

// Tabbed avatar picker: built-in icons, Dota hero portraits, or a custom image URL.
// onPick receives a patch object: { god_key, avatar_url } — write both columns.
export function GodPicker({ player, allPlayers, heroes = [], onPick }) {
  const [tab, setTab] = useState('icons')
  const [heroSearch, setHeroSearch] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const takenKeys = new Set(allPlayers.filter(p => p.id !== player.id).map(p => (p.avatar_url ? null : (p.god_key || GOD_MAP[p.name]))).filter(Boolean))
  const current = player?.avatar_url ? null : godOf(player).key
  const shownHeroes = heroes.filter(h => h.name.toLowerCase().includes(heroSearch.toLowerCase())).slice(0, 30)
  return (
    <div>
      <div className="seg" style={{ marginBottom: 10 }}>
        {[['icons', 'Icons'], ['dota', 'Dota heroes'], ['custom', 'Custom']].map(([id, label]) =>
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === 'icons' && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {GODS.map(g => {
            const taken = takenKeys.has(g.key) && g.key !== current
            return (
              <button key={g.key} disabled={taken} onClick={() => onPick({ god_key: g.key, avatar_url: null })}
                className={`btn sm ${current === g.key ? '' : 'ghost'}`}
                style={{ opacity: taken ? 0.3 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <g.Icon width={16} height={16} style={{ color: g.color }} />
                {g.title}
              </button>
            )
          })}
        </div>
      )}
      {tab === 'dota' && (
        <>
          <input className="input" style={{ marginBottom: 10 }} placeholder="Search heroes…" value={heroSearch} onChange={e => setHeroSearch(e.target.value)} />
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {shownHeroes.map(h => (
              <button key={h.id} className={`btn sm ${player?.avatar_url === h.img ? '' : 'ghost'}`}
                onClick={() => onPick({ avatar_url: h.img })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
                <img src={h.icon} alt="" style={{ width: 20, height: 20 }} />
                {h.name}
              </button>
            ))}
          </div>
        </>
      )}
      {tab === 'custom' && (
        <>
          <p className="small mute" style={{ marginTop: 0 }}>Paste a direct image link (ends in .png/.jpg). It becomes your profile picture everywhere.</p>
          <div className="row">
            <input className="input grow" placeholder="https://…/me.png" value={customUrl} onChange={e => setCustomUrl(e.target.value)} />
            <button className="btn sm" disabled={!customUrl.trim().startsWith('http')} onClick={() => onPick({ avatar_url: customUrl.trim() })}>Use</button>
          </div>
          {player?.avatar_url && <button className="btn sm ghost" style={{ marginTop: 10 }} onClick={() => onPick({ avatar_url: null })}>Remove custom picture</button>}
        </>
      )}
    </div>
  )
}

export function ThemePicker({ player, onPick }) {
  const current = themeOf(player).key
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
      {THEMES.map(t => (
        <button key={t.key || 'none'} className={`btn sm ${current === t.key ? '' : 'ghost'}`} onClick={() => onPick(t.key)}>
          {t.name}
        </button>
      ))}
    </div>
  )
}

