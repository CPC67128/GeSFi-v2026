export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const NAV = [
  { href: "/admin/accounts",   label: "Comptes" },
  { href: "/admin/categories", label: "Catégories" },
  { href: "/admin/users",      label: "Utilisateurs" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-background">
        <div className="flex items-center gap-6 px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Retour
          </Link>
          <span className="font-semibold">GeSFi — Administration</span>
          <nav className="flex items-center gap-1 ml-4">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}
