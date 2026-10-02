"use client";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { cn } from "./ui";

const LABELS = { en: "English", pt: "Português" } as const;

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn("inline-flex rounded-[var(--r-sm)] border border-rule bg-paper p-0.5 text-xs", pending && "opacity-60", className)}
    >
      {(["en", "pt"] as const).map((l) => (
        <button
          key={l}
          type="button"
          title={LABELS[l]}
          aria-pressed={locale === l}
          onClick={() =>
            start(async () => {
              await setLocale(l);
              router.refresh();
            })
          }
          className={cn("min-h-9 min-w-10 rounded-[4px] px-2 font-semibold sm:min-h-0 sm:min-w-0 sm:py-1", locale === l ? "bg-iron text-paper" : "text-steel hover:text-iron")}
        >
          {l === "en" ? "EN" : "PT"}
        </button>
      ))}
    </div>
  );
}
