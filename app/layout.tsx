import type { Metadata } from "next";
import { JetBrains_Mono, Chakra_Petch, Big_Shoulders } from "next/font/google";
import "./globals.css";

const jbmono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bigShoulders = Big_Shoulders({
  variable: "--font-bigshoulders",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

export const metadata: Metadata = {
  title: "BREACHLINE // terminal ops trainer",
  description:
    "A terminal-driven hacking training game. Real methodology, fictional targets. Recon, exploitation, privilege escalation, and lateral movement — the way it actually works.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jbmono.variable} ${chakra.variable} ${bigShoulders.variable} bg-grid bg-scanlines bg-vignette bg-noise antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
