'use client'

import { useEffect, useState } from 'react'

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

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Consent
        setConsent(parsed)
        setAnalytics(Boolean(parsed.analytics))
        setMarketing(Boolean(parsed.marketing))
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  function save(nextAnalytics: boolean, nextMarketing: boolean) {
    const next: Consent = { necessary: true, analytics: nextAnalytics, marketing: nextMarketing }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setConsent(next)
    setSettingsOpen(false)
  }

  if (consent && !settingsOpen) {
    return (
      <button className="cookie-reopen" onClick={() => setSettingsOpen(true)} aria-label="Cookie-Einstellungen öffnen">
        Cookie-Einstellungen
      </button>
    )
  }

  if (consent && settingsOpen) {
    return (
      <div className="cookie-overlay" role="presentation">
        <section className="cookie-settings" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title">
          <div className="cookie-heading-row">
            <div>
              <p className="cookie-kicker">Rovera</p>
              <h2 id="cookie-settings-title">Cookie-Einstellungen</h2>
            </div>
            <button className="cookie-close" onClick={() => setSettingsOpen(false)} aria-label="Schließen">×</button>
          </div>
          <p className="cookie-copy">Verwalte, welche Speichertechnologien Rovera verwenden darf. Notwendige Einstellungen sind immer aktiv.</p>
          <CookieRow title="Notwendig" description="Sichert Grundfunktionen und deine Einwilligungsentscheidung." locked checked />
          <CookieRow title="Analyse" description="Hilft uns, die Nutzung der Website zu verstehen." checked={analytics} onChange={setAnalytics} />
          <CookieRow title="Marketing" description="Ermöglicht personalisierte Inhalte und Werbung." checked={marketing} onChange={setMarketing} />
          <div className="cookie-actions">
            <button className="cookie-secondary" onClick={() => save(false, false)}>Nur notwendige</button>
            <button className="cookie-primary" onClick={() => save(analytics, marketing)}>Auswahl speichern</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="cookie-banner" role="dialog" aria-labelledby="cookie-title">
      <p className="cookie-kicker">Rovera</p>
      <h2 id="cookie-title">Cookies &amp; Datenschutz</h2>
      <p className="cookie-copy">Wir verwenden notwendige Speichertechnologien für die Website. Optionale Analyse- und Marketing-Cookies sind standardmäßig aus.</p>
      <div className="cookie-actions">
        <button className="cookie-secondary" onClick={() => save(false, false)}>Nur notwendige</button>
        <button className="cookie-secondary" onClick={() => setSettingsOpen(true)}>Einstellungen</button>
        <button className="cookie-primary" onClick={() => save(true, true)}>Alle akzeptieren</button>
      </div>
      <a className="cookie-privacy-link" href="/privacy">Mehr in unserer Privacy Policy</a>
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
