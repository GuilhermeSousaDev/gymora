"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Camera, Lock, Plus, Sparkles } from "lucide-react";
import {
  analyzePhotoAction,
  applyRevision,
  createBlankPlan,
  createPlan,
  deletePlan,
  generateAnotherPlan,
  repairPlan,
  revisePlanFromFeedback,
  setActivePlan,
} from "@/app/actions/plans";
import { Button, Card, CardTitle, ErrorText, Spinner, Textarea } from "@/components/ui";
import { PlanView, ReviewView } from "@/components/plan-view";
import { AiPlanEdit } from "@/components/ai-plan-edit";
import { compressImage } from "@/lib/image";
import { withAiRetry } from "@/lib/action-result";
import type { PhotoFeedback, PlanReview, TrainingPlan } from "@/lib/types";

function useAiError() {
  const tc = useTranslations("common");
  return (e: string) => (e === "ai" ? tc("aiFailed") : tc("error"));
}

export function PlanRowActions({ id, isActive }: { id: string; isActive: boolean }) {
  const t = useTranslations("training");
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      {!isActive && (
        <Button size="sm" variant="secondary" loading={pending} onClick={() => start(() => setActivePlan(id))}>
          {t("setActive")}
        </Button>
      )}
      <Link
        href={`/training/plans/${id}`}
        className="inline-flex h-10 items-center rounded-[var(--r-md)] sm:h-8 border border-rule bg-paper px-3 text-sm hover:border-iron/40"
      >
        {t("editPlan")}
      </Link>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => confirm(t("confirmDelete")) && start(() => deletePlan(id))}
      >
        {t("deletePlan")}
      </Button>
    </div>
  );
}

export function NewBlankPlanButton() {
  const t = useTranslations("training");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await createBlankPlan();
          if (res.ok) router.push(`/training/plans/${res.data.id}`);
        })
      }
    >
      <Plus className="size-4" /> {t("newBlank")}
    </Button>
  );
}

export function GeneratePlanCard() {
  const t = useTranslations("training");
  const tc = useTranslations("common");
  const ta = useTranslations("aiEdit");
  const errorText = useAiError();
  const [instructions, setInstructions] = useState("");
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, startSave] = useTransition();

  async function generate() {
    setBusy(true);
    setError("");
    setStatus(tc("aiThinking"));
    const onWait = (s: number) => setStatus(s ? tc("aiRetrying", { s }) : tc("aiThinking"));
    // Two short requests instead of one long one (the hosting gateway cuts requests at ~30s)
    const res = await withAiRetry(() => generateAnotherPlan(instructions), onWait);
    if (!res.ok) {
      setBusy(false);
      return setError(errorText(res.error));
    }
    let next = res.data.plan;
    if (res.data.needsRepair) {
      setStatus(tc("aiImproving"));
      const fixed = await withAiRetry(() => repairPlan({ plan: next }), (s) => setStatus(s ? tc("aiRetrying", { s }) : tc("aiImproving")), 2);
      if (fixed.ok) next = fixed.data; // if it fails, the draft (with the instant fixes) is still good
    }
    setBusy(false);
    setPlan(next);
  }

  const save = (makeActive: boolean) =>
    startSave(async () => {
      if (!plan) return;
      const res = await createPlan({ plan, source: "ai", makeActive });
      if (!res.ok) return setError(errorText(res.error));
      setPlan(null);
      setInstructions("");
    });

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <Sparkles className="size-5" /> {t("generateNew")}
      </CardTitle>
      {!plan ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">{t("generateDesc")}</p>
          <Textarea
            rows={2}
            className="min-h-16"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={t("generatePlaceholder")}
          />
          <ErrorText>{error}</ErrorText>
          {busy ? <Spinner label={status} /> : <Button onClick={generate}>{t("generate")}</Button>}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="font-display text-xl font-semibold text-plate-green">{t("generatedTitle")}</p>
          <div className="max-h-[28rem] overflow-y-auto pr-1">
            <PlanView plan={plan} compact />
          </div>
          <AiPlanEdit plan={plan} onApply={setPlan} appliedNote={ta("appliedDraft")} />
          <ErrorText>{error}</ErrorText>
          <div className="flex flex-wrap gap-2">
            <Button loading={saving} onClick={() => save(true)}>
              {t("saveAsMain")}
            </Button>
            <Button variant="secondary" loading={saving} onClick={() => save(false)}>
              {t("saveOnly")}
            </Button>
            <Button variant="ghost" onClick={() => setPlan(null)}>
              {tc("cancel")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function PhotoFeedbackCard({ hasActivePlan }: { hasActivePlan: boolean }) {
  const t = useTranslations("training");
  const tm = useTranslations("enums.muscles");
  const errorText = useAiError();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<PhotoFeedback | null>(null);
  const [revision, setRevision] = useState<{ review: PlanReview; improved: TrainingPlan } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function onFile(file?: File) {
    if (!file) return;
    // Kept only in this component's memory; discarded after analysis
    setPreview(await compressImage(file));
    setFeedback(null);
    setRevision(null);
    setDone("");
    setError("");
  }

  async function analyze() {
    if (!preview) return;
    setBusy(t("analyzing"));
    const res = await analyzePhotoAction(preview);
    setBusy(null);
    setPreview(null); // drop the photo as soon as we have feedback
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok) return setError(errorText(res.error));
    setFeedback(res.data);
  }

  async function suggest() {
    if (!feedback) return;
    setBusy(t("revising"));
    const res = await revisePlanFromFeedback(feedback);
    setBusy(null);
    if (!res.ok) return setError(errorText(res.error));
    setRevision(res.data);
  }

  async function apply(asNew: boolean) {
    if (!revision) return;
    setBusy(t("revising"));
    const res = await applyRevision({ plan: revision.improved, asNew });
    setBusy(null);
    if (!res.ok) return setError(errorText(res.error));
    setRevision(null);
    setDone(t("applied"));
  }

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <Camera className="size-5" /> {t("photoTitle")}
      </CardTitle>
      <p className="text-sm text-muted">{t("photoDesc")}</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <Lock className="size-3.5" /> {t("photoPrivacy")}
      </p>

      <div className="mt-4 space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {!busy && !feedback && (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              {t("choosePhoto")}
            </Button>
            {preview && <Button onClick={analyze}>{t("analyze")}</Button>}
          </div>
        )}
        {preview && !busy && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="max-h-64 rounded-[var(--r-md)] border border-border object-contain" />
        )}
        {busy && <Spinner label={busy} />}
        <ErrorText>{error}</ErrorText>
        {done && <p className="text-sm text-plate-green">{done}</p>}

        {feedback && !busy && !revision && (
          <div className="space-y-4">
            {!feedback.isValidPhoto ? (
              <div>
                <p className="font-medium">{t("invalidPhoto")}</p>
                <p className="text-sm text-muted">{feedback.overall}</p>
              </div>
            ) : (
              <>
                <ReviewView
                  review={{
                    overall: feedback.overall,
                    strengths: feedback.strengths,
                    improvements: feedback.improvements.map((text) => ({ text, label: "PLAUSIBLE BUT UNCERTAIN" })),
                    changes: [],
                  }}
                />
                {feedback.priorityMuscles.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted">{t("priorityMuscles")}</p>
                    <div className="flex flex-wrap gap-2">
                      {feedback.priorityMuscles.map((m) => (
                        <span key={m} className="rounded-[var(--r-sm)] bg-iron px-3 py-1 text-sm text-paper">
                          {tm(m)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {feedback.trainingSuggestions.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted">{t("suggestions")}</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {feedback.trainingSuggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {feedback.disclaimer && <p className="text-xs text-muted">{feedback.disclaimer}</p>}
              </>
            )}
            <div className="flex flex-wrap gap-2">
              {feedback.isValidPhoto &&
                (hasActivePlan ? (
                  <Button onClick={suggest}>{t("seeChanges")}</Button>
                ) : (
                  <p className="text-sm text-muted">{t("needActivePlan")}</p>
                ))}
              <Button variant="ghost" onClick={() => setFeedback(null)}>
                {t("justFeedback")}
              </Button>
            </div>
          </div>
        )}

        {revision && !busy && (
          <div className="space-y-4">
            <ReviewView review={revision.review} />
            <div className="max-h-[28rem] overflow-y-auto rounded-[var(--r-md)] border border-iron/30 p-4">
              <PlanView plan={revision.improved} compact />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => apply(false)}>{t("applyChanges")}</Button>
              <Button variant="secondary" onClick={() => apply(true)}>
                {t("saveAsNew")}
              </Button>
              <Button variant="ghost" onClick={() => setRevision(null)}>
                {t("justFeedback")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
