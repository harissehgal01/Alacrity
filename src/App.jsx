import { useEffect, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Leaderboard from './screens/Leaderboard'
import Matches from './screens/Matches'
import ImportMatch from './screens/ImportMatch'
import Profile from './screens/Profile'
import Punctuality from './screens/Punctuality'
import Draft from './screens/Draft'
import Roster from './screens/Roster'

const TABS = [
  ['board', 'Leaderboard'],
  ['draft', 'Draft'],
  ['matches', 'Matches'],
  ['punctuality', 'Punctuality'],
  ['roster', 'Roster'],
]

export default function App() {
  const [tab, setTab] = useState('board')
  const [players, setPlayers] = useState([])
  const [perfs, setPerfs] = useState([])
  const [matches, setMatches] = useState([])
  const [openPlayer, setOpenPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      const [pl, ma, pf] = await Promise.all([
        supabase.from('players').select('*').order('name'),
        supabase.from('matches').select('*').order('played_at', { ascending: false }),
        supabase.from('match_performances').select('*'),
      ])
      for (const r of [pl, ma, pf]) if (r.error) throw r.error
      const matchDates = Object.fromEntries(ma.data.map(m => [m.id, m.played_at]))
      setPlayers(pl.data)
      setMatches(ma.data)
      setPerfs(pf.data.map(p => ({ ...p, _played_at: matchDates[p.match_id] })))
    } catch (e) {
      setError(e.message || 'Could not reach the database.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // live refresh when matches change (someone else logs a game)
  useEffect(() => {
    const ch = supabase.channel('data-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_performances' }, reload)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [reload])

  const shared = { players, perfs, matches, reload, openProfile: setOpenPlayer }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1 className="brand">Alacrity <span className="gold">Dota</span></h1>
          <div className="subtitle">Crew leaderboard &amp; draft room</div>
        </div>
      </header>

      {error && <div className="notice err" style={{ marginBottom: 14 }}>{error} <button className="btn sm ghost" onClick={reload}>Retry</button></div>}
      {loading && <div className="mute">Loading…</div>}

      {!loading && tab === 'board' && <Leaderboard {...shared} />}
      {!loading && tab === 'draft' && <Draft players={players} />}
      {!loading && tab === 'matches' && (
        <>
          <ImportMatch players={players} reload={reload} />
          <Matches {...shared} />
        </>
      )}
      {!loading && tab === 'punctuality' && <Punctuality players={players} />}
      {!loading && tab === 'roster' && <Roster players={players} reload={reload} />}

      {openPlayer && (
        <div className="modal-back" onClick={() => setOpenPlayer(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <Profile player={openPlayer} perfs={perfs} matches={matches} onClose={() => setOpenPlayer(null)} />
          </div>
        </div>
      )}

      <nav className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
    </div>
  )
}
