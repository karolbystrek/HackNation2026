import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Przewodnik Rodzica",
  description: "Zaplanujcie urlop i zasiłki z ZUS – razem i na spokojnie.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
