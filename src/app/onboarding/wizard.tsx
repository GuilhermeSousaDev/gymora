"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardList, Paperclip, Sparkles, X } from "lucide-react";
import { Button, Card, Chip, ErrorText, Input, Label, Spinner, Textarea, cn } from "@/components/ui";
import { PlanView, ReviewView } from "@/components/plan-view";
import { AiPlanEdit } from "@/components/ai-plan-edit";
import { Wordmark } from "@/components/wordmark";
import { ProfileFieldInput, type EditableField } from "@/components/profile-field";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  onboardingComplete,
  onboardingGenerate,
  onboardingReview,
  onboardingUnderstand,
} from "@/app/actions/onboarding";
import { compressImage } from "@/lib/image";
import {
  REQUIRED_PROFILE_FIELDS,
  missingRequiredFields,
  type OnboardingQuestion,
  type PlanReview,
  type TrainingPlan,
  type UserProfile,
} from "@/lib/types";

type Mode = "generate" | "import";
type Step = "choose" | "tell" | "questions" | "result";
type Review = { original: TrainingPlan; review: PlanReview; improved: TrainingPlan };

export function OnboardingWizard({ initialProfile, canExit }: { initialProfile: UserProfile; canExit: boolean }) {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const tf = useTranslations("fallbackQuestions");
  const ta = useTranslations("aiEdit");
  const router = useRouter();

  const [step, setStep] = useState<Step>("choose");
  const [mode, setMode] = useState<Mode>("generate");
  const [text, setText] = useState("");
  const [planText, setPlanText] = useState("");
  const [planImage, setPlanImage] = useState<{ name: string; data: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [showImproved, setShowImproved] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fail = (e: string) => {
    setBusy(null);
    setError(e === "ai" ? tc("aiFailed") : tc("error"));
  };

  /* ---------------- step: tell -> questions ---------------- */
  async function submitTell() {
    if (text.trim().length < 5) return setError(t("needText"));
    if (mode === "import" && !planText.trim() && !planImage) return setError(t("needPlan"));
    setError("");
    setBusy(tc("aiThinking"));
    const res = await onboardingUnderstand({ mode, text, profile, round: 1 });
    setBusy(null);
    if (!res.ok) {
      // AI unavailable: fall back to asking the required fields manually
      setQuestions([]);
      setStep("questions");
      return fail(res.error);
    }
    setProfile(res.data.profile);
    setQuestions(res.data.questions);
    setStep("questions");
  }

  /* ---------------- step: questions -> result ---------------- */
  const coveredFields = new Set(questions.map((q) => q.field));
  const missing = missingRequiredFields(profile);
  const fallbackFields = REQUIRED_PROFILE_FIELDS.filter((f) => missing.includes(f) && !coveredFields.has(f));

  async function buildResult() {
    if (missing.length) return setError(tc("error"));
    setError("");
    setStep("result");
    if (mode === "generate") {
      setBusy(t("generating"));
      const res = await onboardingGenerate({ profile });
      if (!res.ok) return fail(res.error);
      setPlan(res.data);
    } else {
      setBusy(t("reviewing"));
      const res = await onboardingReview({ profile, planText, planImage: planImage?.data });
      if (!res.ok) return fail(res.error);
      setReview(res.data);
    }
    setBusy(null);
  }

  async function save(finalPlan: TrainingPlan, source: "ai" | "imported") {
    setBusy(tc("loading"));
    const res = await onboardingComplete({ profile, plan: finalPlan, source });
    if (!res.ok) return fail(res.error);
    router.push("/dashboard");
    router.refresh();
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.type.startsWith("image/")) {
      setPlanImage({ name: file.name, data: await compressImage(file, 1600, 0.9) });
    } else {
      setPlanText((await file.text()).slice(0, 20000));
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  /* ---------------- render ---------------- */
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <header className="mb-8 flex items-center justify-between">
        <Wordmark />
        <div className="flex items-center gap-3">
          {canExit && (
            <Link href="/dashboard" className="inline-flex min-h-11 items-center sm:min-h-0 text-sm text-muted hover:text-text">
              {tc("close")}
            </Link>
          )}
          <LanguageSwitcher />
        </div>
      </header>

      <h1 className="mb-8 font-display text-5xl font-bold leading-none">{t("title")}</h1>

      {step === "choose" && (
        <div className="space-y-3">
          <p className="text-muted">{t("chooseTitle")}</p>
          {(
            [
              { m: "generate", icon: Sparkles, title: t("generateTitle"), desc: t("generateDesc") },
              { m: "import", icon: ClipboardList, title: t("importTitle"), desc: t("importDesc") },
            ] as const
          ).map(({ m, icon: Icon, title, desc }) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setStep("tell");
              }}
              className="flex w-full items-start gap-4 rounded-[var(--r-lg)] border border-border bg-surface p-5 text-left transition hover:border-iron"
            >
              <Icon className="mt-0.5 size-6 shrink-0 text-iron" />
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === "tell" && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">{t("tellTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("tellHint")}</p>
          </div>
          <Textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === "import" ? t("tellPlaceholderImport") : t("tellPlaceholder")}
          />
          {mode === "import" && (
            <div className="space-y-2">
              <Label>{t("planTitle")}</Label>
              <Textarea
                rows={8}
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                placeholder={t("planPlaceholder")}
                className="font-mono text-base sm:text-xs"
              />
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.md,.csv,.json,text/*,image/*"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="size-4" /> {t("uploadPlan")}
                </Button>
                <span className="text-xs text-muted">{t("uploadHint")}</span>
              </div>
              {planImage && (
                <p className="flex items-center gap-2 text-sm text-muted">
                  {t("planImageAttached", { name: planImage.name })}
                  <button onClick={() => setPlanImage(null)} className="text-danger" aria-label={t("removeFile")}>
                    <X className="size-4" />
                  </button>
                </p>
              )}
            </div>
          )}
          <ErrorText>{error}</ErrorText>
          {busy ? (
            <Spinner label={busy} />
          ) : (
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("choose")}>
                {tc("back")}
              </Button>
              <Button onClick={submitTell}>{t("analyze")}</Button>
            </div>
          )}
        </Card>
      )}

      {step === "questions" && (
        <Card className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">{t("questionsTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("questionsSubtitle")}</p>
          </div>
          {profile.summary && (
            <div className="rounded-[var(--r-md)] bg-surface-2 p-3 text-sm">
              <p className="mb-1 text-xs font-medium text-iron">{t("understood")}</p>
              {profile.summary}
            </div>
          )}

          {questions.map((q, i) => (
            <div key={q.id || i}>
              <Label>{q.question}</Label>
              {q.field === "other" ? (
                <OtherQuestion q={q} profile={profile} onChange={setProfile} placeholder={t("otherAnswer")} />
              ) : (
                <ProfileFieldInput field={q.field as EditableField} profile={profile} onChange={setProfile} />
              )}
            </div>
          ))}
          {fallbackFields.map((f) => (
            <div key={f}>
              <Label>{tf(f)}</Label>
              <ProfileFieldInput field={f} profile={profile} onChange={setProfile} />
            </div>
          ))}

          <ErrorText>{error}</ErrorText>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep("tell")}>
              {tc("back")}
            </Button>
            <Button onClick={buildResult} disabled={missing.length > 0}>
              {tc("continue")}
            </Button>
          </div>
        </Card>
      )}

      {step === "result" && (
        <Card>
          {busy ? (
            <Spinner label={busy} />
          ) : error ? (
            <div className="space-y-4">
              <ErrorText>{error}</ErrorText>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep("questions")}>
                  {tc("back")}
                </Button>
                <Button onClick={buildResult}>{t("regenerate")}</Button>
              </div>
            </div>
          ) : mode === "generate" && plan ? (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-semibold text-plate-green">{t("planReady")}</h2>
              <PlanView plan={plan} />
              <AiPlanEdit plan={plan} profile={profile} onApply={setPlan} appliedNote={ta("appliedDraft")} />
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button variant="secondary" onClick={buildResult}>
                  {t("regenerate")}
                </Button>
                <Button onClick={() => save(plan, "ai")}>{t("savePlan")}</Button>
              </div>
            </div>
          ) : review ? (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">{t("reviewTitle")}</h2>
              <ReviewView review={review.review} />
              <div className="flex gap-2">
                <Chip active={!showImproved} onClick={() => setShowImproved(false)}>
                  {t("showOriginal")}
                </Chip>
                <Chip active={showImproved} onClick={() => setShowImproved(true)}>
                  {t("showImproved")}
                </Chip>
              </div>
              <div className={cn("rounded-[var(--r-md)] border p-4", showImproved ? "border-iron/40" : "border-border")}>
                <PlanView plan={showImproved ? review.improved : review.original} compact />
              </div>
              <AiPlanEdit
                plan={showImproved ? review.improved : review.original}
                profile={profile}
                appliedNote={ta("appliedDraft")}
                onApply={(p) => setReview({ ...review, [showImproved ? "improved" : "original"]: p })}
              />
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button variant="secondary" onClick={() => save(review.original, "imported")}>
                  {t("keepMine")}
                </Button>
                <Button onClick={() => save(review.improved, "imported")}>{t("useImproved")}</Button>
              </div>
            </div>
          ) : null}
        </Card>
      )}
    </main>
  );
}

function OtherQuestion({
  q,
  profile,
  onChange,
  placeholder,
}: {
  q: OnboardingQuestion;
  profile: UserProfile;
  onChange: (p: UserProfile) => void;
  placeholder: string;
}) {
  const value = profile.extra[q.question] ?? "";
  const set = (v: string) => onChange({ ...profile, extra: { ...profile.extra, [q.question]: v } });
  return (
    <div className="space-y-2">
      {q.options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {q.options.map((o) => (
            <Chip key={o} active={value === o} onClick={() => set(o)}>
              {o}
            </Chip>
          ))}
        </div>
      )}
      <Input value={value} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
    </div>
  );
}
