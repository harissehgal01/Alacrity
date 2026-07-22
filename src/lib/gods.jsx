// Greek god personas for the crew. Deterministic colors per god.
// Haris can remap anyone — edit GOD_MAP by roster name.
export const GOD_MAP = {
  '@RR0W™': { god: 'Zeus', emoji: '⚡', c1: '#4f46e5', c2: '#818cf8' },
  'Hysterical': { god: 'Ares', emoji: '⚔️', c1: '#b91c1c', c2: '#f87171' },
  'Vibe': { god: 'Apollo', emoji: '☀️', c1: '#d97706', c2: '#fbbf24' },
  'DotaKing™': { god: 'Achilles', emoji: '🛡️', c1: '#92400e', c2: '#d97706' },
  'Usama': { god: 'Poseidon', emoji: '🔱', c1: '#0e7490', c2: '#22d3ee' },
  'A™': { god: 'Odysseus', emoji: '🏹', c1: '#065f46', c2: '#34d399' },
  'Ryse': { god: 'Hermes', emoji: '🪽', c1: '#6d28d9', c2: '#a78bfa' },
  'Troublemaker': { god: 'Hephaestus', emoji: '🔨', c1: '#9a3412', c2: '#fb923c' },
  'DarkLord™': { god: 'Hades', emoji: '💀', c1: '#1e1b4b', c2: '#6366f1' },
  'Cormac': { god: 'Perseus', emoji: '🐍', c1: '#155e75', c2: '#67e8f9' },
  'Danish': { god: 'Dionysus', emoji: '🍇', c1: '#86198f', c2: '#e879f9' },
  'DankShomu': { god: 'Pan', emoji: '🎶', c1: '#3f6212', c2: '#a3e635' },
  'Shady': { god: 'Morpheus', emoji: '🌙', c1: '#312e81', c2: '#818cf8' },
  'Zain': { god: 'Atlas', emoji: '🌍', c1: '#374151', c2: '#9ca3af' },
}

export function godOf(name) {
  return GOD_MAP[name] || { god: 'Titan', emoji: '🏛️', c1: '#334155', c2: '#94a3b8' }
}

export function GodAvatar({ name, size = 36, showName = false }) {
  const g = godOf(name)
  const initials = (name || '?').replace(/[^A-Za-z0-9@]/g, '').slice(0, 2).toUpperCase()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span title={`${name} · ${g.god}`} style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: `linear-gradient(135deg, ${g.c1}, ${g.c2})`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.42, fontWeight: 700, color: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
      }}>{g.emoji}</span>
      {showName && (
        <span style={{ lineHeight: 1.2 }}>
          <span style={{ fontWeight: 600 }}>{name}</span>
          <span className="small mute" style={{ display: 'block', fontSize: 11 }}>{g.god} · {initials}</span>
        </span>
      )}
    </span>
  )
}
