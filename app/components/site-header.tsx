"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { findPersona } from "@/lib/mock/personas";
import { logOut, usePlan } from "@/lib/plan-store";

export function SiteHeader() {
  const persona = findPersona(usePlan().personaId);
  const router = useRouter();

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex min-h-[62px] max-w-[980px] flex-wrap items-center gap-x-4 gap-y-1 px-5 py-[9px]">
        <Link href={persona ? "/plan" : "/"} className="flex grow items-center gap-2.5">
          <span className="flex size-[34px] items-center justify-center rounded-full bg-brand text-sm font-black text-white">PR</span>
          <span className="text-[17px] font-extrabold">Przewodnik Rodzica</span>
        </Link>
        {persona && (
          <div className="flex items-center gap-4 text-sm font-bold text-muted">
            <Link href="/rodzina" className="flex items-center gap-2 hover:text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="8" r="3.5" />
                <circle cx="17" cy="9" r="2.5" />
                <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M15 14.6c2.8-.3 5.3 1.2 6.2 4.4" />
              </svg>
              {persona.label}
            </Link>
            <button
              type="button"
              className="min-h-11 cursor-pointer text-brand hover:underline"
              onClick={() => {
                logOut();
                router.push("/");
              }}
            >
              Wyloguj
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
