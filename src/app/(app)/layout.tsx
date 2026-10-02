import Link from "next/link";
import { requireOnboardedUser } from "@/lib/session";
import { getActiveSession } from "@/lib/data";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wordmark } from "@/components/wordmark";
import { AppNav, ResumeBanner } from "./nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user } = await requireOnboardedUser();
  const active = await getActiveSession(user.id);

  return (
    <div className="flex min-h-full flex-1 flex-col pb-20 sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-rule bg-chalk/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/dashboard" aria-label="Gymora" className="flex min-h-11 items-center">
            <Wordmark />
          </Link>
          <AppNav />
          <LanguageSwitcher />
        </div>
      </header>
      {active && <ResumeBanner id={active.id} title={active.dayTitle} />}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
