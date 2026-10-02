import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wordmark } from "@/components/wordmark";

export default async function Home() {
  if (await getSession()) redirect("/dashboard");
  const t = await getTranslations("landing");
  const ts = await getTranslations("session");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5">
      <header className="flex items-center justify-between">
        <Wordmark />
        <LanguageSwitcher />
      </header>

      <section className="grid flex-1 items-center gap-12 py-14 md:grid-cols-[1.2fr_1fr]">
        <div>
          <h1 className="max-w-[14ch] font-display text-6xl font-bold leading-[0.92] sm:text-7xl">{t("title")}</h1>
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-steel">{t("subtitle")}</p>
          <ul className="mt-8 max-w-[52ch] space-y-2 border-l-2 border-iron pl-4">
            {(["f1", "f2", "f3"] as const).map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              href="/signup"
              className="rounded-[var(--r-md)] bg-iron px-7 py-3.5 font-display text-xl font-semibold text-paper hover:bg-iron/85"
            >
              {t("cta")}
            </Link>
            <Link href="/login" className="inline-flex min-h-11 items-center sm:min-h-0 font-medium underline underline-offset-4 hover:text-plate-blue">
              {t("login")}
            </Link>
          </div>
        </div>

        {/* The signature moment: training mode, where the screen is the color of the phase */}
        <div aria-hidden className="mx-auto w-full max-w-[300px]">
          <div className="rounded-[28px] border-[6px] border-iron bg-plate-red p-5 text-paper shadow-[0_24px_48px_-24px_rgba(24,33,43,0.55)]">
            <p className="text-sm text-paper/75">{t("demoMuscle")}</p>
            <p className="font-display text-3xl font-bold leading-none">{t("demoExercise")}</p>
            <div className="mt-4 flex gap-1.5">
              {["8 × 80 kg", "8 × 80 kg", "3", "4"].map((s, i) => (
                <span
                  key={i}
                  className={i < 2 ? "rounded-[4px] bg-paper px-2 py-1 text-xs text-iron" : "rounded-[4px] border border-paper/30 px-2 py-1 text-xs"}
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="py-10 text-center">
              <p className="font-display text-xl font-semibold">{ts("setOf", { n: 3, total: 4 })}</p>
              <p className="font-display text-7xl font-bold leading-none tabular">0:32</p>
            </div>
            <div className="rounded-[var(--r-md)] bg-paper py-3 text-center font-display text-lg font-semibold text-iron">
              {ts("finishSet")}
            </div>
          </div>
          <div className="mt-4 flex justify-center gap-4 text-sm text-steel">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-plate-red" /> {t("legendLift")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-plate-blue" /> {t("legendRest")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-plate-green" /> {t("legendGo")}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
