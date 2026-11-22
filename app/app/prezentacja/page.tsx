import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Baby, CalendarDays, ChevronRight, ClipboardList, FileText, Footprints, HeartHandshake, Info, Stethoscope, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { formatRate, formatWeeks } from "@/lib/format";
import { defaultParams as p } from "@/lib/params";

export const metadata: Metadata = {
  title: "Prezentacja stylu – Zasiłkowy Przewodnik Przyszłego Rodzica",
};

const SERVICES: { icon: LucideIcon; title: string; description: string; href: string }[] = [
  { icon: Stethoscope, title: "Zasiłek chorobowy w ciąży", description: "Sprawdź, ile dostaniesz na zwolnieniu z kodem B.", href: "/nowa-os" },
  { icon: Baby, title: "Zasiłek macierzyński", description: "Oblicz wysokość i czas trwania po porodzie.", href: "/nowa-os" },
  { icon: Users, title: "Urlop rodzicielski", description: "Podziel urlop między rodziców i porównaj warianty.", href: "/nowa-os" },
  { icon: Footprints, title: "Urlop ojcowski", description: `Zaplanuj ${p.paternityWeeks * 7} dni dla taty – w całości lub w częściach.`, href: "/nowa-os" },
  { icon: HeartHandshake, title: "Adopcja i rodzina zastępcza", description: "Uprawnienia przy przyjęciu dziecka na wychowanie.", href: "/nowa-os" },
  { icon: FileText, title: "Wnioski i dokumenty", description: "Dowiedz się, który wniosek złożyć i do kiedy.", href: "/logowanie" },
];

const STEPS = [
  ["Odpowiedz na pytania", "Powiedz nam, jak pracujesz i kiedy spodziewasz się dziecka."],
  ["Zobacz swoje świadczenia", "Pokażemy kwoty, okresy i porównamy podział urlopu."],
  ["Złóż dokumenty na czas", "Dostaniesz listę wniosków z terminami."],
];

const SHORTCUTS = [
  ["Kalkulator podstawy wymiaru", "/nowa-os"],
  ["Terminy składania wniosków", "/logowanie"],
  ["Logowanie do wersji demo", "/logowanie"],
];

const FIGURES = [
  [formatWeeks(p.maternityWeeks[0]), "urlopu macierzyńskiego przy jednym dziecku"],
  [formatWeeks(p.parentalPoolWeeks.single), "urlopu rodzicielskiego do podziału"],
  [`${p.paternityWeeks * 7} dni`, "urlopu ojcowskiego"],
  [formatRate(p.rates.flat), `podstawy za cały okres, jeśli złożysz wniosek w ciągu ${p.flatRateRequestDays} dni od porodu`],
];

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-2xl leading-tight font-bold before:mb-3 before:block before:h-1 before:w-12 before:bg-brand sm:text-3xl">
      {children}
    </h2>
  );
}

export default function Prezentacja() {
  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <p className="bg-secondary">
        <span className="shell block py-2 text-sm text-muted-foreground">
          Projekt demonstracyjny HackNation 2026 – nie jest serwisem ZUS ani gov.pl.
        </span>
      </p>

      {/* Hero band */}
      <section aria-labelledby="hero-title">
        <div className="shell grid gap-10 pt-8 pb-6 sm:pt-12 sm:pb-8 lg:grid-cols-[1fr_20rem]">
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
          </div>
          <nav aria-labelledby="shortcuts-title" className="self-start border-t-4 border-t-primary bg-background p-5">
            <h2 id="shortcuts-title" className="text-lg font-bold">Na skróty</h2>
            <ul className="mt-2 divide-y border-y">
              {SHORTCUTS.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="flex min-h-11 items-center justify-between gap-3 py-2 text-primary hover:bg-secondary">
                    <span>{label}</span>
                    <ChevronRight aria-hidden className="size-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {/* Service tiles */}
      <section aria-labelledby="services-title" className="shell pt-4 pb-10 sm:pt-6 sm:pb-14">
        <SectionHeading id="services-title">Załatw sprawę</SectionHeading>
        <p className="mt-2 max-w-[70ch] text-muted-foreground">Wybierz świadczenie, o które chcesz zapytać.</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icon: Icon, title, description, href }) => (
            <li key={title} className="flex">
              <Link href={href} className="flex w-full gap-4 border border-t-4 border-border border-t-brand bg-background p-5 hover:border-primary hover:shadow-sm">
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

      {/* Steps */}
      <section aria-labelledby="steps-title" className="border-t">
        <div className="shell py-10 sm:py-14">
          <SectionHeading id="steps-title">Jak to działa</SectionHeading>
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

      {/* Key figures */}
      <section aria-labelledby="figures-title" className="bg-secondary">
        <div className="shell py-10 sm:py-14">
          <SectionHeading id="figures-title">Najważniejsze liczby</SectionHeading>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FIGURES.map(([value, label]) => (
              <div key={label} className="flex flex-col border-l-4 border-primary bg-background p-5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="order-first text-4xl leading-tight font-bold text-primary">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Important notice */}
      <section aria-label="Ważne" className="shell py-10 sm:py-14">
        <div className="flex max-w-[70ch] gap-4 border-l-4 border-action bg-warning-soft p-5">
          <Info aria-hidden className="mt-0.5 size-6 shrink-0 text-action-foreground" />
          <div>
            <p className="font-bold">Ważne: nowe druki od 24 października 2026</p>
            <p className="mt-1">
              Wnioski ZUR i ZAO połączono z wnioskiem ZAM, a zaświadczenie Z-3b nie jest już używany. Nasz przewodnik pokazuje tylko aktualne druki.
            </p>
            <a href="https://www.zus.pl/" className="text-link mt-2 inline-block">Oficjalne informacje na zus.pl (serwis zewnętrzny)</a>
          </div>
        </div>
      </section>

      {/* Help band */}
      <section aria-labelledby="help-title" className="bg-navy text-navy-foreground [&_:focus-visible]:outline-navy-foreground">
        <div className="shell grid gap-8 py-10 sm:py-14 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-[60ch]">
            <h2 id="help-title" className="text-2xl font-bold sm:text-3xl">Nie wiesz, od czego zacząć?</h2>
            <p className="mt-2">Zacznij od osi czasu – na podstawie kilku odpowiedzi ułożymy plan urlopów i listę zadań.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/nowa-os" variant="action">
              <CalendarDays aria-hidden className="size-5" /> Utwórz oś czasu
            </ButtonLink>
            <Link href="/logowanie" className="inline-flex min-h-11 items-center gap-2 font-bold">
              <ClipboardList aria-hidden className="size-5" /> Zobacz przykładową rodzinę
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
