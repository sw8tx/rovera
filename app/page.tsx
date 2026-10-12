import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import LoginPanel from "./login-panel";
import ScrollHero from "./components/home/scroll-hero";
import Countdown from "./components/home/countdown";
import "@fontsource-variable/manrope";
import "./home.css";

export const metadata: Metadata = {
  title: "Rovera",
  description: "Your next good thing.",
  alternates: { canonical: "https://rovera.xyz/" },
};

export default function Page() {
  return (
    <main className="marketplace-page rv-home rv-minimal">
      <header className="marketplace-nav">
        <Link className="brand" href="/" aria-label="Rovera home">
          <img className="brand-image" src="/rovera-mark-dark.png" alt="" />
          <span>Rovera</span>
        </Link>
        <nav className="main-links" aria-label="Marketplace categories">
          <a className="active" href="#shop-coming-soon">
            Shop
          </a>
          <a href="mailto:help@rovera.xyz?subject=Sell%20to%20Rovera">Sell to Rovera</a>
          <a href="mailto:help@rovera.xyz?subject=Rovera%20support">Support</a>
        </nav>
        <details className="mobile-menu">
          <summary aria-label="Open navigation menu">Menu</summary>
          <nav aria-label="Mobile navigation">
            <a href="#shop-coming-soon">Shop · Coming soon</a>
            <a href="mailto:help@rovera.xyz?subject=Sell%20to%20Rovera">Sell to Rovera</a>
            <a href="mailto:help@rovera.xyz?subject=Rovera%20support">Support</a>
          </nav>
        </details>
        <div className="nav-actions">
          <a
            className="settings-link"
            href="https://settings.rovera.xyz/profile/"
            aria-label="Open account settings"
            title="Account settings"
          >
            <span aria-hidden="true">⚙</span>
          </a>
          <LoginPanel />
        </div>
      </header>
      <ScrollHero />
      <Countdown />
      <footer className="marketplace-footer">
        <div className="footer-main">
          <div className="footer-about">
            <div className="footer-brand">
              <img className="brand-image" src="/rovera-mark-light.png" alt="" />
              <strong>Rovera</strong>
            </div>
            <p>
              A simple marketplace for digital game items.
              <br />
              Buy from the community. Sell your own stock.
            </p>
          </div>
          <div className="footer-column">
            <strong>MARKETPLACE</strong>
            <a href="#shop-coming-soon">Browse Rovera stock · Coming soon</a>
            <a href="mailto:help@rovera.xyz?subject=Sell%20to%20Rovera">Sell to Rovera</a>
          </div>
          <div className="footer-column">
            <strong>SUPPORT</strong>
            <a href="mailto:help@rovera.xyz?subject=Rovera%20support">Contact support</a>
          </div>
          <div className="footer-column">
            <strong>INFORMATION</strong>
            <a href="/tos/">Terms</a>
            <a href="/privacy/">Privacy</a>
          </div>
          <div className="footer-social" aria-label="Social links">
            <a
              href="https://discord.gg/J4RKz9gSMa"
              target="_blank"
              rel="noreferrer"
              aria-label="Rovera on Discord"
            >
              <img src="/icons/discord.svg" alt="" />
            </a>
            <a
              href="https://www.tiktok.com/@sw8tx"
              target="_blank"
              rel="noreferrer"
              aria-label="Rovera on TikTok"
            >
              <img src="/icons/tiktok.svg" alt="" />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-meta">
            <span>© 2026 Rovera</span>
            <span>All rights reserved</span>
            <span className="footer-badge">
              <a
                href="https://www.dmca.com/Protection/Status.aspx?ID=0252601f-48b4-4191-a660-c7379f1a9de1"
                title="DMCA.com Protection Status"
                className="dmca-badge"
              >
                <img
                  src="https://images.dmca.com/Badges/dmca_protected_sml_120n.png?ID=0252601f-48b4-4191-a660-c7379f1a9de1"
                  alt="DMCA.com Protection Status"
                />
              </a>
            </span>
          </div>
          <div
            className="footer-inline-icons"
            aria-label="Payment and crypto methods"
          >
            <label className="footer-motion-control">
              <input type="checkbox" aria-label="Pause footer animation" />
              <span>Pause motion</span>
            </label>
            <div className="footer-icon-track">
              <img
                className="payment-icon"
                src="/payment-icons/robux.png"
                alt="Roblox"
              />
              <img
                className="payment-icon"
                src="/payment-icons/bitcoin.png"
                alt="Bitcoin"
              />
              <img
                className="payment-icon"
                src="/payment-icons/ethereum.png"
                alt="Ethereum"
              />
              <img
                className="payment-icon"
                src="/payment-icons/litecoin.png"
                alt="Litecoin"
              />
              <img
                className="payment-icon"
                src="/payment-icons/tron.png"
                alt="TRON"
              />
              <img
                className="payment-icon"
                src="/payment-icons/solana.png"
                alt="Solana"
              />
              <img
                className="payment-icon"
                src="/payment-icons/dogecoin.png"
                alt="Dogecoin"
              />
              <img
                className="payment-icon"
                src="/payment-icons/paypal.png"
                alt="PayPal"
              />
              <img
                className="payment-icon"
                src="/payment-icons/gift-card.png"
                alt="Gift card"
              />
              <img
                className="payment-icon"
                src="/payment-icons/robux.png"
                alt=""
                aria-hidden="true"
              />
              <img
                className="payment-icon"
                src="/payment-icons/bitcoin.png"
                alt=""
                aria-hidden="true"
              />
              <img
                className="payment-icon"
                src="/payment-icons/ethereum.png"
                alt=""
                aria-hidden="true"
              />
              <img
                className="payment-icon"
                src="/payment-icons/litecoin.png"
                alt=""
                aria-hidden="true"
              />
            </div>
          </div>
          <span>Digital goods marketplace</span>
        </div>
        <Script
          src="https://images.dmca.com/Badges/DMCABadgeHelper.min.js"
          strategy="afterInteractive"
        />
      </footer>
    </main>
  );
}
