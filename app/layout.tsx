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

export const metadata: Metadata = {
  title: profile.name,
  description: profile.role,
  // TODO set metadataBase to the production domain before launch
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
