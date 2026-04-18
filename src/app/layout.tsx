// Force new build
import type { Metadata, Viewport } from "next";
import { Inter, Poppins, Pacifico } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthProvider";
import NotificationHandler from "@/components/NotificationHandler";
import { supabase } from "@/lib/supabase";

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

export async function generateMetadata(): Promise<Metadata> {
  // Fetch SEO settings from Supabase
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['site_title', 'site_description', 'site_og_image']);

  const settings = data?.reduce((acc: any, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {}) || {};

  const title = settings.site_title || "KeyYap! - The Good Place For Yapping!";
  const description = settings.site_description || "Express yourself freely on KeyYap!, the ultimate social space for text-based sharing and meaningful conversations.";
  const ogImage = settings.site_og_image || 'https://raw.githubusercontent.com/dnysaz/keyyap-image/60b91a4783745207f6de32c73a2aa5b41ae1dc77/keyyap!%20(1).png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    icons: {
      icon: 'https://raw.githubusercontent.com/dnysaz/keyyap-image/60b91a4783745207f6de32c73a2aa5b41ae1dc77/keyyap!%20(1).png',
      apple: 'https://raw.githubusercontent.com/dnysaz/keyyap-image/60b91a4783745207f6de32c73a2aa5b41ae1dc77/keyyap!%20(1).png',
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://keyyap.com'),
  };
}

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
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${pacifico.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 font-sans" suppressHydrationWarning>
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