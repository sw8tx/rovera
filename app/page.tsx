const categories = [
  { icon: '/assets/icons/black/rocketleague.svg', name: 'Rocket League', meta: 'Items & Credits' },
  { icon: '/assets/icons/black/discord.svg', name: 'Discord', meta: 'Nitro & Boosts' },
  { icon: '/assets/icons/black/roblox.svg', name: 'Roblox', meta: 'Items & Robux' },
  { icon: '/assets/icons/black/counterstrike.svg', name: 'Counter-Strike 2', meta: 'Skins & Items' },
  { icon: '/assets/icons/black/minecraft.svg', name: 'Minecraft', meta: 'Codes & Items' },
  { icon: '/assets/icons/black/tiktok.svg', name: 'TikTok', meta: 'Accounts & Likes' },
  { icon: '/assets/icons/black/instagram.svg', name: 'Instagram', meta: 'Accounts & Followers' },
  { icon: '/assets/icons/black/steam.svg', name: 'Steam', meta: 'Wallet & Games' },
]

const products = [
  { image: '/assets/images/rocketleague-car-card.svg', category: 'Rocket League', name: 'Fennec - Titanium White', detail: 'PC · Item · Manual delivery', price: 'EUR 8.90' },
  { image: '/assets/images/cs2-rifle-card.svg', category: 'CS2', name: 'AK-47 | Redline', detail: 'PC · Field-Tested · Item', price: 'EUR 12.50' },
  { image: '/assets/images/minecraft-block-card.svg', category: 'Minecraft', name: 'Java & Bedrock Edition', detail: 'PC · Digital code · EU', price: 'EUR 19.99' },
  { image: '/assets/images/roblox-item-card.svg', category: 'Roblox', name: 'Roblox Gift Card', detail: 'Digital code · Credit', price: 'EUR 10.00' },
  { image: '/assets/images/community-card.svg', category: 'Social', name: 'Community Package', detail: 'Digital service · Direct delivery', price: 'EUR 6.99' },
  { image: '/assets/images/digital-code-card.svg', category: 'Digital', name: 'Digital Code', detail: 'Instant delivery · EU', price: 'EUR 14.99' },
]

const benefits = [
  { icon: '✓', title: 'Clear product details', text: 'Platform, region, and item type at a glance.' },
  { icon: '✓', title: 'Stock you can trust', text: 'Only available offers are shown in the marketplace.' },
  { icon: '✓', title: 'Order support', text: 'Get help with direct context about your order.' },
]

export default function Page() {
  return (
    <main className="marketplace-page">
      <header className="marketplace-nav">
        <a className="brand" href="/" aria-label="Rovera home"><span className="brand-mark">R</span><span>Rovera</span></a>
        <nav className="main-links" aria-label="Marketplace categories">
          <a className="active" href="#marketplace">Shop</a><a href="#rocket-league">Rocket League</a><a href="#discord">Discord</a><a href="#roblox">Roblox</a><a href="#cs2">CS2</a><a href="#minecraft">Minecraft</a><a href="#tiktok">TikTok</a><a href="#instagram">Instagram</a><a href="#steam">Steam</a>
        </nav>
        <div className="nav-actions">
          <label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Search items" placeholder="Spiele, Items & Codes suchen" /></label>
          <a className="cart-button" href="#cart">Warenkorb <b>0</b></a><a className="profile-link" href="#profile">Profil</a>
        </div>
      </header>

      <section className="marketplace-content" id="marketplace">
        <section className="marketplace-hero">
          <div className="hero-copy-block"><p className="eyebrow">ROVERA MARKETPLACE</p><h1>Gaming goods.<br /><span>Clear & direct.</span></h1><p className="hero-copy">Find items, digital codes, and gaming offers in one place - with clear details and real availability.</p><div className="hero-actions"><a className="hero-button" href="#products">Explore the range <span>→</span></a><a className="secondary-button" href="#products">View products</a></div><p className="availability-note"><span /> Only available items are shown</p></div>
          <article className="hero-product"><div className="hero-product-art"><span>ROVERA PICK</span><img src="/assets/images/rocketleague-car-card.svg" alt="Rocket League item" /></div><small>ROCKET LEAGUE · ITEM</small><h2>Fennec - Titanium White</h2><div><strong>EUR 8.90</strong><span>In stock</span></div></article>
        </section>

        <div className="section-heading"><div><p className="eyebrow">SHOP BY PLATFORM</p><h2>Browse by platform</h2></div><a href="#products">All categories <span>→</span></a></div>
        <div className="category-grid">{categories.map((category) => <a className="category-card" id={category.name.toLowerCase().replaceAll(' ', '-')} href="#products" key={category.name}><span className="category-icon"><img src={category.icon} alt="" /></span><span><strong>{category.name}</strong><small>{category.meta}</small></span></a>)}</div>

        <div className="section-heading products-heading" id="products"><div><p className="eyebrow">FEATURED ROVERA STOCK</p><h2>Featured digital goods</h2><p className="section-note">Platform, item type, and delivery method are clear at a glance.</p></div><a href="#marketplace">View the full range <span>→</span></a></div>
        <div className="product-grid">{products.map((product) => <article className="product-card" key={product.name}><div className="product-art"><span className="product-label">{product.category}</span><img src={product.image} alt="" /></div><div className="product-info"><strong>{product.name}</strong><small>{product.detail}</small><div className="product-bottom"><span className="stock"><i />In stock</span><b>{product.price}</b></div></div></article>)}</div>

        <footer className="marketplace-footer"><span>© 2026 Rovera · Digital gaming shop</span><div><a href="/tos/">Terms</a><a href="/privacy/">Privacy</a><a href="mailto:help@rovera.xyz">Support</a></div></footer>
      </section>
    </main>
  )
}
