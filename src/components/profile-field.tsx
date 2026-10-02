"use client";
import { useTranslations } from "next-intl";
import { Chip, Input, Textarea } from "./ui";
import {
  CARDIO_PREFS,
  EQUIPMENT,
  EXPERIENCE,
  FOCUS_AREAS,
  GOALS,
  SEXES,
  WEEKDAYS,
  type UserProfile,
} from "@/lib/types";

export type EditableField = Exclude<keyof UserProfile, "summary" | "extra">;

const single: Partial<Record<EditableField, { values: readonly string[]; ns: string }>> = {
  sex: { values: SEXES, ns: "enums.sex" },
  experience: { values: EXPERIENCE, ns: "enums.experience" },
  equipment: { values: EQUIPMENT, ns: "enums.equipment" },
  cardio: { values: CARDIO_PREFS, ns: "enums.cardio" },
};
const multi: Partial<Record<EditableField, { values: readonly string[]; ns: string }>> = {
  goals: { values: GOALS, ns: "enums.goals" },
  focusAreas: { values: FOCUS_AREAS, ns: "enums.muscles" },
  availableDays: { values: WEEKDAYS, ns: "enums.weekdays" },
};
const numeric: Partial<Record<EditableField, { unit: string; step?: number; presets?: number[] }>> = {
  age: { unit: "years" },
  heightCm: { unit: "cm" },
  weightKg: { unit: "kg", step: 0.1 },
  trainingYears: { unit: "years", step: 0.5 },
  sessionMinutes: { unit: "min", presets: [30, 45, 60, 75, 90] },
  sleepHours: { unit: "hours", step: 0.5 },
};

/** Renders the right control for any profile field (used in onboarding and profile). */
export function ProfileFieldInput({
  field,
  profile,
  onChange,
}: {
  field: EditableField;
  profile: UserProfile;
  onChange: (p: UserProfile) => void;
}) {
  const t = useTranslations();
  const set = (v: unknown) => onChange({ ...profile, [field]: v });

  const s = single[field];
  if (s) {
    return (
      <div className="flex flex-wrap gap-2">
        {s.values.map((v) => (
          <Chip key={v} active={profile[field] === v} onClick={() => set(v)}>
            {t(`${s.ns}.${v}`)}
          </Chip>
        ))}
      </div>
    );
  }

  const m = multi[field];
  if (m) {
    const current = (profile[field] as string[]) ?? [];
    return (
      <div className="flex flex-wrap gap-2">
        {m.values.map((v) => (
          <Chip
            key={v}
            active={current.includes(v)}
            onClick={() => set(current.includes(v) ? current.filter((x) => x !== v) : [...current, v])}
          >
            {t(`${m.ns}.${v}`)}
          </Chip>
        ))}
      </div>
    );
  }

  const n = numeric[field];
  if (n) {
    const value = profile[field] as number | null;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {n.presets?.map((p) => (
          <Chip key={p} active={value === p} onClick={() => set(p)}>
            {p} {t(`common.${n.unit}`)}
          </Chip>
        ))}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step={n.step ?? 1}
            min={0}
            className="w-28"
            value={value ?? ""}
            onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value))}
          />
          <span className="text-sm text-muted">{t(`common.${n.unit}`)}</span>
        </div>
      </div>
    );
  }

  // free text: limitations, preferences
  return (
    <Textarea
      rows={2}
      className="min-h-16"
      value={(profile[field] as string) ?? ""}
      onChange={(e) => set(e.target.value)}
    />
  );
}
