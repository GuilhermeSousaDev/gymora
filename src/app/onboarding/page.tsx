import { requireUser, getProfile } from "@/lib/session";
import { emptyProfile } from "@/lib/types";
import { OnboardingWizard } from "./wizard";

export default async function OnboardingPage() {
  const user = await requireUser();
  const existing = await getProfile(user.id);
  return <OnboardingWizard initialProfile={existing?.data ?? emptyProfile()} canExit={!!existing?.onboardingCompletedAt} />;
}
