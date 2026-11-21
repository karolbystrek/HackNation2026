"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildTasks } from "@/lib/calc/tasks";
import { useFamily } from "@/lib/use-family";

export default function TabsLayout({ children }: LayoutProps<"/">) {
  const pathname = usePathname();
  const { persona, params, chosen, plan } = useFamily();
  const open = chosen ? buildTasks(persona, chosen, params).filter((t) => !plan.doneTasks.includes(t.id)).length : 0;
  const tabs = [
    { href: "/plan", label: "Oś czasu" },
    { href: "/zadania", label: chosen ? `Do zrobienia (${open})` : "Do zrobienia" },
    { href: "/kalkulator", label: "Kalkulatory" },
  ];

  return (
    <>
      <div className="mx-auto w-full max-w-[980px] px-5 pt-7">
        <nav className="flex overflow-x-auto overflow-y-hidden border-b-2 border-line sm:gap-1.5">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-0.5 flex min-h-12 shrink-0 grow items-center justify-center border-b-4 px-1.5 text-[15px] font-extrabold sm:grow-0 sm:px-[18px] sm:text-base ${active ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink"}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </>
  );
}
