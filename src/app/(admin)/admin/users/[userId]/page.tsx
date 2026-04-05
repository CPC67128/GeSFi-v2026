import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { UserForm } from "../user-form";

type Props = { params: Promise<{ userId: string }> };

export default async function EditUserPage({ params }: Props) {
  const { userId } = await params;

  const raw = await prisma.bf_user.findUnique({ where: { user_id: userId } });
  if (!raw) notFound();

  const user = {
    user_id: raw.user_id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h2 className="text-xl font-bold">{raw.name ?? raw.user_id}</h2>
      </div>
      <UserForm user={user} />
    </div>
  );
}
