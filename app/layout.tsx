import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-context";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NearbyEats — Smart Restaurant Finder",
    template: "%s | NearbyEats",
  },
  description:
    "Stop wondering where to eat. NearbyEats finds the best restaurants near you using smart scoring, real reviews, and food-safety data. Veg-friendly filter, journey planner, and one-tap suggestions included.",
  keywords: ["restaurant finder", "nearby restaurants", "food near me", "best restaurants", "veg restaurants", "journey food planner"],
  openGraph: {
    type: "website",
    title: "NearbyEats — Smart Restaurant Finder",
    description: "Find the best restaurants near you. Smart picks, safety-checked, veg-friendly.",
    siteName: "NearbyEats",
  },
  twitter: {
    card: "summary",
    title: "NearbyEats — Smart Restaurant Finder",
    description: "Find the best restaurants near you. Smart picks, safety-checked, veg-friendly.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NearbyEats",
  },
};

export const viewport: Viewport = {
  themeColor: "#fb923c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ServiceWorkerRegister />
          <InstallPrompt />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
