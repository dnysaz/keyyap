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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${pacifico.variable}`}>
      <body className="min-h-screen bg-white text-gray-900 font-sans">
        <AuthProvider>
          <NotificationHandler />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}