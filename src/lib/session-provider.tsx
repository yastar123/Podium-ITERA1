"use client"

import dynamic from "next/dynamic"

const DynamicSessionProvider = dynamic(
  () => import("next-auth/react").then(m => ({ default: m.SessionProvider })),
  { ssr: false }
)

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <DynamicSessionProvider>{children}</DynamicSessionProvider>
}