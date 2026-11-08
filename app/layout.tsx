import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moduli Facili",
  description: "Fai una foto ai documenti: il modulo si compila da solo, lo firmi sul telefono e lo scarichi in PDF.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <header className="top">
          <Link href="/" className="logo">
            Moduli Facili
          </Link>
        </header>
        <main className="wrap">{children}</main>
        <footer className="foot wrap">
          Non salviamo le foto né i tuoi dati: il PDF viene creato sul tuo telefono. Questo servizio non è consulenza
          legale.
        </footer>
      </body>
    </html>
  );
}
