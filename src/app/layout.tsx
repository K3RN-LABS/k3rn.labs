import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" })

export const metadata: Metadata = {
  title: "k3rn.labs — Cognitive Workspace",
  description: "Deterministic cognitive workspace for structured innovation",
  icons: {
    icon: [
      { url: "/logo-icon/favicon.ico" },
      { url: "/logo-icon/logo.svg", type: "image/svg+xml" }
    ],
    apple: "/logo-icon/logo_01.png",
  },
  openGraph: {
    title: "k3rn.labs",
    description: "Deterministic cognitive workspace for structured innovation",
    images: [{ url: "/logo-icon/logo2.svg", width: 1200, height: 630, alt: "k3rn.labs" }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jakarta.variable}`}>
      <head>
        {/* Preload LCP image — KAEL is the largest visible element on landing */}
        <link rel="preload" href="/images/experts/Kael.webp" as="image" />
      </head>
      <body className="font-sans antialiased text-foreground bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
