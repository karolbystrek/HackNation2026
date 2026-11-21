import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zasiłkowy Przewodnik Przyszłego Rodzica",
  description: "Zaplanuj urlopy, oszacuj zasiłki i sprawdź terminy składania dokumentów.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-5 focus:z-10 focus:bg-background focus:px-4 focus:py-2 focus:text-primary">
          Przejdź do treści
        </a>
        <SiteHeader />
        {children}
        <footer className="mt-auto bg-navy text-navy-foreground [&_:focus-visible]:outline-navy-foreground">
          <div className="shell grid gap-8 py-10 md:grid-cols-[1fr_auto]">
            <div className="max-w-[60ch]">
              <p className="text-lg font-bold">Zasiłkowy Przewodnik Przyszłego Rodzica</p>
              <p className="mt-2">Projekt demonstracyjny HackNation 2026 – nie jest serwisem ZUS ani gov.pl. Dane i logowanie są symulowane.</p>
            </div>
            <nav aria-labelledby="footer-sources">
              <h2 id="footer-sources" className="font-bold">Oficjalne źródła (serwisy zewnętrzne)</h2>
              <ul className="mt-2 flex flex-col gap-1">
                <li><a href="https://www.zus.pl/" className="underline underline-offset-4 hover:no-underline">zus.pl – Zakład Ubezpieczeń Społecznych</a></li>
                <li><a href="https://www.gov.pl/web/rodzina" className="underline underline-offset-4 hover:no-underline">gov.pl – Ministerstwo Rodziny</a></li>
              </ul>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
