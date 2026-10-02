import { requireOnboardedUser } from "@/lib/session";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const { user, profile } = await requireOnboardedUser();
  return <ProfileClient name={user.name} email={user.email} profile={profile.data} />;
}
