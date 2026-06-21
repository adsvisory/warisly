import type { Metadata, Viewport } from "next";
import { Fraunces, Spectral, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-fraunces", display: "swap" });
const spectral = Spectral({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-spectral", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Warisly — Waris aman, keluarga tenang",
  description: "Catat aset Anda dan langkah agar keluarga bisa menemukan dan mengklaimnya. Kami tidak pernah minta password Anda.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#20274B", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${fraunces.variable} ${spectral.variable} ${inter.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
