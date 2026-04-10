import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { execSync } from "child_process";

function tryExec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "—";
  }
}

type DbRow = { version: string };

export default async function AboutPage() {
  const session = await auth();

  const gitCommit  = tryExec("git rev-parse --short HEAD");
  const gitBranch  = tryExec("git rev-parse --abbrev-ref HEAD");
  const gitDate    = tryExec("git log -1 --format=%ci HEAD");
  const gitMessage = tryExec("git log -1 --format=%s HEAD");

  let dbVersion = "—";
  let dbStatus  = "OK";
  try {
    const rows = await prisma.$queryRaw<DbRow[]>`SELECT VERSION() AS version`;
    dbVersion = rows[0]?.version ?? "—";
  } catch (e) {
    dbStatus = String(e);
  }

  const rows: { label: string; value: string }[] = [
    { label: "Commit",       value: gitCommit },
    { label: "Branche",      value: gitBranch },
    { label: "Date commit",  value: gitDate },
    { label: "Message",      value: gitMessage },
    { label: "Node.js",      value: process.version },
    { label: "Environnement", value: process.env.NODE_ENV ?? "—" },
    { label: "DB host",         value: `${process.env.DB_HOST ?? "—"}:${process.env.DB_PORT ?? 3306}` },
    { label: "DB nom",          value: process.env.DB_NAME ?? "—" },
    { label: "DB utilisateur",  value: process.env.DB_USER ?? "—" },
    { label: "DB version",      value: `${dbVersion} — ${dbStatus}` },
    { label: "Utilisateur",  value: session?.user?.name ?? "—" },
    { label: "Rôle",         value: String(session?.user?.role ?? "—") },
    { label: "Heure serveur", value: new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-lg">
      <h1 className="text-2xl font-bold">À propos</h1>
      <div className="rounded-lg border overflow-hidden">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={`flex gap-4 px-4 py-2.5 text-sm ${i > 0 ? "border-t" : ""}`}
          >
            <span className="w-40 shrink-0 text-muted-foreground">{r.label}</span>
            <span className="font-mono break-all">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
