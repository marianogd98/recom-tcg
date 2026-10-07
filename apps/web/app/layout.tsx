import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
// Global styles first: component styles imported later can then refine them.
import "./globals.css";
import { SiteFooter } from "../components/SiteFooter/SiteFooter";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "ReCom TCG",
  description: "Find the commanders in your own card pool that make the most of the rest of your collection."
};

/**
 * The shell every page shares: fonts, global styles and the footer.
 * Pages only render what is specific to them inside {children}.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
