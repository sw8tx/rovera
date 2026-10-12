'use client'

import { useEffect, useRef, useState } from 'react'

type Consent = {
  necessary: true
  analytics: boolean
  marketing: boolean
}

const STORAGE_KEY = 'rovera-cookie-consent'

export default function CookieConsent() {
  const [consent, setConsent] = useState<Consent | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [language, setLanguage] = useState<'en' | 'de'>('en')
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedLanguage = window.localStorage.getItem('rovera-language')
      if (savedLanguage === 'en' || savedLanguage === 'de') setLanguage(savedLanguage)
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Consent
          setConsent(parsed)
          setAnalytics(Boolean(parsed.analytics))
          setMarketing(Boolean(parsed.marketing))
        } catch {
          window.localStorage.removeItem(STORAGE_KEY)
          setSettingsOpen(true)
        }
      } else {
        setSettingsOpen(true)
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!settingsOpen) return
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
        setSettingsOpen(false)
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
      window.requestAnimationFrame(() => {
        const fallbackOpener = document.querySelector<HTMLElement>('.cookie-reopen, .cookie-banner [data-cookie-opener]')
        const target = openerRef.current?.isConnected ? openerRef.current : fallbackOpener
        target?.focus()
      })
    }
  }, [settingsOpen])

  function save(nextAnalytics: boolean, nextMarketing: boolean) {
    const next: Consent = { necessary: true, analytics: nextAnalytics, marketing: nextMarketing }
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* Keep the in-memory choice for this page view. */ }
    setConsent(next)
    setSettingsOpen(false)
  }

  if (consent && !settingsOpen) {
    return (
      <button className="cookie-reopen" data-cookie-opener onClick={(event) => { openerRef.current = event.currentTarget; setSettingsOpen(true) }} aria-label="Cookie-Einstellungen öffnen">
        Cookie-Einstellungen
      </button>
    )
  }

  if (settingsOpen) {
    return (
      <div ref={overlayRef} className="cookie-overlay" role="presentation" suppressHydrationWarning>
        <section ref={dialogRef} className="cookie-settings" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title" tabIndex={-1}>
          <div className="cookie-heading-row">
            <div>
              <p className="cookie-kicker">Rovera</p>
              <h2 id="cookie-settings-title">{language === 'de' ? 'Cookie-Einstellungen' : 'Cookie settings'}</h2>
            </div>
            <button className="cookie-close" onClick={() => setSettingsOpen(false)} aria-label={language === 'de' ? 'Schließen' : 'Close'}>×</button>
          </div>
          <p className="cookie-copy">{language === 'de' ? 'Verwalte, welche Speichertechnologien Rovera verwenden darf. Notwendige Einstellungen sind immer aktiv.' : 'Choose which storage technologies Rovera may use. Necessary storage is always enabled.'}</p>
          <CookieRow title={language === 'de' ? 'Notwendig' : 'Necessary'} description={language === 'de' ? 'Sichert Grundfunktionen und deine Einwilligungsentscheidung.' : 'Supports core features and stores your consent choice.'} locked checked />
          <CookieRow title={language === 'de' ? 'Analyse' : 'Analytics'} description={language === 'de' ? 'Hilft uns, die Nutzung der Website zu verstehen.' : 'Helps us understand how the website is used.'} checked={analytics} onChange={setAnalytics} />
          <CookieRow title={language === 'de' ? 'Marketing' : 'Marketing'} description={language === 'de' ? 'Ermöglicht personalisierte Inhalte und Werbung.' : 'Allows personalized content and advertising.'} checked={marketing} onChange={setMarketing} />
          <div className="cookie-actions" suppressHydrationWarning>
            <button className="cookie-secondary" onClick={() => save(false, false)}>{language === 'de' ? 'Nur notwendige' : 'Necessary only'}</button>
            <button className="cookie-primary" onClick={() => save(analytics, marketing)}>{language === 'de' ? 'Auswahl speichern' : 'Save choices'}</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="cookie-banner" role="dialog" aria-labelledby="cookie-title" suppressHydrationWarning>
      <p className="cookie-kicker">Rovera</p>
      <h2 id="cookie-title">{language === 'de' ? 'Cookies & Datenschutz' : 'Cookies & privacy'}</h2>
      <p className="cookie-copy">{language === 'de' ? 'Wir verwenden notwendige Speichertechnologien für die Website. Optionale Analyse- und Marketing-Cookies sind standardmäßig aus.' : 'We use necessary storage for the website. Optional analytics and marketing are off by default.'}</p>
      <div className="cookie-actions" suppressHydrationWarning>
        <button className="cookie-secondary" onClick={() => save(false, false)}>{language === 'de' ? 'Nur notwendige' : 'Necessary only'}</button>
        <button className="cookie-secondary" data-cookie-opener onClick={(event) => { openerRef.current = event.currentTarget; setSettingsOpen(true) }}>{language === 'de' ? 'Einstellungen' : 'Settings'}</button>
        <button className="cookie-primary" onClick={() => save(true, true)}>{language === 'de' ? 'Alle akzeptieren' : 'Accept all'}</button>
      </div>
      <a className="cookie-privacy-link" href="/privacy">{language === 'de' ? 'Mehr in unserer Privacy Policy' : 'Read our Privacy Policy'}</a>
    </div>
  )
}

function CookieRow({ title, description, checked, locked, onChange }: { title: string; description: string; checked: boolean; locked?: boolean; onChange?: (checked: boolean) => void }) {
  return (
    <div className="cookie-row">
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <button className={`cookie-switch ${checked ? 'is-on' : ''}`} disabled={locked} onClick={() => onChange?.(!checked)} aria-label={`${title} ${checked ? 'deaktivieren' : 'aktivieren'}`} aria-pressed={checked}>
        <span />
      </button>
    </div>
  )
}
