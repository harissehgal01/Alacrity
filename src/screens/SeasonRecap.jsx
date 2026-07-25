import { useMemo, useState } from 'react'
import { filterBySeason, heroStats, fmt } from '../lib/stats'
import { seasonTotals, seasonAwards, duoSynergy, singleGameRecords, playerCards } from '../lib/recap'
import { GodAvatar, themeOf } from '../lib/gods'

const hms = s => {
  if (s == null) return '—'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m`
}
const dur = s => s == null ? '—' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
const shortDate = iso => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export default function SeasonRecap({ players, perfs, matches, seasons = [], openProfile }) {
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
  const { awards, agg, signatureHero } = useMemo(() => seasonAwards(sPerfs, players), [sPerfs, players])
  const cards = useMemo(() => playerCards(sPerfs, players, awards, agg, signatureHero), [sPerfs, players, awards, agg, signatureHero])
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
            [totals.nights, 'nights'],
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
  const [copied, setCopied] = useState(false)

  const share = async (e) => {
    e.stopPropagation()
    const text = `${titleEmoji} ${player.name} — ${season ? season.name : 'Alacrity Dota'}\n${title}\n${s.games} games · ${fmt.pct(s.winRate)} win · ${s.kda.toFixed(2)} KDA${signature ? ` · signature: ${signature}` : ''}\nAlacrity Dota`
    try {
      if (navigator.share) { await navigator.share({ title: `${player.name} · Season Recap`, text }); return }
      await navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { /* user dismissed */ }
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
          {s.streak && s.streak.n > 1 && <div className="row"><span className="mute grow">Ended on</span><span className="num" style={{ color: s.streak.kind === 'W' ? 'var(--radiant)' : 'var(--dire)' }}>{s.streak.n}{s.streak.kind} streak</span></div>}
        </div>
      </div>
      <div className="row" style={{ padding: '8px 12px', borderTop: '1px solid var(--line)' }}>
        <span className="mute grow" style={{ fontSize: 11 }}>{season ? season.name : ''}</span>
        <button className="btn sm ghost" onClick={share}>{copied ? 'Copied ✓' : 'Share'}</button>
      </div>
    </div>
  )
}
