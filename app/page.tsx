export default function Page() {
  return (
    <main className="rovera-page">
      <header className="rovera-taskbar">
        <img className="rovera-logo" src="/rovera-logo.png" alt="Rovera" />
      </header>
      <footer className="rovera-footer" aria-label="Legal pages">
        <a href="/tos">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="/refund">Refund</a>
      </footer>
    </main>
  )
}
