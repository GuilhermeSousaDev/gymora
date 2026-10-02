import { notFound } from "next/navigation";
import { ExerciseFigure } from "@/components/exercise-figure";
import { PATTERN_IDS } from "@/lib/exercise-art/ids";
import { resolvePattern } from "@/lib/exercise-art/patterns";

/** Dev-only gallery for tuning exercise illustrations. */
export default function ExerciseArtGallery() {
  if (process.env.NODE_ENV === "production") notFound();

  const samples: [string, string][] = [
    ["Supino reto com barra", "chest"],
    ["Crossover na polia alta", "chest"],
    ["Rosca direta com barra", "biceps"],
    ["Rosca martelo com halteres", "biceps"],
    ["Cable curl", "biceps"],
    ["Tríceps francês", "triceps"],
    ["Extensão de tríceps na polia alta", "triceps"],
    ["Mergulho nas paralelas", "triceps"],
    ["Stiff com halteres", "hamstrings"],
    ["Cadeira flexora (sentada)", "hamstrings"],
    ["Agachamento búlgaro", "quads"],
    ["Remada unilateral com halter", "back"],
    ["Elevação lateral", "shoulders"],
    ["Abdução de quadril (máquina)", "glutes"],
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-10 p-6">
      <section>
        <h1 className="mb-4 font-display text-3xl font-bold">Patterns</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {PATTERN_IDS.map((id) => (
            <figure key={id} className="rounded-[var(--r-md)] border border-rule bg-paper p-2">
              <ExerciseFigure name={id} pattern={id} />
              <figcaption className="mt-1 text-center text-sm">{id}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 font-display text-3xl font-bold">Name matching</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {samples.map(([name, muscle]) => (
            <figure key={name} className="rounded-[var(--r-md)] border border-rule bg-paper p-2">
              <ExerciseFigure name={name} muscle={muscle} />
              <figcaption className="mt-1 text-center text-sm">
                {name} → {resolvePattern({ name, muscleGroup: muscle })}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
