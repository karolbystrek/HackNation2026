"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { buildTasks } from "@/lib/calc/tasks";
import { useFamily } from "@/lib/use-family";

export function PanelNav() {
  const pathname = usePathname();
  const { entries, plan } = useFamily();
  const remaining = buildTasks(entries).filter((task) => !task.done && !task.extra).length;
  const tabs = [
    { href: "/plan", label: "Oś czasu" },
    { href: "/zadania", label: `Do zrobienia (${remaining})` },
    { href: plan.calculatorHref ?? "/kalkulator", label: "Kalkulatory" },
    { href: "/swiadczenia", label: "Świadczenia" },
    { href: "/wnioski", label: "Wnioski" },
  ];

  return (
    <div className="border-b bg-background">
      <nav aria-label="Panel rodziny" className="shell flex flex-wrap gap-x-4 sm:gap-x-8">
        {tabs.map((tab) => {
          const tabPath = tab.href.split("?")[0];
          const active = pathname === tabPath || (tabPath === "/plan" && pathname === "/dodaj");
          return (
            <Link
              key={tabPath}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "min-h-12 content-center border-b-4 border-transparent py-2 font-bold text-primary hover:border-border hover:underline",
                active && "border-brand text-foreground hover:border-brand hover:no-underline",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
