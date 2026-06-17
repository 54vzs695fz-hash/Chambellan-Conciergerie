import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";
import "./app-shell.css";
import "./section-colors.css";
import "./mobile.css";
import "./status-badges.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Chambellan Concierge",
  description: "Private luxury concierge operating system",
  applicationName: "Chambellan Concierge",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Chambellan Concierge",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Chambellan Concierge",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
