import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "./ui";
import { WEEKDAYS, type Weekday } from "@/lib/types";

/**
 * This week at a glance. Training days are drawn as plates:
 * green = done, iron ring = today, outline = coming up, dashed = missed. Other days are rest.
 */
export function WeekStrip({
  planned,
  done,
  today,
}: {
  planned: Set<Weekday>;
  done: Set<Weekday>;
  today: Weekday;
}) {
  const t = useTranslations("enums.weekdays");
  const tl = useTranslations("weekStrip");
  const todayIdx = WEEKDAYS.indexOf(today);

  return (
    <ol className="grid grid-cols-7 gap-1" aria-label={tl("label")}>
      {WEEKDAYS.map((d, i) => {
        const isPlanned = planned.has(d);
        const isDone = done.has(d);
        const isToday = d === today;
        const missed = isPlanned && !isDone && i < todayIdx;
        const state = isDone ? tl("done") : missed ? tl("missed") : isPlanned ? tl("planned") : tl("rest");
        return (
          <li key={d} className="flex flex-col items-center gap-1.5">
            <span className={cn("text-sm", isToday ? "font-semibold text-iron" : "text-steel")}>{t(d)}</span>
            <span
              title={state}
              className={cn(
                "flex size-10 items-center justify-center rounded-full sm:size-12",
                isDone && "bg-plate-green text-paper",
                !isDone && isToday && isPlanned && "border-[3px] border-iron",
                !isDone && !isToday && isPlanned && !missed && "border-2 border-iron/35",
                missed && "border-2 border-dashed border-steel/60",
              )}
            >
              {isDone ? (
                <Check className="size-5" strokeWidth={3} />
              ) : isPlanned ? (
                <span className="size-2.5 rounded-full bg-iron/70" />
              ) : (
                <span className="size-1.5 rounded-full bg-steel/40" />
              )}
              <span className="sr-only">{state}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
