

import type React from "react"
import "./globals.css"
import type { Metadata, Viewport } from "next" // ✅ Add Viewport
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import SessionProvider from "@/components/session-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "sonner"
import SWRegistrar from "@/components/sw-registrar"

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap', // ✅ Better font loading
})

export const metadata: Metadata = {
  title: {
    default: "Office Chat App",
    template: "%s | Office Chat App" // ✅ Dynamic title
  },
  description: "Chat and task management for your organization",
  generator: "Abdul Raheem",
  keywords: ["chat", "task management", "office", "collaboration"], // ✅ SEO
  authors: [{ name: "Abdul Raheem" }],
  creator: "Abdul Raheem",
  publisher: "Abdul Raheem",
}

// ✅ Add viewport for better mobile experience
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider session={session}>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange // ✅ Smoother theme switching
            >
              <SWRegistrar />
              {children}
              <Toaster 
                position="top-center" 
                richColors 
                closeButton 
                duration={4000} // ✅ Custom duration
              />
            </ThemeProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  )
}