"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dumbbell, LayoutDashboard, Play, User } from "lucide-react";
import { cn } from "@/components/ui";

const items = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/training", key: "training", icon: Dumbbell },
  { href: "/profile", key: "profile", icon: User },
] as const;

export function AppNav() {
  const t = useTranslations("nav");
  const path = usePathname();
  const isActive = (href: string) => path === href || path.startsWith(`${href}/`) || (href === "/training" && path.startsWith("/sessions"));

  return (
    <>
      {/* desktop: underline marks where you are */}
      <nav className="hidden h-full gap-6 sm:flex">
        {items.map(({ href, key }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex h-full items-center border-b-2 font-display text-lg font-semibold",
              isActive(href) ? "border-iron text-iron" : "border-transparent text-steel hover:text-iron",
            )}
          >
            {t(key)}
          </Link>
        ))}
      </nav>
      {/* mobile: bottom bar within thumb reach */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-rule bg-paper pb-[env(safe-area-inset-bottom)] sm:hidden">
        {items.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-0.5 border-t-2 py-2 text-xs font-medium",
              isActive(href) ? "border-iron text-iron" : "border-transparent text-steel",
            )}
          >
            <Icon className="size-5" />
            {t(key)}
          </Link>
        ))}
      </nav>
    </>
  );
}

export function ResumeBanner({ id, title }: { id: string; title: string }) {
  const t = useTranslations("training");
  return (
    <Link
      href={`/workout/${id}`}
      className="flex items-center justify-center gap-2 bg-plate-red px-4 py-2.5 text-sm font-semibold text-paper hover:bg-plate-red/90"
    >
      <Play className="size-4 fill-current" /> {t("resume")}: {title}
    </Link>
  );
}
