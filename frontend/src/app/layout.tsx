import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClerkWrapper from "@/components/ClerkWrapper";
import AuthProvider from "@/components/AuthProvider";
import Header from "@/components/Header";
import PWARegister from "@/components/PWARegister";

export const viewport: Viewport = {
  themeColor: '#13131A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "DebugDuel — 1v1 Real-time Debugging Arena",
  description: "Two developers, one broken codebase. First to find, fix, and explain the bug wins the token pot.",
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'DebugDuel',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#0D0D12", color: "#F0F0F0" }}>
        <PWARegister />
        <ClerkWrapper>
          <AuthProvider>
            <Header />
            <main>
              {children}
            </main>
          </AuthProvider>
        </ClerkWrapper>
      </body>
    </html>
  );
}
