import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAccountsForUser } from "@/lib/accounts";

export default async function HomePage() {
  const session = await auth();
  const accounts = await getAccountsForUser(session!.user.id);

  if (accounts.length > 0) {
    redirect(`/accounts/${accounts[0].account_id}`);
  }

  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      No accounts found.
    </div>
  );
}
