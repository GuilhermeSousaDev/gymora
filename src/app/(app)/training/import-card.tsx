"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { FileUp, Paperclip, X } from "lucide-react";
import { importPlan, type ImportResult } from "@/app/actions/import";
import { createPlan } from "@/app/actions/plans";
import { Button, Card, CardTitle, ErrorText, Input, Label, Spinner, Textarea } from "@/components/ui";
import { PlanView } from "@/components/plan-view";
import { AiPlanEdit } from "@/components/ai-plan-edit";
import { compressImage } from "@/lib/image";
import { withAiRetry } from "@/lib/action-result";

type Attachment = { name: string; kind: "image" | "file"; data: string };

const readBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

/** Paste or upload a plan the user already has; we read it as written and save it. */
export function ImportPlanCard() {
  const t = useTranslations("import");
  const tc = useTranslations("common");
  const ta = useTranslations("aiEdit");
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [retryIn, setRetryIn] = useState(0);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  async function onFile(file?: File) {
    if (!file) return;
    setError("");
    const name = file.name.toLowerCase();
    if (file.type.startsWith("image/")) setAttachment({ name: file.name, kind: "image", data: await compressImage(file, 1600, 0.9) });
    else if (name.endsWith(".pdf") || name.endsWith(".docx")) setAttachment({ name: file.name, kind: "file", data: await readBase64(file) });
    else setText((await file.text()).slice(0, 20000));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function read() {
    setBusy(true);
    setError("");
    setSavedId(null);
    const res = await withAiRetry(() => importPlan({
      text,
      image: attachment?.kind === "image" ? attachment.data : undefined,
      file: attachment?.kind === "file" ? { name: attachment.name, data: attachment.data } : undefined,
    }), setRetryIn);
    setBusy(false);
    if (!res.ok) return setError(res.error === "ai" ? tc("aiFailed") : t("nothingFound"));
    setResult(res.data);
  }

  const save = (makeActive: boolean) =>
    startSave(async () => {
      if (!result) return;
      const res = await createPlan({ plan: result.plan, source: "imported", makeActive });
      if (!res.ok) return setError(tc("error"));
      setSavedId(res.data.id);
      setResult(null);
      setText("");
      setAttachment(null);
    });

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <FileUp className="size-5" /> {t("title")}
      </CardTitle>

      {savedId && (
        <p className="mb-3 text-sm text-plate-green">
          {t("saved")}{" "}
          <Link href={`/training/plans/${savedId}`} className="font-medium underline underline-offset-4">
            {t("edit")}
          </Link>
        </p>
      )}

      {!result ? (
        <div className="space-y-3">
          <p className="text-sm text-steel">{t("desc")}</p>
          <Textarea
            rows={6}
            className="font-mono text-base sm:text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("placeholder")}
          />
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.json,.pdf,.docx,text/*,image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Paperclip className="size-4" /> {t("upload")}
            </Button>
            <span className="text-xs text-steel">{t("uploadHint")}</span>
          </div>
          {attachment && (
            <p className="flex items-center gap-2 text-sm text-steel">
              {attachment.name}
              <button onClick={() => setAttachment(null)} aria-label={tc("delete")} className="text-plate-red">
                <X className="size-4" />
              </button>
            </p>
          )}
          <ErrorText>{error}</ErrorText>
          {busy ? (
            <Spinner label={retryIn ? tc("aiRetrying", { s: retryIn }) : t("reading")} />
          ) : (
            <Button onClick={read} disabled={!text.trim() && !attachment}>
              {t("read")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-steel">{result.method === "parser" ? t("methodParser") : t("methodAi")}</p>

          {result.unread.length > 0 && (
            <div className="rounded-[var(--r-md)] border border-plate-yellow/60 bg-plate-yellow/10 p-3 text-sm">
              <p className="font-medium">{t("unreadTitle")}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {result.unread.map((l, i) => (
                  <li key={i} className="break-words">
                    {l}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-steel">{t("unreadHint")}</p>
            </div>
          )}

          <label className="block">
            <Label>{t("planName")}</Label>
            <Input
              value={result.plan.name}
              onChange={(e) => setResult({ ...result, plan: { ...result.plan, name: e.target.value } })}
            />
          </label>

          <div className="max-h-[32rem] overflow-y-auto rounded-[var(--r-md)] border border-rule p-3">
            {/* Days open: the point of the preview is checking every exercise */}
            <PlanView plan={result.plan} />
          </div>

          <AiPlanEdit
            plan={result.plan}
            onApply={(plan) => setResult({ ...result, plan })}
            appliedNote={ta("appliedDraft")}
          />

          <ErrorText>{error}</ErrorText>
          <div className="flex flex-wrap gap-2">
            <Button loading={saving} onClick={() => save(true)}>
              {t("saveAsMain")}
            </Button>
            <Button variant="secondary" loading={saving} onClick={() => save(false)}>
              {t("save")}
            </Button>
            <Button variant="ghost" onClick={() => setResult(null)}>
              {tc("back")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
