import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zasiłkowy Przewodnik Przyszłego Rodzica",
  description: "Zaplanuj urlopy, oszacuj zasiłki i sprawdź terminy składania dokumentów.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl">
      <body className="flex min-h-dvh flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-5 focus:z-10 focus:bg-background focus:px-4 focus:py-2 focus:text-primary">
          Przejdź do treści
        </a>
        <SiteHeader />
        {children}
        <footer className="mt-auto border-t bg-secondary">
          <p className="shell py-5 text-sm text-muted-foreground">Projekt demonstracyjny HackNation 2026. Dane i logowanie są symulowane.</p>
        </footer>
      </body>
    </html>
  );
}
