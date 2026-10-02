import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["400", "500", "600"] });
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Gymora",
  description: "Evidence-based training plans for natural lifters",
  // "Add to Home Screen" opens full screen, like an app
  appleWebApp: { capable: true, title: "Gymora", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

// viewport-fit=cover lets env(safe-area-inset-*) work on iPhones (notch, home indicator)
export const viewport: Viewport = { themeColor: "#eef0ec", viewportFit: "cover" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}>
      {/* Browser extensions (e.g. ColorZilla) add attributes to <body>; don't treat that as a hydration error */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
