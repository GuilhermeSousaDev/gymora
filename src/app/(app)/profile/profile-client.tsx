"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut, RotateCcw } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { updateTrainingProfile } from "@/app/actions/profile";
import { Button, Card, CardTitle, ErrorText, Input, Label, PageTitle } from "@/components/ui";
import { ProfileFieldInput, type EditableField } from "@/components/profile-field";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { UserProfile } from "@/lib/types";

const FIELDS: EditableField[] = [
  "sex",
  "age",
  "heightCm",
  "weightKg",
  "experience",
  "trainingYears",
  "goals",
  "focusAreas",
  "availableDays",
  "sessionMinutes",
  "equipment",
  "cardio",
  "sleepHours",
  "limitations",
  "preferences",
];

export function ProfileClient({ name, email, profile }: { name: string; email: string; profile: UserProfile }) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const tf = useTranslations("fields");
  const router = useRouter();

  const [displayName, setDisplayName] = useState(name);
  const [nameMsg, setNameMsg] = useState("");
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState({ ok: "", err: "" });
  const [data, setData] = useState(profile);
  const [profileMsg, setProfileMsg] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <PageTitle>{t("title")}</PageTitle>

      <Card className="space-y-4">
        <CardTitle>{t("account")}</CardTitle>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await authClient.updateUser({ name: displayName });
              setNameMsg(res.error ? tc("error") : tc("saved"));
              router.refresh();
            });
          }}
        >
          <label className="min-w-48 flex-1">
            <Label>{t("name")}</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </label>
          <Button type="submit" variant="secondary" loading={pending}>
            {tc("save")}
          </Button>
          {nameMsg && <span className="text-sm text-muted">{nameMsg}</span>}
        </form>
        <div>
          <Label>{t("email")}</Label>
          <p className="text-sm text-muted">{email}</p>
        </div>
        <div>
          <Label>{t("language")}</Label>
          <LanguageSwitcher />
        </div>
      </Card>

      <Card>
        <CardTitle>{t("password")}</CardTitle>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await authClient.changePassword({
                currentPassword: pw.current,
                newPassword: pw.next,
                revokeOtherSessions: true,
              });
              setPwMsg(res.error ? { ok: "", err: t("passwordError") } : { ok: t("passwordUpdated"), err: "" });
              if (!res.error) setPw({ current: "", next: "" });
            });
          }}
        >
          <label>
            <Label>{t("currentPassword")}</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              required
            />
          </label>
          <label>
            <Label>{t("newPassword")}</Label>
            <Input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
              required
            />
          </label>
          <Button type="submit" variant="secondary" loading={pending}>
            {tc("save")}
          </Button>
        </form>
        <div className="mt-3">
          <ErrorText>{pwMsg.err}</ErrorText>
          {pwMsg.ok && <p className="text-sm text-plate-green">{pwMsg.ok}</p>}
        </div>
      </Card>

      <Card className="space-y-5">
        <div>
          <CardTitle className="mb-1">{t("trainingProfile")}</CardTitle>
          <p className="text-sm text-muted">{t("trainingProfileHint")}</p>
        </div>
        {FIELDS.map((f) => (
          <div key={f}>
            <Label>{tf(f)}</Label>
            <ProfileFieldInput field={f} profile={data} onChange={setData} />
          </div>
        ))}
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-paper/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-4">
          <Link href="/onboarding" className="flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text">
            <RotateCcw className="size-4" /> {t("redoOnboarding")}
          </Link>
          <div className="flex items-center gap-3">
            {profileMsg && <span className="text-sm text-plate-green">{profileMsg}</span>}
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  await updateTrainingProfile(data);
                  setProfileMsg(tc("saved"));
                })
              }
            >
              {tc("save")}
            </Button>
          </div>
        </div>
      </Card>

      <Button
        variant="danger"
        onClick={async () => {
          await authClient.signOut();
          router.push("/login");
          router.refresh();
        }}
      >
        <LogOut className="size-4" /> {tn("signOut")}
      </Button>
    </div>
  );
}
