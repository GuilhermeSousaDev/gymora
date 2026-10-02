"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/wordmark";
import { authClient } from "@/lib/auth-client";
import { Button, Card, ErrorText, Input, Label } from "@/components/ui";
import { LanguageSwitcher } from "@/components/language-switcher";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setLoading(true);
    setError("");
    const res =
      mode === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: String(form.get("name")) });
    setLoading(false);
    if (res.error) return setError(mode === "login" ? t("invalid") : t("signupError"));
    router.push(mode === "login" ? "/dashboard" : "/onboarding");
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" aria-label="Gymora">
          <Wordmark />
        </Link>
        <LanguageSwitcher />
      </div>
      <Card>
        <h1 className="mb-5 font-display text-3xl font-bold leading-none">{mode === "login" ? t("loginTitle") : t("signupTitle")}</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <label className="block">
              <Label>{t("name")}</Label>
              <Input name="name" required autoComplete="name" />
            </label>
          )}
          <label className="block">
            <Label>{t("email")}</Label>
            <Input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="block">
            <Label>{t("password")}</Label>
            <Input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" className="w-full" loading={loading}>
            {mode === "login" ? t("login") : t("signup")}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-muted">
        {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
        <Link href={mode === "login" ? "/signup" : "/login"} className="font-medium underline underline-offset-4 hover:text-plate-blue">
          {mode === "login" ? t("signup") : t("login")}
        </Link>
      </p>
    </main>
  );
}
