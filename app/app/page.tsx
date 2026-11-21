import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Baby, CalendarDays, ClipboardList, FileText, Footprints, HeartHandshake, Stethoscope, Users } from "lucide-react";
import { ButtonLink, SectionTitle } from "@/components/ui";
import { formatRate, formatWeeks } from "@/lib/format";
import { defaultParams as p } from "@/lib/params";
import photo from "@/public/home/rodzic-laptop.jpg";

const SERVICES: { icon: LucideIcon; title: string; description: string; href: string }[] = [
  { icon: Stethoscope, title: "Zasiłek chorobowy w ciąży", description: `Przy spełnieniu warunków: ${formatRate(p.rates.full)} podstawy. Odpowiedz na pytania, by przejść do kalkulatora.`, href: "/nowa-os" },
  { icon: Baby, title: "Zasiłek macierzyński", description: "Oblicz wysokość i czas trwania po porodzie.", href: "/nowa-os" },
  { icon: Users, title: "Urlop rodzicielski", description: "Podziel urlop między rodziców i porównaj warianty.", href: "/nowa-os" },
  { icon: Footprints, title: "Urlop ojcowski", description: `Zaplanuj ${p.paternityWeeks * 7} dni dla taty – w całości lub w częściach.`, href: "/nowa-os" },
  { icon: HeartHandshake, title: "Adopcja i rodzina zastępcza", description: "Uprawnienia przy przyjęciu dziecka na wychowanie.", href: "/nowa-os" },
  { icon: FileText, title: "Wnioski i dokumenty", description: "Dowiedz się, który formularz złożyć i do kiedy.", href: "/logowanie" },
];

const STEPS = [
  ["Odpowiedz na pytania", "Powiedz nam, jak pracujesz i kiedy spodziewasz się dziecka."],
  ["Zobacz swoje świadczenia", "Pokażemy, co Ci przysługuje, ile wyniesie zasiłek i jakie masz wybory."],
  ["Złóż dokumenty na czas", "Dostaniesz oś czasu z terminami i listę wniosków do wypełnienia."],
];

const FIGURES = [
  [formatWeeks(p.maternityWeeks[0]), "urlopu macierzyńskiego przy jednym dziecku"],
  [formatWeeks(p.parentalPoolWeeks.single), "urlopu rodzicielskiego do podziału"],
  [`${p.paternityWeeks * 7} dni`, "urlopu ojcowskiego"],
  [formatRate(p.rates.flat), `podstawy za okres objęty stawką uśrednioną, jeśli złożysz wniosek w ciągu ${p.flatRateRequestDays} dni od porodu`],
];

const SOURCES = [
  ["ZUS", "Ubezpieczenie, składki, podstawa wymiaru i zwolnienia e-ZLA"],
  ["KAS", "Dochody z ostatnich 12 miesięcy"],
  ["PESEL", "Dane rodziców i dzieci"],
];

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <section aria-labelledby="hero-title" className="bg-primary-soft">
        <div className="shell grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_auto] lg:gap-12">
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

      <section aria-labelledby="services-title" className="shell py-10 sm:py-14">
        <SectionTitle id="services-title">Załatw sprawę</SectionTitle>
        <p className="mt-2 max-w-[70ch] text-muted-foreground">Wybierz świadczenie, o które chcesz zapytać.</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icon: Icon, title, description, href }) => (
            <li key={title} className="flex">
              <Link href={href} className="group flex w-full gap-4 border border-t-4 border-border border-t-brand bg-background p-5 hover:border-primary hover:shadow-sm">
                <span className="grid size-12 shrink-0 place-items-center bg-primary-soft text-primary">
                  <Icon aria-hidden strokeWidth={1.75} className="size-6" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-bold group-hover:underline">{title}</span>
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

      <section aria-labelledby="figures-title" className="bg-secondary">
        <div className="shell py-10 sm:py-14">
          <SectionTitle id="figures-title">Najważniejsze liczby</SectionTitle>
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

      <section aria-labelledby="sources-title" className="shell py-10 sm:py-14">
        <SectionTitle id="sources-title">Dane używane w symulacji</SectionTitle>
        <p className="mt-2 max-w-[70ch] text-muted-foreground">Wersja demonstracyjna korzysta z przykładowych profili rodzin. Przykładowe dane odpowiadają informacjom z poniższych rejestrów.</p>
        <dl className="mt-6 max-w-[70ch] divide-y border-y">
          {SOURCES.map(([source, description]) => (
            <div key={source} className="grid gap-1 py-3 sm:grid-cols-[6rem_1fr]">
              <dt className="font-bold">{source}</dt>
              <dd>{description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="help-title" className="bg-navy text-navy-foreground [&_:focus-visible]:outline-navy-foreground">
        <div className="shell grid gap-8 py-10 sm:py-14 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-[60ch]">
            <h2 id="help-title" className="text-2xl font-bold sm:text-3xl">Nie wiesz, od czego zacząć?</h2>
            <p className="mt-2">Zacznij od osi czasu – na podstawie kilku odpowiedzi ułożymy plan urlopów i listę zadań.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Link href="/nowa-os" className="inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4 hover:no-underline">
              <CalendarDays aria-hidden className="size-5" /> Utwórz oś czasu
            </Link>
            <Link href="/logowanie" className="inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4 hover:no-underline">
              <ClipboardList aria-hidden className="size-5" /> Zobacz przykładową rodzinę
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
