import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Impulse',
  description: 'Approval links and sign-in handoff for Impulse.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
