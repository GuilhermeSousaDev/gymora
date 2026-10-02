import type { WeekBar } from "@/lib/data";
import { shortDate } from "@/lib/format";

const SERIES = [
  { key: "work", color: "var(--plate-red)" },
  { key: "rest", color: "var(--plate-blue)" },
  { key: "cardio", color: "var(--plate-gold)" },
  { key: "other", color: "color-mix(in srgb, var(--steel) 45%, white)" },
] as const;

/** Stacked weekly minutes. Hover a bar for the exact breakdown; the table view is below. */
export function WeeklyStackedChart({
  data,
  labels,
  locale,
}: {
  data: WeekBar[];
  labels: Record<(typeof SERIES)[number]["key"], string>;
  locale: string;
}) {
  const totals = data.map((d) => d.work + d.rest + d.cardio + d.other);
  const max = Math.max(30, ...totals);
  const H = 160;

  return (
    <div>
      {/* legend */}
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {labels[s.key]}
          </span>
        ))}
      </div>

      <div className="relative flex items-end gap-2 border-b border-border" style={{ height: H }}>
        {/* recessive gridline at max */}
        <span className="absolute -top-1 right-0 text-[10px] text-muted tabular">{Math.round(max)} min</span>
        {data.map((d, i) => (
          <div key={d.start} className="group relative flex h-full flex-1 flex-col justify-end">
            <div className="flex flex-col-reverse gap-[2px]">
              {SERIES.map((s) => {
                const v = d[s.key];
                if (!v) return null;
                return (
                  <div
                    key={s.key}
                    className="w-full first:rounded-b-none last:rounded-t-[4px]"
                    style={{ height: Math.max(2, (v / max) * (H - 16)), background: s.color }}
                  />
                );
              })}
            </div>
            {/* tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-36 -translate-x-1/2 rounded-lg border border-border bg-paper p-2 text-xs shadow-md group-hover:block">
              <p className="mb-1 font-medium">
                {shortDate(d.start, locale)}, {totals[i]} min
              </p>
              {SERIES.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-2 text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-sm" style={{ background: s.color }} />
                    {labels[s.key]}
                  </span>
                  <span className="text-text tabular">{d[s.key]}</span>
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        {data.map((d) => (
          <span key={d.start} className="flex-1 text-center text-[10px] text-muted">
            {shortDate(d.start, locale)}
          </span>
        ))}
      </div>

      <details className="mt-3 text-xs text-muted">
        <summary className="cursor-pointer">Table</summary>
        <table className="mt-2 w-full tabular">
          <thead>
            <tr className="text-left">
              <th className="font-medium">Week</th>
              {SERIES.map((s) => (
                <th key={s.key} className="text-right font-medium">
                  {labels[s.key]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.start}>
                <td>{shortDate(d.start, locale)}</td>
                {SERIES.map((s) => (
                  <td key={s.key} className="text-right text-text">
                    {d[s.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** Tiny bodyweight trend line with hoverable points. */
export function Sparkline({ points, locale }: { points: { date: string; kg: number }[]; locale: string }) {
  if (points.length < 2) return null;
  const W = 240;
  const H = 56;
  const ys = points.map((p) => p.kg);
  const min = Math.min(...ys) - 0.5;
  const max = Math.max(...ys) + 0.5;
  const x = (i: number) => 6 + (i / (points.length - 1)) * (W - 12);
  const y = (v: number) => 6 + (1 - (v - min) / (max - min)) * (H - 12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-14 w-full" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="var(--iron)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        points={points.map((p, i) => `${x(i)},${y(p.kg)}`).join(" ")}
      />
      {points.map((p, i) => (
        <g key={p.date}>
          <circle cx={x(i)} cy={y(p.kg)} r={4} fill="var(--iron)" stroke="var(--paper)" strokeWidth={2} />
          <circle cx={x(i)} cy={y(p.kg)} r={10} fill="transparent">
            <title>{`${shortDate(p.date, locale)}: ${p.kg} kg`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}
