import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { AccountNav } from "./account-nav";
import { Separator } from "@/components/ui/separator";
import { getAccountsForUser } from "@/lib/accounts";
import { auth } from "@/auth";
import { signOut } from "@/auth";

type Props = { className?: string };

export async function Sidebar({ className }: Props) {
  const session = await auth();
  const accounts = session?.user?.id
    ? await getAccountsForUser(session.user.id)
    : [];

  return (
    <aside className={className}>
      <div className="flex h-full flex-col">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">GeSFi</h1>
          <p className="text-xs text-muted-foreground">{session?.user?.name}</p>
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto">
          <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Accounts
          </p>
          <AccountNav accounts={accounts} />
        </div>

        <Separator />

        <div className="flex flex-col gap-1 p-2">
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Settings size={15} />
            Administration
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
