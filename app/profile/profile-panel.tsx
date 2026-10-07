'use client'

import { useEffect, useState, type FormEvent } from 'react'

type User = { id?: string; provider?: string; name?: string; email?: string; picture?: string }
type AccountSession = { id: string; device: string; ip: string; country: string; location: string; lastSeen: number; current: boolean }

export default function ProfilePanel() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [sessions, setSessions] = useState<AccountSession[]>([])
  const [sessionsMessage, setSessionsMessage] = useState('')

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : null)
      .then((session) => {
        const nextUser = session?.user ?? session ?? null
        setUser(nextUser)
        setName(nextUser?.name || '')
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    fetch('/api/account/sessions', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => setSessions(result?.sessions || []))
      .catch(() => setSessionsMessage('Could not load active sessions.'))
  }, [user?.id])

  if (loading) return <section className="profile-card profile-loading">Loading account...</section>
  if (!user) return <section className="profile-card profile-compact"><p className="profile-kicker">ROVERA ACCOUNT</p><h1>Sign in to view your settings</h1><p className="profile-copy">Sign in to manage your account settings.</p><a className="profile-action" href="/">Back to login</a></section>

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/account/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ name }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save your username.')
      setUser(result.user)
      setMessage('Username saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save your username.')
    } finally { setSaving(false) }
  }

  async function revokeOtherSessions() {
    await fetch('/api/account/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allOther: true }) })
    setSessions(sessions.filter((session) => session.current))
  }

  async function revokeSession(id: string) {
    await fetch('/api/account/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setSessions(sessions.filter((session) => session.id !== id))
  }

  const providerName = user.provider === 'email' ? 'Email code' : user.provider === 'discord' ? 'Discord' : 'Google'
  const currentSessions = sessions.filter((session) => session.current)
  const otherSessions = sessions.filter((session) => !session.current)

  return (
    <section className="profile-card profile-compact">
      <div className="compact-heading"><div className="account-square">{user.picture ? <img src={user.picture} alt="" /> : (user.name || user.email || 'R').slice(0, 1).toUpperCase()}</div><div><p className="profile-kicker">ROVERA ACCOUNT</p><h1>Account settings</h1></div></div>
      <div className="account-accordion-list">
        <details className="account-accordion"><summary><span>Username</span><strong>{user.name || 'Not provided'}</strong><span className="accordion-chevron">›</span></summary><div className="accordion-content"><form onSubmit={saveProfile}><label htmlFor="profile-name">Username</label><div className="profile-setting-row"><input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" /><button className="profile-save" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>{message && <p className="profile-message" role="status">{message}</p>}</form></div></details>
        <details className="account-accordion"><summary><span>Email</span><strong>{user.email || 'Not provided'}</strong><span className="accordion-chevron">›</span></summary><div className="accordion-content"><p className="profile-note">{user.email || 'No email available'}</p><p className="profile-note">Sign-in method: {providerName}</p></div></details>
        <details className="account-accordion"><summary><span>Logged-in devices</span><strong>{sessions.length} {sessions.length === 1 ? 'device' : 'devices'}</strong><span className="accordion-chevron">›</span></summary><div className="accordion-content"><div className="session-toolbar"><span className="security-copy">Manage access to your account.</span>{otherSessions.length > 0 && <button className="security-revoke-all" type="button" onClick={revokeOtherSessions}>Log out others</button>}</div><div className="session-list">
          {currentSessions.length > 0 && <p className="session-group-title">Current device</p>}
          {currentSessions.map((session) => <div className="session-row" key={session.id}><div><strong>{session.device}<span className="session-current">This device</span></strong><span>{session.country} · {session.location} · {session.ip}</span><small>Last active {new Date(session.lastSeen).toLocaleString()}</small></div></div>)}
          {otherSessions.length > 0 && <p className="session-group-title">Other devices</p>}
          {otherSessions.map((session) => <div className="session-row" key={session.id}><div><strong>{session.device}</strong><span>{session.country} · {session.location} · {session.ip}</span><small>Last active {new Date(session.lastSeen).toLocaleString()}</small></div><button className="session-revoke" type="button" onClick={() => revokeSession(session.id)}>Log out</button></div>)}
          {!sessions.length && <span className="security-copy">No active sessions found.</span>}
        </div>{sessionsMessage && <p className="profile-message" role="status">{sessionsMessage}</p>}</div></details>
      </div>
      <div className="profile-actions"><a className="profile-action" href="/">Continue shopping</a><button className="profile-logout" type="button" onClick={() => { window.location.href = '/api/auth/logout' }}>Log out</button></div>
    </section>
  )
}
