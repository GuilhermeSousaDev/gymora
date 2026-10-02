import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/session";
import { getPlan } from "@/lib/data";
import { PlanEditor } from "./editor";

export default async function PlanEditorPage({ params }: PageProps<"/training/plans/[id]">) {
  const { id } = await params;
  const { user } = await requireOnboardedUser();
  const row = await getPlan(user.id, id);
  if (!row) notFound();
  return <PlanEditor id={row.id} initial={row.plan} isActive={row.isActive} />;
}
