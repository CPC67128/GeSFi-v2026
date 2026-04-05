import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h2 className="text-xl font-bold">Nouvel utilisateur</h2>
      </div>
      <UserForm user={null} />
    </div>
  );
}
