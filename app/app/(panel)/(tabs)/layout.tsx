"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { buildTasks } from "@/lib/calc/tasks";
import { useFamily } from "@/lib/use-family";

export default function TabsLayout({ children }: LayoutProps<"/">) {
  const pathname = usePathname();
  const { persona, params, chosen, plan, today } = useFamily();
  const remaining = buildTasks(persona, plan.events, chosen, params, plan.doneTasks, today).filter((task) => !task.done).length;
  const tabs = [
    { href: "/plan", label: "Oś czasu" },
    { href: "/zadania", label: `Do zrobienia (${remaining})` },
    { href: "/kalkulator", label: "Kalkulatory" },
  ];

  return (
    <>
      <div className="border-b bg-secondary">
        <nav aria-label="Panel rodziny" className="shell flex flex-wrap gap-x-4 sm:gap-x-8">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "min-h-11 content-center border-b-4 border-transparent py-2 font-bold text-primary hover:underline",
                  active && "border-primary text-foreground",
                )}
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
