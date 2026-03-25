import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'APEX TRADER — Intelligence Platform',
  description: 'Professional trading intelligence: technicals, options flow, social sentiment, AI analysis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@300;400;600;700;900&family=Barlow:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Barlow', sans-serif" }}>{children}</body>
    </html>
  )
}
