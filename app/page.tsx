const categories = [
  { icon: '/icons/black/rocketleague.svg', name: 'Rocket League', meta: 'Items & Credits' },
  { icon: '/icons/black/roblox.svg', name: 'Roblox', meta: 'Items & Robux' },
  { icon: '/icons/black/counterstrike.svg', name: 'Counter-Strike 2', meta: 'Skins & Items' },
  { icon: '/icons/black/minecraft.svg', name: 'Minecraft', meta: 'Codes & Items' },
  { icon: '/icons/black/steam.svg', name: 'Steam', meta: 'Wallet & Games' },
]

const products = [
  { icon: '/icons/black/rocketleague.svg', category: 'Rocket League', name: 'Fennec - Titanium White', detail: 'PC · Item · Lieferung manuell', price: 'EUR 8,90' },
  { icon: '/icons/black/counterstrike.svg', category: 'CS2', name: 'AK-47 | Redline', detail: 'PC · Field-Tested · Item', price: 'EUR 12,50' },
  { icon: '/icons/black/minecraft.svg', category: 'Minecraft', name: 'Java & Bedrock Edition', detail: 'PC · Digitaler Code · EU', price: 'EUR 19,99' },
  { icon: '/icons/black/roblox.svg', category: 'Roblox', name: 'Roblox Gift Card', detail: 'Digitaler Code · Guthaben', price: 'EUR 10,00' },
]

const benefits = [
  { icon: '✓', title: 'Klare Produktinfos', text: 'Plattform, Region und Artikeltyp direkt auf einen Blick.' },
  { icon: '✓', title: 'Bestand im Blick', text: 'Nur verfuegbare Angebote werden im Sortiment angezeigt.' },
  { icon: '✓', title: 'Hilfe zur Bestellung', text: 'Support mit direktem Bezug zu deiner Bestellung.' },
]

export default function Page() {
  return (
    <main className="marketplace-page">
      <header className="marketplace-nav">
        <a className="brand" href="/" aria-label="Rovera home"><span className="brand-mark">R</span><span>Rovera</span></a>
        <nav className="main-links" aria-label="Marketplace categories">
          <a className="active" href="#marketplace">Shop</a><a href="#rocket-league">Rocket League</a><a href="#roblox">Roblox</a><a href="#cs2">CS2</a><a href="#minecraft">Minecraft</a>
        </nav>
        <div className="nav-actions">
          <label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Search items" placeholder="Spiele, Items & Codes suchen" /></label>
          <a className="cart-button" href="#cart">Warenkorb <b>0</b></a><a className="profile-link" href="#profile">Profil</a>
        </div>
      </header>

      <section className="marketplace-content" id="marketplace">
        <section className="marketplace-hero">
          <div className="hero-copy-block"><p className="eyebrow">ROVERA MARKETPLACE</p><h1>Gaming-Angebote.<br /><span>Klar & direkt.</span></h1><p className="hero-copy">Finde Items, digitale Codes und Gaming-Angebote - uebersichtlich, mit klaren Details und echtem verfuegbarem Bestand.</p><div className="hero-actions"><a className="hero-button" href="#products">Sortiment entdecken <span>→</span></a><a className="secondary-button" href="#how-it-works">So funktioniert's</a></div><p className="availability-note"><span /> Nur verfuegbare Artikel werden angezeigt</p></div>
          <article className="hero-product"><div className="hero-product-art"><span>ROVERA PICK</span><img src="/icons/gray/rocketleague.svg" alt="" /></div><small>ROCKET LEAGUE · ITEM</small><h2>Fennec - Titanium White</h2><div><strong>EUR 8,90</strong><span>Auf Lager</span></div></article>
        </section>

        <div className="section-heading"><div><p className="eyebrow">SHOP NACH PLATTFORM</p><h2>Nach Plattform stoebern</h2></div><a href="#products">Alle Kategorien <span>→</span></a></div>
        <div className="category-grid">{categories.map((category) => <a className="category-card" id={category.name.toLowerCase().replaceAll(' ', '-')} href="#products" key={category.name}><span className="category-icon"><img src={category.icon} alt="" /></span><span><strong>{category.name}</strong><small>{category.meta}</small></span></a>)}</div>

        <div className="section-heading products-heading" id="products"><div><p className="eyebrow">AUSGEWAEHLTER ROVERA-STOCK</p><h2>Angebote im Ueberblick</h2><p className="section-note">Plattform, Artikeltyp und Lieferart direkt erkennbar.</p></div><a href="#marketplace">Zum ganzen Sortiment <span>→</span></a></div>
        <div className="product-grid">{products.map((product) => <article className="product-card" key={product.name}><div className="product-art"><span className="product-label">{product.category}</span><img src={product.icon} alt="" /></div><div className="product-info"><strong>{product.name}</strong><small>{product.detail}</small><div className="product-bottom"><span className="stock"><i />Auf Lager</span><b>{product.price}</b></div></div></article>)}</div>

        <section className="benefit-strip" id="how-it-works"><div><h2>Einfach einkaufen auf Rovera</h2><p>Jeder Artikel zeigt klar, was du bekommst und wie die Lieferung ablaeuft.</p></div>{benefits.map((benefit) => <div className="benefit-card" key={benefit.title}><span className="benefit-icon">{benefit.icon}</span><div><h3>{benefit.title}</h3><p>{benefit.text}</p></div></div>)}</section>
        <footer className="marketplace-footer"><span>© 2026 Rovera · Digitaler Gaming-Shop</span><div><a href="/tos/">Terms</a><a href="/privacy/">Datenschutz</a><a href="mailto:help@rovera.xyz">Support</a></div></footer>
      </section>
    </main>
  )
}
