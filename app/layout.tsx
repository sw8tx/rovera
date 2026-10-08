import type { Metadata } from "next";
import "./globals.css";
import CookieConsent from "./components/CookieConsent";

export const metadata: Metadata = {
  title: "Rovera",
  description: "Rovera",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}<CookieConsent /></body>
    </html>
  );
}
