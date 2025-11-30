import type { Metadata } from "next"
import { Inter, Playfair_Display, Amiri } from 'next/font/google'
import "./globals.css"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const amiri = Amiri({ 
  weight: ["400", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-amiri",
  display: "swap",
})

export const metadata: Metadata = {
  title: "BIZRA | The World's First Mathematical Consciousness Safety System",
  description: "From darkness to light. The first AGI with mathematical Ihsan bounds.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${playfair.variable} ${amiri.variable} font-sans antialiased bg-deep-navy text-soft-white overflow-x-hidden`}>
        {children}
      </body>
    </html>
  )
}
