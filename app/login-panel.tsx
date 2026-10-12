'use client'

import { useEffect, useRef, useState } from 'react'

type SessionUser = {
  id?: string
  provider?: string
  name?: string
  email?: string
  picture?: string
}

async function readApiResponse(response: Response) {
  const body = await response.text()
  if (!body) return {}
  try {
    return JSON.parse(body) as { error?: string }
  } catch {
    return { error: 'Der Login-Dienst ist gerade nicht erreichbar. Bitte lade die Seite neu und versuche es erneut.' }
  }
}

export default function LoginPanel() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailError, setEmailError] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get('authError')
    if (authError === 'discord_denied' || authError === 'discord_failed' || authError === 'account_deactivated') {
      window.requestAnimationFrame(() => {
        setOpen(true)
        setEmailError(authError === 'account_deactivated'
          ? 'This account is temporarily deactivated. Contact help@rovera.xyz to request reactivation.'
          : authError === 'discord_denied' ? 'Discord-Anmeldung abgebrochen.' : 'Discord-Anmeldung konnte nicht abgeschlossen werden.')
      })
      window.history.replaceState({}, '', window.location.pathname)
    }
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : null)
      .then((session) => setUser(session?.user ?? session ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!open) return
    const overlay = overlayRef.current
    const dialog = dialogRef.current
    if (!overlay || !dialog) return
    const activeDialog = dialog
    const inerted: Array<{ element: HTMLElement; inert: boolean; ariaHidden: string | null }> = []
    let branch: HTMLElement | null = overlay
    while (branch) {
      const parent: HTMLElement | null = branch.parentElement
      if (!parent) break
      for (const sibling of Array.from(parent.children)) {
        if (sibling === branch || !(sibling instanceof HTMLElement)) continue
        inerted.push({ element: sibling, inert: sibling.inert, ariaHidden: sibling.getAttribute('aria-hidden') })
        sibling.inert = true
        sibling.setAttribute('aria-hidden', 'true')
      }
      if (parent === document.body) break
      branch = parent
    }
    const focusables = () => Array.from(activeDialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
    window.requestAnimationFrame(() => (focusables()[0] || activeDialog).focus())
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      } else if (event.key === 'Tab') {
        const items = focusables()
        if (!items.length) { event.preventDefault(); activeDialog.focus(); return }
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      for (const item of inerted) {
        item.element.inert = item.inert
        if (item.ariaHidden === null) item.element.removeAttribute('aria-hidden')
        else item.element.setAttribute('aria-hidden', item.ariaHidden)
      }
      if (openerRef.current?.isConnected) openerRef.current.focus()
    }
  }, [open])

  function startDiscordLogin() {
    const initialUserId = user?.id || ''
    const popup = window.open('/api/auth/discord', 'rovera-discord-login', 'popup,width=520,height=720,resizable=yes,scrollbars=yes')
    if (!popup) {
      window.location.href = '/api/auth/discord'
      return
    }
    const startedAt = Date.now()
    const poll = window.setInterval(async () => {
      if (Date.now() - startedAt > 120000 || popup.closed) {
        window.clearInterval(poll)
        return
      }
      try {
        const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
        const session = response.ok ? await response.json() : null
        if (session?.user && (!initialUserId || session.user.id !== initialUserId)) {
          window.clearInterval(poll)
          popup.close()
          window.location.reload()
        }
      } catch {}
    }, 700)
  }

  async function requestEmailCode() {
    setEmailBusy(true)
    setEmailError('')
    try {
      const response = await fetch('/api/auth/email/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const result = await readApiResponse(response)
      if (!response.ok) throw new Error(result.error || 'The email could not be sent.')
      setEmailSent(true)
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'The email could not be sent.')
    } finally { setEmailBusy(false) }
  }

  async function verifyEmailCode() {
    setEmailBusy(true)
    setEmailError('')
    try {
      const response = await fetch('/api/auth/email/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
      const result = await readApiResponse(response)
      if (!response.ok) throw new Error(result.error || 'The code could not be verified.')
      window.location.reload()
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'The code could not be verified.')
      setEmailBusy(false)
    }
  }

  if (loading) return <span className="login-loading" aria-hidden="true" />

  if (user) {
    return (
      <div className="logged-in-user">
        {user.picture && <img src={user.picture} alt="" className="logged-in-avatar" />}
        <a className="logged-in-name" href="https://settings.rovera.xyz/profile/">{user.name || user.email || 'Account'}</a>
        <button className="logout-button" type="button" onClick={() => { window.location.href = '/api/auth/logout' }}>Log out</button>
      </div>
    )
  }

  return (
    <>
      <button className="login-button" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={(event) => { openerRef.current = event.currentTarget; setOpen(true) }}>
        Log in
      </button>

      {open && (
        <div ref={overlayRef} className="login-overlay" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setOpen(false)
        }}>
          <section ref={dialogRef} className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" tabIndex={-1}>
            <button className="login-close" type="button" aria-label="Close login" onClick={() => setOpen(false)}>×</button>
            <p className="login-kicker">ROVERA ACCOUNT</p>
            <h2 id="login-title">Welcome back</h2>
            <p className="login-copy">Sign in to manage your orders, saved items, and account details.</p>
            <button className="google-login" type="button" onClick={() => { window.location.href = '/api/auth/google' }}><img className="google-mark" src="/google-g.svg" alt="" />Continue with Google</button>
            <button className="discord-login" type="button" onClick={startDiscordLogin}><img src="/icons/discord.svg" alt="" />Login with Discord</button>
            <div className="login-divider"><span>or</span></div>
            {!emailSent ? <>
              <label className="login-label" htmlFor="login-email">Email address</label>
              <input className="login-input" id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
              <button className="email-login" type="button" onClick={requestEmailCode} disabled={emailBusy || !email}>{emailBusy ? 'Sending…' : 'Continue with email'}</button>
              <p className="login-note">We&apos;ll send a one-time code from help@rovera.xyz.</p>
            </> : <>
              <label className="login-label" htmlFor="login-code">Enter your code</label>
              <input className="login-input login-code-input" id="login-code" type="text" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="RO-123456" maxLength={9} autoComplete="one-time-code" />
              <button className="email-login" type="button" onClick={verifyEmailCode} disabled={emailBusy || !code}>{emailBusy ? 'Checking…' : 'Verify code'}</button>
              <p className="login-note">The code is valid for 8 minutes. Sent to {email}.</p>
            </>}
            {emailError && <p className="login-error" role="alert">{emailError}</p>}
          </section>
        </div>
      )}
    </>
  )
}
