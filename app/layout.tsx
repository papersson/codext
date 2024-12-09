import './globals.css'
import { Metadata } from 'next'
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Code Base Context Generator',
  description: 'Generate a code base context prompt',
  icons: {
    icon: '/codext.svg',
    shortcut: '/codext.svg',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
