import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "next-auth/react";
import { TokenSyncProvider } from "@/components/providers/token-sync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aliasauto Admin",
  description: "Admin dashboard for Aliasauto platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider
          refetchInterval={5 * 60} // Refetch every 5 minutes (300 seconds)
          refetchOnWindowFocus={false} // Don't refetch on window focus
          refetchWhenOffline={false} // Don't refetch when offline
        >
          <TokenSyncProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
              storageKey="aliasauto-theme"
            >
              <QueryProvider>
                {children}
              </QueryProvider>
            </ThemeProvider>
          </TokenSyncProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
