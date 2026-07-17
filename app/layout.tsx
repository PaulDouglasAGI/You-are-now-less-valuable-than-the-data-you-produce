import type { Metadata } from "next";
import { JetBrains_Mono, Rajdhani } from "next/font/google";
import "./globals.css";

const jbmono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
      <body className={`${jbmono.variable} ${rajdhani.variable} bg-grid bg-scanlines bg-vignette antialiased`}>
        {children}
      </body>
    </html>
  );
}
