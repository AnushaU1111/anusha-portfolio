import type { Metadata } from "next";
import { Cormorant, JetBrains_Mono } from "next/font/google";
import { profile } from "@/content/profile";
import { Nav } from "@/components/Nav";
import "./globals.css";

const cormorant = Cormorant({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-jetbrains",
  display: "swap",
});

/**
 * Where the site is actually served from, which only the deploy knows: the
 * Pages workflow passes it in. Unset in development, where there is no
 * canonical origin to resolve social-card URLs against.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  title: profile.name,
  description: profile.role,
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  openGraph: { title: profile.name, description: profile.role, type: "website" },
  twitter: { card: "summary_large_image", title: profile.name, description: profile.role },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh bg-bg text-ink" suppressHydrationWarning>
        <Nav />
        {children}
      </body>
    </html>
  );
}
