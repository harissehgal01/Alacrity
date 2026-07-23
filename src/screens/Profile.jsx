import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { aggregate, fmt, impactStats, filterBySeason } from '../lib/stats'
import { fetchHeroes } from '../lib/opendota'
import { GodAvatar, godOf, GodPicker, ThemePicker, themeOf } from '../lib/gods'

// Match Ribbon — interactive area chart over recent games.
// Dots are win/loss colored; hover/tap shows a tooltip with hero + numbers.
function MatchRibbon({ games, imgByHero, accent }) {
  const [metric, setMetric] = useState('kda')
  const [tip, setTip] = useState(null) // { i, x, y }
  if (games.length < 3) return null
  const METRICS = [['kda', 'KDA'], ['net_worth', 'Net worth'], ['hero_damage', 'Hero dmg']]
  const val = g => metric === 'kda' ? +(((g.kills + g.assists) / Math.max(1, g.deaths)).toFixed(1)) : (g[metric] || 0)
  const W = 660, H = 200, P = 26
  const vals = games.map(val)
  const max = Math.max(...vals) * 1.15 || 1
  const x = i => P + i * (W - 2 * P) / Math.max(1, games.length - 1)
  const y = v => H - P - (v / max) * (H - 2 * P)
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`)
  const area = `M${x(0)},${H - P} L${pts.join(' L')} L${x(games.length - 1)},${H - P} Z`
  const g = tip != null ? games[tip.i] : null
  return (
    <div className="stat" style={{ gridColumn: '1 / -1', position: 'relative' }}>
      <div className="row" style={{ marginBottom: 8 }}>
        <div className="k grow">Form <span className="formula">last {games.length} games</span></div>
        <div className="seg" style={{ margin: 0 }}>
          {METRICS.map(([k, label]) => <button key={k} className={metric === k ? 'on' : ''} onClick={() => setMetric(k)}>{label}</button>)}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%' }} onMouseLeave={() => setTip(null)}>
        <defs>
          <linearGradient id="ribbonGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={accent} stopOpacity="0.28" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ribbonGrad)" />
        <polyline points={pts.join(' ')} fill="none" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
        {games.map((gm, i) => (
          <circle key={gm.id} cx={x(i)} cy={y(vals[i])} r={tip?.i === i ? 8 : 6.5}
            fill={gm.won ? 'var(--radiant, #3fb950)' : 'var(--dire, #f85149)'}
            stroke="var(--bg1, #16131f)" strokeWidth="2.5" style={{ cursor: 'pointer' }}
            onMouseEnter={() => setTip({ i, x: x(i), y: y(vals[i]) })}
            onClick={() => setTip(t => t?.i === i ? null : { i, x: x(i), y: y(vals[i]) })} />
        ))}
      </svg>
      {g && (
        <div style={{
          position: 'absolute', pointerEvents: 'none', zIndex: 5,
          left: `clamp(0px, calc(${(tip.x / W) * 100}% - 80px), calc(100% - 170px))`,
          top: `calc(${(tip.y / H) * 100}% - 26px)`,
          background: 'var(--bg2, #1e1a2a)', border: '1px solid var(--line)', borderRadius: 10,
          padding: '8px 10px', fontSize: 12, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,.5)',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {imgByHero.get(g.hero_name) && <img src={imgByHero.get(g.hero_name)} alt="" style={{ width: 44, height: 25, objectFit: 'cover', borderRadius: 4 }} />}
            <div>
              <b>{g.hero_name}</b>{' '}
              <span style={{ fontWeight: 700, fontSize: 11, color: g.won ? 'var(--radiant, #3fb950)' : 'var(--dire, #f85149)' }}>{g.won ? 'WIN' : 'LOSS'}</span>
              <div className="mute num">{g.kills}/{g.deaths}/{g.assists} · {metric === 'kda' ? `${val(g)} KDA` : fmt.n(val(g))}</div>
              <div className="mute num" style={{ fontSize: 11 }}>{new Date(g.match.played_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Profile({ player, perfs: allPerfs, matches: allMatches, punc = [], players = [], seasons = [], reload, onClose }) {
  const [openMatch, setOpenMatch] = useState(null)
  const [pickingGod, setPickingGod] = useState(false)
  const [pickingTheme, setPickingTheme] = useState(false)
  const [localPlayer, setLocalPlayer] = useState(player)
  const [seasonId, setSeasonId] = useState('all')
  const [heroes, setHeroes] = useState([])
  useEffect(() => { fetchHeroes().then(setHeroes).catch(() => {}) }, [])
  const imgByHero = useMemo(() => new Map(heroes.map(h => [h.name, h.img])), [heroes])

  const season = seasons.find(s => s.id === seasonId) || null
  const { matches, perfs } = useMemo(() => filterBySeason(allMatches, allPerfs, season), [allMatches, allPerfs, season])

  const s = useMemo(() => aggregate(perfs.filter(p => p.player_id === player.id)).get(player.id), [perfs, player.id])
  const myImpact = useMemo(() => {
    const all = impactStats(perfs, 1)
    return [...all.mvpLeaders, ...all.mostImpactful].find(r => r.player_id === player.id) ||
      all.mostImpactful.find(r => r.player_id === player.id) || null
  }, [perfs, player.id])

  // Per-hero breakdown for this player, sorted by games played.
  const heroRows = useMemo(() => {
    const mine = perfs.filter(p => p.player_id === player.id && p.hero_name)
    const byHero = new Map()
    for (const p of mine) {
      if (!byHero.has(p.hero_name)) byHero.set(p.hero_name, { hero: p.hero_name, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 })
      const h = byHero.get(p.hero_name)
      h.games += 1; if (p.won) h.wins += 1
      h.kills += p.kills || 0; h.deaths += p.deaths || 0; h.assists += p.assists || 0
    }
    return [...byHero.values()].sort((a, b) => b.games - a.games)
  }, [perfs, player.id])

  // Last 10 games, oldest to newest, for the form strip.
  const form = useMemo(() => {
    const mine = perfs.filter(p => p.player_id === player.id)
      .map(p => ({ ...p, match: matches.find(m => m.id === p.match_id) }))
      .filter(p => p.match)
      .sort((a, b) => new Date(a.match.played_at) - new Date(b.match.played_at))
    return mine.slice(-10)
  }, [perfs, matches, player.id])

  async function saveAvatar(patch) {
    setLocalPlayer(lp => ({ ...lp, ...patch }))
    setPickingGod(false)
    await supabase.from('players').update(patch).eq('id', player.id)
    reload && reload()
  }
  async function saveTheme(key) {
    setLocalPlayer(lp => ({ ...lp, theme_key: key }))
    setPickingTheme(false)
    await supabase.from('players').update({ theme_key: key }).eq('id', player.id)
    reload && reload()
  }

  // Last 15 games with match info, oldest → newest, for the ribbon.
  const trendGames = useMemo(() => {
    return perfs.filter(p => p.player_id === player.id)
      .map(p => ({ ...p, match: matches.find(m => m.id === p.match_id) }))
      .filter(p => p.match)
      .sort((a, b) => new Date(a.match.played_at) - new Date(b.match.played_at))
      .slice(-15)
  }, [perfs, matches, player.id])
  const myPunc = useMemo(() => punc.filter(r => r.player_id === player.id), [punc, player.id])

  const puncStats = useMemo(() => {
    const attended = myPunc.filter(r => !r.no_show && r.minutes_late != null)
    const noShows = myPunc.filter(r => r.no_show).length
    const total = attended.reduce((a, r) => a + r.minutes_late, 0)
    return {
      sessions: myPunc.length,
      noShows,
      totalLate: total,
      avgLate: attended.length ? total / attended.length : null,
      onTimeRate: myPunc.length ? attended.filter(r => r.minutes_late <= 0).length / myPunc.length : null,
    }
  }, [myPunc])

  const allMatchLogs = useMemo(() => {
    const mine = perfs.filter(p => p.player_id === player.id)
    return mine
      .map(p => ({ ...p, match: matches.find(m => m.id === p.match_id) }))
      .filter(p => p.match)
      .sort((a, b) => new Date(b.match.played_at) - new Date(a.match.played_at))
  }, [perfs, matches, player.id])

  if (openMatch) {
    return <MatchLog matchRow={openMatch} perfs={perfs} players={players} imgByHero={imgByHero} onBack={() => setOpenMatch(null)} onClose={onClose} />
  }

  return (
    <div style={{ background: themeOf(localPlayer).bg, margin: -16, padding: 16, borderRadius: 12 }}>
      <div className="row" style={{ marginBottom: 14 }}>
        <h2 className="grow" style={{ fontSize: 19, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <GodAvatar player={localPlayer} size={40} />
          <span>{player.name}<span className="small mute" style={{ display: 'block', fontSize: 11, fontWeight: 400 }}>{localPlayer.avatar_url ? '' : godOf(localPlayer).title}{myImpact?.mvps ? `${localPlayer.avatar_url ? '' : ' · '}👑 ${myImpact.mvps} MVP${myImpact.mvps > 1 ? 's' : ''}` : ''}</span></span>
        </h2>
        <button className="btn sm ghost" onClick={() => { setPickingGod(v => !v); setPickingTheme(false) }}>{pickingGod ? 'Close' : 'Avatar'}</button>
        <button className="btn sm ghost" onClick={() => { setPickingTheme(v => !v); setPickingGod(false) }}>{pickingTheme ? 'Close' : 'Theme'}</button>
        <button className="btn sm ghost" onClick={onClose}>‹ Back</button>
      </div>
      {pickingGod && (
        <div className="card" style={{ background: 'var(--bg0)', marginBottom: 14 }}>
          <GodPicker player={localPlayer} allPlayers={players} heroes={heroes} onPick={saveAvatar} />
        </div>
      )}
      {pickingTheme && (
        <div className="card" style={{ background: 'var(--bg0)', marginBottom: 14 }}>
          <ThemePicker player={localPlayer} onPick={saveTheme} />
        </div>
      )}

      {seasons.length > 0 && (
        <div className="row" style={{ marginBottom: 14, alignItems: 'center' }}>
          <div className="eyebrow grow">Season</div>
          <select className="input" style={{ width: 'auto' }} value={seasonId} onChange={e => setSeasonId(e.target.value)}>
            <option value="all">All time</option>
            {seasons.map(sn => <option key={sn.id} value={sn.id}>{sn.name}</option>)}
          </select>
        </div>
      )}

      {form.length > 0 && (
        <div className="row" style={{ gap: 4, marginBottom: 16 }}>
          {form.map(p => (
            <span key={p.id} title={`${p.hero_name || ''} · ${p.kills}/${p.deaths}/${p.assists}`}
              style={{
                width: 22, height: 22, borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
                background: p.won ? 'var(--radiant, #3fb950)' : 'var(--dire, #f85149)',
              }}>{p.won ? 'W' : 'L'}</span>
          ))}
          <span className="small mute" style={{ marginLeft: 8, alignSelf: 'center' }}>last {form.length} games</span>
        </div>
      )}

      {trendGames.length >= 3 && (
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <MatchRibbon games={trendGames} imgByHero={imgByHero} accent={themeOf(localPlayer).accent} />
        </div>
      )}

      {!s && <p className="mute">No games logged yet for {player.name}{season ? ` in ${season.name}` : ''}.</p>}

      {s && (
        <>
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div className="stat"><div className="k">Win rate</div><div className="v num" style={{ color: 'var(--gold)' }}>{fmt.pct(s.winRate)}</div></div>
            <div className="stat"><div className="k">Record</div><div className="v num">{s.wins}–{s.losses}</div></div>
            <div className="stat"><div className="k">KDA <span className="formula">(K+A)/D</span></div><div className="v num">{fmt.d1(s.kda)}</div></div>
            <div className="stat"><div className="k">Avg kills</div><div className="v num">{fmt.d1(s.avgKills)}</div></div>
            <div className="stat"><div className="k">Avg deaths</div><div className="v num">{fmt.d1(s.avgDeaths)}</div></div>
            <div className="stat"><div className="k">Avg assists</div><div className="v num">{fmt.d1(s.avgAssists)}</div></div>
            <div className="stat"><div className="k">Avg hero dmg</div><div className="v num">{fmt.n(s.avgHeroDamage)}</div></div>
            <div className="stat"><div className="k">Max hero dmg</div><div className="v num">{fmt.n(s.maxHeroDamage)}</div></div>
            <div className="stat"><div className="k">Avg GPM</div><div className="v num">{fmt.n(s.avgGpm)}</div></div>
            <div className="stat"><div className="k">Avg XPM</div><div className="v num">{fmt.n(s.avgXpm)}</div></div>
            <div className="stat"><div className="k">Avg last hits</div><div className="v num">{fmt.n(s.avgLastHits)}</div></div>
            <div className="stat"><div className="k">Avg tower dmg</div><div className="v num">{fmt.n(s.avgTowerDamage)}</div></div>
            <div className="stat"><div className="k">Avg obs wards</div><div className="v num">{fmt.d1(s.avgObs)}</div></div>
            <div className="stat"><div className="k">Avg sentry wards</div><div className="v num">{fmt.d1(s.avgSen)}</div></div>
            <div className="stat"><div className="k">Avg camps stacked</div><div className="v num">{fmt.d1(s.avgCampsStacked)}</div></div>
            <div className="stat"><div className="k">Avg dewards</div><div className="v num">{fmt.d1(s.avgDewards)}</div></div>
            <div className="stat"><div className="k">Avg support gold</div><div className="v num">{fmt.n(s.avgSupportGold)}</div></div>
            <div className="stat"><div className="k">Avg smoke</div><div className="v num">{fmt.d1(s.avgSmoke)}</div></div>
          </div>

          {heroRows.length > 0 && (
            <>
              <h2 style={{ fontSize: 14, marginBottom: 6 }}>By hero</h2>
              <div style={{ marginBottom: 16, overflowX: 'auto' }}>
                <table className="small" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="mute" style={{ textAlign: 'left' }}>
                      <th style={{ padding: '4px 8px 4px 0' }}>Hero</th>
                      <th className="num" style={{ padding: '4px 8px' }}>Games</th>
                      <th className="num" style={{ padding: '4px 8px' }}>W-L</th>
                      <th className="num" style={{ padding: '4px 8px' }}>Win%</th>
                      <th className="num" style={{ padding: '4px 8px' }}>Avg KDA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heroRows.map(h => (
                      <tr key={h.hero}>
                        <td style={{ padding: '4px 8px 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>{imgByHero.get(h.hero) && <img src={imgByHero.get(h.hero)} alt="" style={{ width: 32, height: 18, objectFit: 'cover', borderRadius: 3 }} />}{h.hero}</td>
                        <td className="num" style={{ padding: '4px 8px' }}>{h.games}</td>
                        <td className="num" style={{ padding: '4px 8px' }}>{h.wins}-{h.games - h.wins}</td>
                        <td className="num" style={{ padding: '4px 8px' }}>{fmt.pct(h.wins / h.games)}</td>
                        <td className="num" style={{ padding: '4px 8px' }}>{h.kills}/{fmt.d1(h.deaths / h.games)}/{h.assists}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="row" style={{ marginBottom: 4 }}>
            <h2 style={{ fontSize: 14, marginBottom: 0 }}>Match logs</h2>
            <span className="mute small" style={{ marginLeft: 'auto' }}>{allMatchLogs.length} game{allMatchLogs.length === 1 ? '' : 's'} · tap to open</span>
          </div>
          <div className="match-log-scroll">
            {allMatchLogs.map(p => (
              <button key={p.id} className="match-row small match-log-row" onClick={() => setOpenMatch(p)}>
                <span className={`tag ${p.won ? 'rad' : 'dire'}`}>{p.won ? 'W' : 'L'}</span>
                {imgByHero.get(p.hero_name) && <img src={imgByHero.get(p.hero_name)} alt="" style={{ width: 36, height: 20, objectFit: 'cover', borderRadius: 4 }} />}
                <div className="grow">
                  {p.hero_name || 'Unknown hero'} <span className="mute num">· {p.kills}/{p.deaths}/{p.assists} · {fmt.n(p.hero_damage)} dmg</span>
                </div>
                <span className="mute num">{new Date(p.match.played_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                <span className="mute" style={{ marginLeft: 6 }}>›</span>
              </button>
            ))}
          </div>
        </>
      )}

      <h2 style={{ fontSize: 14, marginTop: 18 }}>Punctuality</h2>
      <p className="small mute" style={{ marginTop: 2 }}>Attendance only — never affects the leaderboard.</p>
      {myPunc.length === 0 && <p className="mute small">No sessions recorded.</p>}
      {myPunc.length > 0 && (
        <div className="stat-grid">
          <div className="stat"><div className="k">On-time rate</div><div className="v num">{puncStats.onTimeRate == null ? '—' : fmt.pct(puncStats.onTimeRate)}</div></div>
          <div className="stat"><div className="k">Avg minutes late</div><div className="v num">{puncStats.avgLate == null ? '—' : fmt.d1(puncStats.avgLate)}</div></div>
          <div className="stat"><div className="k">Total minutes late</div><div className="v num">{puncStats.totalLate}</div></div>
          <div className="stat"><div className="k">No-shows</div><div className="v num">{puncStats.noShows}</div></div>
        </div>
      )}
    </div>
  )
}

function MatchLog({ matchRow, perfs, players, imgByHero = new Map(), onBack, onClose }) {
  const nameOf = row => {
    if (row.player_id) return players.find(p => p.id === row.player_id)?.name || 'Unknown'
    return 'Guest'
  }
  const rows = useMemo(
    () => perfs.filter(p => p.match_id === matchRow.match_id).sort((a, b) => (b.kills - a.kills)),
    [perfs, matchRow.match_id]
  )
  const radiant = rows.filter(r => r.team === 'radiant')
  const dire = rows.filter(r => r.team === 'dire')
  const m = matchRow.match

  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn sm ghost" onClick={onBack}>‹ Back</button>
        <span className="grow" />
        <button className="btn sm ghost" onClick={onClose}>Close</button>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <span className={`tag ${m.radiant_win ? 'rad' : 'dire'}`}>{m.radiant_win ? 'Radiant' : 'Dire'} won</span>
        <span className="mute small">{new Date(m.played_at).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
        {m.duration_seconds != null && <span className="mute small num">· {fmt.dur(m.duration_seconds)}</span>}
      </div>

      {[['Radiant', radiant, 'rad'], ['Dire', dire, 'dire']].map(([label, side, tagClass]) => (
        <div key={label} style={{ marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 6, color: label === 'Radiant' ? 'var(--radiant)' : 'var(--dire-hi)' }}>{label}</div>
          {side.map(r => (
            <div key={r.id} className="match-log-detail-row">
              {imgByHero.get(r.hero_name) && <img src={imgByHero.get(r.hero_name)} alt="" style={{ width: 40, height: 22, objectFit: 'cover', borderRadius: 4, marginRight: 8, flexShrink: 0 }} />}
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{nameOf(r)}<span className="mute" style={{ fontWeight: 400 }}> · {r.hero_name || '—'}</span></div>
                <div className="mute small num">
                  {r.kills}/{r.deaths}/{r.assists} · {fmt.n(r.net_worth)} net · {fmt.n(r.gpm)} GPM · {fmt.n(r.hero_damage)} dmg
                  {r.tower_damage != null && <> · {fmt.n(r.tower_damage)} tower</>}
                </div>
                {(r.obs_placed != null || r.sen_placed != null || r.support_gold_spent != null) && (
                  <div className="mute small num">
                    {r.obs_placed != null && <>{r.obs_placed} obs · </>}
                    {r.sen_placed != null && <>{r.sen_placed} sen · </>}
                    {r.dewards != null && <>{r.dewards} dewards · </>}
                    {r.support_gold_spent != null && <>{fmt.n(r.support_gold_spent)} support gold</>}
                  </div>
                )}
              </div>
              {r.won && <span className="mute" style={{ color: 'var(--gold)' }}>W</span>}
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
