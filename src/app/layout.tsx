import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "k3rn.labs — Cognitive Workspace",
  description: "Deterministic cognitive workspace for structured innovation",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
  openGraph: {
    title: "k3rn.labs",
    description: "Deterministic cognitive workspace for structured innovation",
    images: [{ url: "/logo-icon/logo2.svg", width: 1200, height: 630, alt: "k3rn.labs" }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
