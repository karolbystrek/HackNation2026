import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Baby, Calculator, FileText, HeartHandshake, Stethoscope, Users } from "lucide-react";
import { FamilySettings } from "@/components/family-settings";
import { PanelNav } from "@/components/panel-nav";
import { SessionGuard } from "@/components/session-guard";
import { ButtonLink, SectionTitle } from "@/components/ui";
import photo from "@/public/home/rodzic-laptop.jpg";

const SERVICES: { icon: LucideIcon; title: string; description: string; view: string }[] = [
  { icon: Stethoscope, title: "Zasiłek chorobowy w ciąży", description: "Sprawdź wysokość świadczenia za okres zwolnienia w ciąży.", view: "chorobowy" },
  { icon: Baby, title: "Zasiłek macierzyński i urlopy po porodzie", description: "Oblicz wysokość zasiłku i zaplanuj urlopy, w tym ojcowski.", view: "macierzynski" },
  { icon: Users, title: "Urlop rodzicielski", description: "Podziel urlop między rodziców i porównaj warianty.", view: "rodzicielski" },
  { icon: Calculator, title: "Podstawa wymiaru zasiłku", description: "Oblicz podstawę zasiłku na podstawie wynagrodzeń.", view: "podstawa" },
  { icon: HeartHandshake, title: "Adopcja i rodzina zastępcza", description: "Sprawdź urlopy i zasiłek przy przyjęciu dziecka na wychowanie.", view: "adopcja" },
  { icon: FileText, title: "Wnioski i dokumenty", description: "Sprawdź terminy wniosków i potrzebne dokumenty.", view: "wnioski" },
];

const STEPS = [
  ["Odpowiedz na pytania", "Powiedz nam, jak pracujesz i kiedy spodziewasz się dziecka."],
  ["Zobacz swoje świadczenia", "Pokażemy, co Ci przysługuje, ile wyniesie zasiłek i jakie masz wybory."],
  ["Złóż dokumenty na czas", "Dostaniesz oś czasu z terminami i listę wniosków do wypełnienia."],
];

export default function Home() {
  return (
    <>
      <Suspense>
        <FamilySettings>
          <SessionGuard redirectGuest={false}><PanelNav /></SessionGuard>
        </FamilySettings>
      </Suspense>
      <main id="main-content" tabIndex={-1} className="flex flex-col">
        <section aria-labelledby="hero-title">
          <div className="shell grid items-center gap-8 pt-8 pb-6 sm:pt-12 sm:pb-8 lg:grid-cols-[1fr_auto] lg:gap-12">
            <div className="max-w-[60ch]">
              <h1 id="hero-title" className="text-3xl leading-tight font-bold sm:text-5xl">
                Zasiłki i urlopy dla przyszłych rodziców
              </h1>
              <p className="mt-4 text-lg">
                Sprawdź, co Ci przysługuje, ile wyniesie zasiłek i kiedy złożyć dokumenty – w jednym miejscu, prostym językiem.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/nowa-os" variant="action">Zaplanuj urlop i zasiłek</ButtonLink>
                <ButtonLink href="/logowanie" variant="outline">Zaloguj się do wersji demo</ButtonLink>
              </div>
              <p className="mt-3 text-muted-foreground">Kilka prostych pytań, bez logowania.</p>
            </div>
            <Image src={photo} alt="" priority sizes="(min-width: 1024px) 340px, 16rem" className="w-64 border-b-4 border-brand lg:w-[340px]" />
          </div>
        </section>

        <section aria-labelledby="services-title" className="shell pt-4 pb-10 sm:pt-6 sm:pb-14">
          <SectionTitle id="services-title">Załatw sprawę</SectionTitle>
          <p className="mt-2 max-w-[70ch] text-muted-foreground">Wybierz sprawę, którą chcesz załatwić. Możesz skorzystać z przykładowego profilu rodziny.</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(({ icon: Icon, title, description, view }) => (
              <li key={title} className="flex">
                <Link href={`/logowanie?widok=${view}`} className="flex w-full gap-4 border border-t-4 border-border border-t-brand bg-background p-5 hover:border-primary hover:shadow-sm">
                  <span className="grid size-12 shrink-0 place-items-center bg-primary-soft text-primary">
                    <Icon aria-hidden strokeWidth={1.75} className="size-6" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-bold">{title}</span>
                    <span className="text-muted-foreground">{description}</span>
                  </span>
                  <ArrowRight aria-hidden className="size-5 shrink-0 self-center text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="steps-title" className="border-t">
          <div className="shell py-10 sm:py-14">
            <SectionTitle id="steps-title">Jak to działa</SectionTitle>
            <ol className="mt-6 grid gap-6 md:grid-cols-3">
              {STEPS.map(([title, text], i) => (
                <li key={title} className="flex gap-4">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center bg-primary text-lg font-bold text-primary-foreground">{i + 1}</span>
                  <span>
                    <span className="block text-lg font-bold">{title}</span>
                    <span className="text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </>
  );
}
