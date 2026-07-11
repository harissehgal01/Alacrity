import { useAuth } from '../lib/auth'

export default function Login() {
  const { signInWithGoogle } = useAuth()
  return (
    <div style={{ minHeight: '80vh', display: 'grid', placeItems: 'center' }}>
      <div className="card" style={{ maxWidth: 380, width: '100%', textAlign: 'center', padding: 32 }}>
        <img src="/alacrity-light.png" className="theme-logo" alt="Alacrity" style={{ width: 68, margin: '0 auto 18px' }} />
        <h1 className="brand" style={{ fontSize: 26, marginBottom: 6 }}>Alacrity Dota</h1>
        <p className="mute small" style={{ marginBottom: 24 }}>Crew ladder, live Captain's Mode drafting, and punctuality — sign in to continue.</p>
        <button className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} onClick={signInWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M12 11v2.8h6.5c-.3 1.7-2 5-6.5 5-3.9 0-7-3.2-7-7.1S8.1 4.6 12 4.6c2.2 0 3.7.9 4.6 1.7l3.1-3C17.8 1.5 15.2.5 12 .5 5.7.5.6 5.6.6 11.9S5.7 23.3 12 23.3c6.9 0 11.5-4.9 11.5-11.7 0-.8-.1-1.4-.2-2H12z"/></svg>
          Continue with Google
        </button>
        <p className="mute" style={{ fontSize: 11, marginTop: 20, opacity: .7 }}>Built by Alacrity Designs · alacritydesigns.com</p>
      </div>
    </div>
  )
}
