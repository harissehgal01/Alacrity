import { useMemo, useState } from 'react'
import { filterBySeason, heroStats, fmt } from '../lib/stats'
import { seasonTotals, seasonAwards, duoSynergy, singleGameRecords, playerCards } from '../lib/recap'
import { puncByPlayer, puncInSeason, tierColor } from '../lib/punctuality'
import { GodAvatar, themeOf } from '../lib/gods'

const hms = s => {
  if (s == null) return '—'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m`
}
const dur = s => s == null ? '—' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
const shortDate = iso => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

const APP_URL = 'https://alacrity-gray.vercel.app/'
const slug = s => (s || 'player').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'player'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
function hexA(hex, a) {
  const m = (hex || '#5B7CFF').replace('#', '')
  const n = m.length === 3 ? m.split('').map(c => c + c).join('') : m
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}
function initials(name) {
  const parts = (name || '?').replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return (name || '?').slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// Draw a self-contained share card to a PNG blob. Everything is drawn (no
// external images) so there are no CORS/taint issues on export.
async function renderCardImage(card, season) {
  try {
    const { player, s, signature, title, titleEmoji, bestGame } = card
    const accent = themeOf(player).accent || '#5B7CFF'
    const W = 1080, H = 1350, pad = 84
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    try { await document.fonts.ready } catch { /* fonts optional */ }
    const F = (w, size) => `${w} ${size}px Outfit, system-ui, sans-serif`

    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#121820'); bg.addColorStop(1, '#0A0E13')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
    const glow = ctx.createRadialGradient(W * 0.22, 40, 0, W * 0.22, 40, W)
    glow.addColorStop(0, hexA(accent, 0.30)); glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2
    roundRect(ctx, 20, 20, W - 40, H - 40, 30); ctx.stroke()

    ctx.fillStyle = accent; ctx.font = F(700, 27); ctx.fillText('ALACRITY DOTA', pad, 122)
    ctx.fillStyle = '#93A0AF'; ctx.font = F(500, 27); ctx.fillText(`${season ? season.name + ' · ' : ''}Season Recap`, pad, 160)

    const cx = pad + 70, cy = 300, r = 70
    const ag = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
    ag.addColorStop(0, accent); ag.addColorStop(1, hexA(accent, 0.5))
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#0A0E13'; ctx.font = F(800, 56); ctx.textAlign = 'center'
    ctx.fillText(initials(player.name), cx, cy + 20); ctx.textAlign = 'left'

    ctx.fillStyle = '#EEF2F7'; ctx.font = F(800, 74); ctx.fillText(player.name, pad + 168, cy - 4)
    ctx.fillStyle = accent; ctx.font = F(600, 34); ctx.fillText(`${titleEmoji} ${title}`, pad + 168, cy + 46)

    const tiles = [[`${s.games}`, 'GAMES'], [`${Math.round(s.winRate * 100)}%`, 'WIN RATE'], [s.kda.toFixed(2), 'KDA']]
    const tw = (W - pad * 2 - 32) / 3, ty = 438, th = 150
    tiles.forEach((t, i) => {
      const tx = pad + i * (tw + 16)
      ctx.fillStyle = 'rgba(255,255,255,0.045)'; roundRect(ctx, tx, ty, tw, th, 18); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1.5; roundRect(ctx, tx, ty, tw, th, 18); ctx.stroke()
      ctx.fillStyle = '#EEF2F7'; ctx.font = F(800, 58); ctx.textAlign = 'center'; ctx.fillText(t[0], tx + tw / 2, ty + 82)
      ctx.fillStyle = '#93A0AF'; ctx.font = F(600, 23); ctx.fillText(t[1], tx + tw / 2, ty + 120); ctx.textAlign = 'left'
    })

    const rows = [
      ['Record', `${s.wins}-${s.losses}`],
      signature ? ['Signature hero', `${signature} ×${card.signatureGames}`] : null,
      ['Hero pool', `${s.versatility} heroes`],
      bestGame ? ['Best game', `${bestGame.kills} kills · ${bestGame.hero}`] : null,
      card.punc ? ['Punctuality', `${Math.round((card.punc.onTimeRate || 0) * 100)}% on time · ${Math.round(card.punc.avg || 0)}m late`] : null,
    ].filter(Boolean)
    let ry = 706
    rows.forEach(([k, v]) => {
      ctx.fillStyle = '#93A0AF'; ctx.font = F(500, 32); ctx.textAlign = 'left'; ctx.fillText(k, pad, ry)
      ctx.fillStyle = '#EEF2F7'; ctx.font = F(700, 32); ctx.textAlign = 'right'; ctx.fillText(v, W - pad, ry); ctx.textAlign = 'left'
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.beginPath(); ctx.moveTo(pad, ry + 26); ctx.lineTo(W - pad, ry + 26); ctx.stroke()
      ry += 84
    })

    ctx.fillStyle = accent; ctx.font = F(700, 30); ctx.textAlign = 'center'
    ctx.fillText('alacrity-gray.vercel.app', W / 2, H - 92); ctx.textAlign = 'left'

    return await new Promise(res => canvas.toBlob(res, 'image/png'))
  } catch { return null }
}

export default function SeasonRecap({ players, perfs, matches, punc = [], seasons = [], openProfile }) {
  const withGames = seasons.filter(se => matches.some(m => {
    const t = new Date(m.played_at).getTime()
    return t >= new Date(se.starts_at).getTime() && t <= new Date(se.ends_at).getTime()
  }))
  const [seasonId, setSeasonId] = useState((withGames[withGames.length - 1] || seasons[0])?.id || null)
  const season = seasons.find(s => s.id === seasonId) || null

  const scoped = useMemo(() => filterBySeason(matches, perfs, season), [matches, perfs, season])
  const sMatches = scoped.matches, sPerfs = scoped.perfs
  const nameOf = id => players.find(p => p.id === id)?.name || 'Someone'
  const playerOf = id => players.find(p => p.id === id)

  const totals = useMemo(() => seasonTotals(sMatches), [sMatches])
  const puncMap = useMemo(() => puncByPlayer(puncInSeason(punc, season)), [punc, season])
  const { awards, agg, signatureHero } = useMemo(() => seasonAwards(sPerfs, players, puncMap), [sPerfs, players, puncMap])
  const cards = useMemo(() => playerCards(sPerfs, players, awards, agg, signatureHero, puncMap), [sPerfs, players, awards, agg, signatureHero, puncMap])
  const duos = useMemo(() => duoSynergy(sMatches, sPerfs), [sMatches, sPerfs])
  const recs = useMemo(() => singleGameRecords(sPerfs), [sPerfs])

  const heroMeta = useMemo(() => {
    const { byHero } = heroStats(sPerfs.filter(p => p.player_id))
    const eligible = byHero.filter(h => h.games >= 4)
    return {
      mostPicked: [...byHero].sort((a, b) => b.games - a.games).slice(0, 5),
      blessed: [...eligible].sort((a, b) => b.winRate - a.winRate).slice(0, 3),
      cursed: [...eligible].sort((a, b) => a.winRate - b.winRate).slice(0, 3),
    }
  }, [sPerfs])

  const matchRecs = useMemo(() => {
    const md = sMatches.filter(m => m.duration_seconds != null)
    const withScore = sMatches.filter(m => m.radiant_score != null && m.dire_score != null)
    const margin = m => Math.abs(m.radiant_score - m.dire_score)
    const tk = m => m.radiant_score + m.dire_score
    const min = (arr, f) => arr.length ? arr.reduce((a, b) => (f(b) < f(a) ? b : a)) : null
    const max = (arr, f) => arr.length ? arr.reduce((a, b) => (f(b) > f(a) ? b : a)) : null
    return {
      longest: max(md, m => m.duration_seconds),
      shortest: min(md, m => m.duration_seconds),
      blowout: max(withScore, margin),
      closest: min(withScore, margin),
      bloodiest: max(withScore, tk),
    }
  }, [sMatches])

  if (!sMatches.length) return (
    <div className="card"><p className="mute">No games logged for this season yet.</p></div>
  )

  const scoreline = m => `${m.radiant_score}-${m.dire_score}`

  return (
    <div>
      {/* Hero banner */}
      <div style={{
        borderRadius: 16, padding: '26px 22px', marginBottom: 18, position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse at top left, rgba(91,124,255,.28), transparent 60%), var(--card-grad)',
        border: '1px solid var(--line-2)', boxShadow: 'var(--shadow)',
      }}>
        <div className="eyebrow" style={{ color: 'var(--brand-hi)' }}>Season Recap</div>
        <h1 style={{ fontSize: 34, margin: '2px 0 2px', letterSpacing: '-.02em' }}>{season ? season.name : 'All Time'}</h1>
        <div className="mute small" style={{ marginBottom: 16 }}>The season that was. Records, awards, and receipts.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 10 }}>
          {[
            [totals.games, 'games'],
            [totals.kills.toLocaleString(), 'total kills'],
            [hms(totals.seconds), 'played'],
            [totals.sessions, 'sessions'],
            [dur(totals.avgSeconds), 'avg game'],
          ].map(([v, k]) => (
            <div key={k} style={{ background: 'var(--glass)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
              <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{v}</div>
              <div className="mute" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k}</div>
            </div>
          ))}
        </div>
        {withGames.length > 1 && (
          <div className="seg" style={{ marginTop: 16, display: 'inline-flex' }}>
            {withGames.map(se => (
              <button key={se.id} className={se.id === seasonId ? 'on' : ''} onClick={() => setSeasonId(se.id)}>{se.name}</button>
            ))}
          </div>
        )}
      </div>

      {/* Awards */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>The Awards</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 22 }}>
        {awards.map(a => {
          const p = playerOf(a.winnerId)
          return (
            <div key={a.id} className="card" style={{ margin: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{a.emoji}</span>
                <div className="grow"><div style={{ fontWeight: 700, fontSize: 15 }}>{a.title}</div></div>
              </div>
              <button onClick={() => p && openProfile?.(p)} className="row" style={{ alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                {p && <GodAvatar player={p} size={38} />}
                <div>
                  <div style={{ fontWeight: 600 }}>{nameOf(a.winnerId)}</div>
                  <div className="num mute" style={{ fontSize: 12 }}>{a.statline}</div>
                </div>
              </button>
              <div className="mute" style={{ fontSize: 12.5, lineHeight: 1.45, fontStyle: 'italic' }}>“{a.roast}”</div>
            </div>
          )
        })}
      </div>

      {/* Records Hall of Fame */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>Records Hall of Fame</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 12 }}>
        {recs && [
          ['🗡️', 'Most kills, one game', recs.mostKills, p => `${p.kills}/${p.deaths}/${p.assists} · ${p.hero_name}`],
          ['🎯', 'Most assists, one game', recs.mostAssists, p => `${p.assists} assists · ${p.hero_name}`],
          ['💎', 'Richest game', recs.richest, p => `${fmt.n(p.net_worth)} net · ${p.hero_name}`],
          ['🔥', 'Most hero damage', recs.mostDamage, p => `${fmt.n(p.hero_damage)} dmg · ${p.hero_name}`],
          ['👑', 'Best KDA, one game', recs.bestKda, p => `${p.kills}/${p.deaths}/${p.assists} · ${p.hero_name}`],
          ['⛲', 'The fountain frequenter', recs.feeder, p => `${p.deaths} deaths · ${p.hero_name}`],
        ].map(([emoji, label, perf, line]) => perf && (
          <div key={label} className="card" style={{ margin: 0, padding: 14 }}>
            <div className="mute" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{emoji} {label}</div>
            <button onClick={() => { const p = playerOf(perf.player_id); p && openProfile?.(p) }} className="row" style={{ alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              {playerOf(perf.player_id) && <GodAvatar player={playerOf(perf.player_id)} size={28} />}
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{nameOf(perf.player_id)}</div>
                <div className="num mute" style={{ fontSize: 12 }}>{line(perf)}</div>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Match records */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 22 }}>
        {[
          ['⏱️', 'Longest game', matchRecs.longest, m => `${dur(m.duration_seconds)} · ${scoreline(m)}`],
          ['⚡', 'Shortest game', matchRecs.shortest, m => `${dur(m.duration_seconds)} · ${scoreline(m)}`],
          ['💥', 'Biggest stomp', matchRecs.blowout, m => `${scoreline(m)} · ${shortDate(m.played_at)}`],
          ['😰', 'Closest game', matchRecs.closest, m => `${scoreline(m)} · ${shortDate(m.played_at)}`],
          ['🩸', 'Bloodiest game', matchRecs.bloodiest, m => `${m.radiant_score + m.dire_score} kills · ${scoreline(m)}`],
        ].map(([emoji, label, m, line]) => m && (
          <div key={label} style={{ background: 'var(--glass)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
            <div className="mute" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{emoji} {label}</div>
            <div className="num" style={{ fontWeight: 600, fontSize: 13, marginTop: 3 }}>{line(m)}</div>
          </div>
        ))}
      </div>

      {/* Hero meta */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>Draft Intel</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 22 }}>
        {[
          ['🙏 Blessed heroes', heroMeta.blessed, 'var(--radiant)'],
          ['💀 Cursed heroes', heroMeta.cursed, 'var(--dire)'],
          ['📊 Most contested', heroMeta.mostPicked, 'var(--mute)'],
        ].map(([label, rows, color]) => (
          <div key={label} className="card" style={{ margin: 0, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{label}</div>
            {rows.map(h => (
              <div key={h.hero} className="row" style={{ alignItems: 'center', padding: '3px 0' }}>
                <div className="grow" style={{ fontSize: 13 }}>{h.hero}</div>
                <div className="num" style={{ fontSize: 12.5, color }}>{fmt.pct(h.winRate)}</div>
                <div className="num mute" style={{ fontSize: 11, width: 54, textAlign: 'right' }}>{h.games} games</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Duo synergy */}
      {(duos.best || duos.worst) && (
        <>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Duo Synergy</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 22 }}>
            {[
              ['🤝', 'Deadliest duo', duos.best, 'They queue together, they win together. Split them up for balance or suffer.'],
              ['🧨', 'Cursed pairing', duos.worst, 'On paper, teammates. In practice, a two-man throw. Do not put them on the same side.'],
              ['🔗', 'Ride or die', duos.mostPlayed, 'Most games shoulder to shoulder. Inseparable, for better or worse.'],
            ].map(([emoji, label, d, note]) => d && (
              <div key={label} className="card" style={{ margin: 0, padding: 16 }}>
                <div className="row" style={{ alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{emoji}</span>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
                </div>
                <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                  {playerOf(d.a) && <GodAvatar player={playerOf(d.a)} size={30} />}
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{nameOf(d.a)}</span>
                  <span className="mute">+</span>
                  {playerOf(d.b) && <GodAvatar player={playerOf(d.b)} size={30} />}
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{nameOf(d.b)}</span>
                </div>
                <div className="num" style={{ fontSize: 12.5, marginTop: 8 }}>{fmt.pct(d.winRate)} win · {d.wins}-{d.games - d.wins} in {d.games} games</div>
                <div className="mute" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.4, fontStyle: 'italic' }}>{note}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Player wrapped cards */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>Everyone's Season · <span className="mute" style={{ textTransform: 'none', letterSpacing: 0 }}>tap Share, or screenshot your card</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {cards.map(c => <PlayerCard key={c.player.id} card={c} season={season} onOpen={() => openProfile?.(c.player)} />)}
      </div>
    </div>
  )
}

function PlayerCard({ card, season, onOpen }) {
  const { player, s, signature, title, titleEmoji, bestGame } = card
  const theme = themeOf(player)
  const [flash, setFlash] = useState('')
  const [busy, setBusy] = useState(false)
  const ping = msg => { setFlash(msg); setTimeout(() => setFlash(''), 1800) }

  const share = async (e) => {
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    const text = `${player.name} — ${title} · ${s.games} games, ${fmt.pct(s.winRate)} win, ${s.kda.toFixed(2)} KDA${signature ? ` · signature ${signature}` : ''}`
    try {
      const blob = await renderCardImage(card, season)
      const file = blob ? new File([blob], `${slug(player.name)}-recap.png`, { type: 'image/png' }) : null
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: `${player.name} · Season Recap`, text, files: [file] })
      } else if (blob) {
        // Desktop / no native file share: download the image and copy the link.
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `${slug(player.name)}-recap.png`
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
        try { await navigator.clipboard.writeText(APP_URL) } catch { /* clipboard blocked */ }
        ping('Saved · link copied ✓')
      } else if (navigator.share) {
        await navigator.share({ title: `${player.name} · Season Recap`, text, url: APP_URL })
      } else {
        await navigator.clipboard.writeText(`${text}\n${APP_URL}`); ping('Copied ✓')
      }
    } catch { /* user dismissed the share sheet */ }
    setBusy(false)
  }

  return (
    <div className="card" onClick={onOpen} style={{
      margin: 0, padding: 0, overflow: 'hidden', cursor: 'pointer',
      border: `1px solid var(--line-2)`,
    }}>
      <div style={{ background: theme.bg, padding: '16px 16px 14px' }}>
        <div className="row" style={{ alignItems: 'center', gap: 12 }}>
          <GodAvatar player={player} size={48} />
          <div className="grow">
            <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-.01em' }}>{player.name}</div>
            <div style={{ fontSize: 12.5, color: theme.accent, fontWeight: 600 }}>{titleEmoji} {title}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
          {[
            [s.games, 'games'],
            [fmt.pct(s.winRate), 'win rate'],
            [s.kda.toFixed(2), 'KDA'],
          ].map(([v, k]) => (
            <div key={k} style={{ background: 'var(--glass)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{v}</div>
              <div className="mute" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.03em' }}>{k}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.6 }}>
          <div className="row"><span className="mute grow">Record</span><span className="num">{s.wins}-{s.losses}</span></div>
          {signature && <div className="row"><span className="mute grow">Signature hero</span><span>{signature} <span className="mute num">×{card.signatureGames}</span></span></div>}
          <div className="row"><span className="mute grow">Hero pool</span><span className="num">{s.versatility} heroes</span></div>
          {bestGame && <div className="row"><span className="mute grow">Best game</span><span className="num">{bestGame.kills} kills · {bestGame.hero}</span></div>}
          {card.punc && <div className="row"><span className="mute grow">Punctuality</span><span className="num" style={{ color: tierColor[card.punc.tier] }}>{fmt.pct(card.punc.onTimeRate || 0)} on time · {Math.round(card.punc.avg || 0)}m late</span></div>}
          {s.streak && s.streak.n > 1 && <div className="row"><span className="mute grow">Ended on</span><span className="num" style={{ color: s.streak.kind === 'W' ? 'var(--radiant)' : 'var(--dire)' }}>{s.streak.n}{s.streak.kind} streak</span></div>}
        </div>
      </div>
      <div className="row" style={{ padding: '8px 12px', borderTop: '1px solid var(--line)' }}>
        <span className="mute grow" style={{ fontSize: 11 }}>{season ? season.name : ''}</span>
        <button className="btn sm ghost" onClick={share} disabled={busy}>{busy ? '…' : flash || 'Share card'}</button>
      </div>
    </div>
  )
}
