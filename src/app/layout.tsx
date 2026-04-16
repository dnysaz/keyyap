// Force new build
import type { Metadata, Viewport } from "next";
import { Inter, Poppins, Pacifico } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthProvider";
import NotificationHandler from "@/components/NotificationHandler";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KeyYap - Express yourself",
  description: "TikTok for introverts. Share your thoughts, no videos, no photos, just your words.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import GlobalAuthGuard from "@/components/GlobalAuthGuard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${pacifico.variable}`}>
      <body className="min-h-screen bg-white text-gray-900 font-sans">
        <div className="bg-white border-b border-gray-50">
          <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center">
            <div className="w-full max-w-[1050px] flex items-start">
              <div className="flex-1 max-w-2xl py-2 px-4 text-center text-[11px] font-bold text-orange-600 flex items-center justify-center gap-2">
                <span className="border border-orange-500 text-orange-500 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider shrink-0">Public Beta</span>
                <span className="underline decoration-orange-500/50 underline-offset-2">KeyYap is currently in public beta. You may encounter bugs or performance issues.</span>
              </div>
              <div className="hidden lg:block w-[350px] shrink-0" />
            </div>
          </div>
        </div>
        <AuthProvider>
          <GlobalAuthGuard>
            <NotificationHandler />
            {children}
          </GlobalAuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}