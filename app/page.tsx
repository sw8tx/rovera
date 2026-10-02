import LoginPanel from './login-panel'

export default function Page() {
  return (
    <main className="marketplace-page">
      <header className="marketplace-nav">
        <a className="brand" href="/" aria-label="Rovera home"><img className="brand-image" src="/rovera-logo.png" alt="Rovera logo" /><span>Rovera</span></a>
        <nav className="main-links" aria-label="Marketplace categories">
          <a className="active" href="#top">Shop</a><a href="#rocket-league">Rocket League</a><a href="#discord">Discord</a><a href="#roblox">Roblox</a><a href="#cs2">CS2</a><a href="#minecraft">Minecraft</a><a href="#tiktok">TikTok</a><a href="#instagram">Instagram</a><a href="#steam">Steam</a>
        </nav>
        <div className="nav-actions"><LoginPanel /></div>
      </header>
      <section className="marketplace-content blank-marketplace" id="top" aria-label="Rovera marketplace"></section>
      <footer className="marketplace-footer"><div className="footer-main"><div className="footer-about"><div className="footer-brand"><img className="brand-image" src="/rovera-logo.png" alt="Rovera logo" /><strong>Rovera</strong></div><p>A simple marketplace for digital game items.<br />Buy from the community. Sell your own stock.</p></div><div className="footer-column"><strong>MARKETPLACE</strong><a href="#top">Browse games</a><a href="#top">Sell stock</a></div><div className="footer-column"><strong>SUPPORT</strong><a href="/privacy/">Help center</a><a href="mailto:help@rovera.xyz">Contact</a></div><div className="footer-column"><strong>INFORMATION</strong><a href="/tos/">Terms</a><a href="/privacy/">Privacy</a></div></div><div className="footer-bottom"><span>© 2026 Rovera</span><span>Digital goods marketplace</span></div></footer>
    </main>
  )
}
