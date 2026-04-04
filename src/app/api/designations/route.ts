import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) return NextResponse.json([]);

  const rows = await prisma.$queryRaw<{ designation: string }[]>`
    SELECT designation, COUNT(*) AS cnt
    FROM bf_record
    WHERE user_id = ${session.user.id}
      AND marked_as_deleted = 0
      AND designation LIKE ${"%" + q + "%"}
    GROUP BY designation
    ORDER BY cnt DESC
    LIMIT 8`;

  return NextResponse.json(rows.map((r) => r.designation));
}
