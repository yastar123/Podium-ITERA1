import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import SessionProvider from "@/lib/session-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ticket War - Campus Event Ticketing",
  description: "MVP ticket system for campus events",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}