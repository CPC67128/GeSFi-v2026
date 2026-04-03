import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-background">
        <div className="flex items-center gap-4 px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
          <span className="font-semibold">GeSFi — Administration</span>
        </div>
      </header>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}
