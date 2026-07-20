import { useEffect, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './lib/auth'
import Login from './screens/Login'
import Leaderboard from './screens/Leaderboard'
import Matches from './screens/Matches'
import ImportMatch from './screens/ImportMatch'
import Profile from './screens/Profile'
import Punctuality from './screens/Punctuality'
import Draft from './screens/Draft'
import Roster from './screens/Roster'
import PublicLeaderboard from './screens/PublicLeaderboard'
import SelfLog from './screens/SelfLog'
import ScreenshotImport from './screens/ScreenshotImport'
import Stats from './screens/Stats'
import ClaimIdentity from './screens/ClaimIdentity'
import { usePresence } from './lib/presence'

const TABS = [
  ['board', 'Leaderboard'],
  ['stats', 'Stats'],
  ['draft', 'Draft'],
  ['matches', 'Matches'],
  ['punctuality', 'Punctuality'],
  ['roster', 'Roster'],
]

export default function App() {
  const { session, user, profile, loading: authLoading, isAdmin, signOut, refreshProfile } = useAuth()
  const online = usePresence(user)
  const [tab, setTab] = useState('board')
  const [players, setPlayers] = useState([])
  const [perfs, setPerfs] = useState([])
  const [matches, setMatches] = useState([])
  const [punc, setPunc] = useState([])
  const [profiles, setProfiles] = useState([])
  const [board, setBoard] = useState('crew')
  const [openPlayer, setOpenPlayer] = useState(null)
  const [about, setAbout] = useState(false)
  const [menu, setMenu] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('room')) setTab('draft')
  }, [])

  useEffect(() => {
    const saved = (() => { try { return localStorage.getItem('ad-theme') } catch { return null } })()
    const initial = saved || 'dark'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('ad-theme', next) } catch {}
  }

  const reload = useCallback(async () => {
    setError(null)
    try {
      const [pl, ma, pf, pu, pr] = await Promise.all([
        supabase.from('players').select('*').order('name'),
        supabase.from('matches').select('*').order('played_at', { ascending: false }),
        supabase.from('match_performances').select('*'),
        supabase.from('punctuality').select('*'),
        supabase.from('profiles').select('*'),
      ])
      for (const r of [pl, ma, pf, pu, pr]) if (r.error) throw r.error
      const matchDates = Object.fromEntries(ma.data.map(m => [m.id, m.played_at]))
      setPlayers(pl.data)
      setMatches(ma.data)
      setPerfs(pf.data.map(p => ({ ...p, _played_at: matchDates[p.match_id] })))
      setPunc(pu.data)
      setProfiles(pr.data)
    } catch (e) {
      setError(e.message || 'Could not reach the database.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (session) reload() }, [session, reload])

  useEffect(() => {
    if (!session) return
    const ch = supabase.channel('data-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_performances' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'punctuality' }, reload)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [session, reload])

  const logo = theme === 'light' ? '/alacrity-dark.png' : '/alacrity-light.png'

  if (authLoading) return <div className="app"><div className="mute" style={{ padding: 40 }}>Loading…</div></div>
  if (!session) return <div className="app"><Login /></div>

  // must claim a roster identity (or skip) — only prompt if not linked and roster exists
  const needsClaim = profile && !profile.player_id && !profile.claim_skipped

  const shared = { players, perfs, matches, punc, reload, openProfile: setOpenPlayer, isAdmin, online, profiles }

  return (
    <div className="app">
      <header className="topbar">
        <img className="logo" src={logo} alt="Alacrity" />
        <div className="grow">
          <h1 className="brand">Alacrity Dota<small>Crew ladder · draft room</small></h1>
        </div>
        <nav className="topnav">
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>
        <div className="head-actions">
          <button className="iconbtn" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'dark' ? '☀' : '☾'}</button>
          <button className="iconbtn" onClick={() => setAbout(true)} aria-label="About">i</button>
          <button className="iconbtn avatar" onClick={() => setMenu(true)} aria-label="Profile">{(profile?.display_name || user.email || '?')[0].toUpperCase()}</button>
        </div>
      </header>

      {error && <div className="notice err" style={{ marginBottom: 12 }}>{error} <button className="btn sm ghost" onClick={reload}>Retry</button></div>}
      {loading && <div className="mute">Loading…</div>}

      {!loading && tab === 'board' && (
        <>
          <div className="seg">
            <button className={board === 'crew' ? 'on' : ''} onClick={() => setBoard('crew')}>Crew</button>
            <button className={board === 'public' ? 'on' : ''} onClick={() => setBoard('public')}>Public</button>
          </div>
          {board === 'crew' && <Leaderboard {...shared} />}
          {board === 'public' && (
            <>
              <PublicLeaderboard profiles={profiles} players={players} perfs={perfs} user={user} online={online} />
              {!profile?.player_id && <SelfLog user={user} reload={reload} />}
            </>
          )}
        </>
      )}
      {!loading && tab === 'stats' && <Stats players={players} perfs={perfs} matches={matches} openProfile={setOpenPlayer} />}
      {!loading && tab === 'draft' && <Draft />}
      {!loading && tab === 'matches' && (
        <>
          {isAdmin ? <><ImportMatch players={players} reload={reload} /><ScreenshotImport players={players} reload={reload} /></> : <div className="notice" style={{ marginBottom: 14 }}>Only the admin can log matches. You can browse match history below.</div>}
          <Matches {...shared} />
        </>
      )}
      {!loading && tab === 'punctuality' && <Punctuality players={players} isAdmin={isAdmin} />}
      {!loading && tab === 'roster' && <Roster players={players} reload={reload} isAdmin={isAdmin} punc={punc} />}

      {needsClaim && <ClaimIdentity players={players} onDone={refreshProfile} />}

      {openPlayer && (
        <div className="modal-back" onClick={() => setOpenPlayer(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <Profile player={openPlayer} perfs={perfs} matches={matches} punc={punc} players={players} onClose={() => setOpenPlayer(null)} />
          </div>
        </div>
      )}

      {menu && (
        <div className="modal-back" onClick={() => setMenu(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h2 style={{ marginBottom: 4 }}>Profile</h2>
            <p className="small mute" style={{ marginTop: 0 }}>{profile?.display_name || user.email}{isAdmin ? ' · admin' : ''}</p>
            {profile?.player_id && <p className="small mute" style={{ marginTop: -6 }}>Linked to roster: <b style={{ color: 'var(--text)' }}>{players.find(p => p.id === profile.player_id)?.name || '—'}</b></p>}
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn grow danger" onClick={() => { setMenu(false); signOut() }}>Sign out</button>
              <button className="btn ghost" onClick={() => setMenu(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {about && (
        <div className="modal-back" onClick={() => setAbout(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="about">
              <img src={logo} alt="Alacrity Designs" />
              <h2 style={{ marginBottom: 6 }}>Built by Alacrity Designs</h2>
              <div className="l"><a href="mailto:connect@alacritydesigns.com">connect@alacritydesigns.com</a></div>
              <div className="l"><a href="https://alacritydesigns.com" target="_blank" rel="noreferrer">alacritydesigns.com</a></div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                <div className="small mute" style={{ marginBottom: 10 }}>Signed in as {user.email}{isAdmin ? ' · admin' : ''}</div>
                <button className="btn sm ghost" onClick={signOut}>Sign out</button>
                <button className="btn sm ghost" onClick={() => setAbout(false)} style={{ marginLeft: 8 }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
