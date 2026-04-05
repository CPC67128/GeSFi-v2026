import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CategoryForm } from "../category-form";

type Props = { params: Promise<{ categoryId: string }> };

export default async function EditCategoryPage({ params }: Props) {
  const { categoryId } = await params;

  const [raw, users] = await Promise.all([
    prisma.bf_category.findUnique({ where: { category_id: categoryId } }),
    prisma.bf_user.findMany({ select: { user_id: true, name: true } }),
  ]);

  if (!raw) notFound();

  const category = {
    category_id: raw.category_id,
    category: raw.category,
    type: raw.type,
    link_type: raw.link_type,
    link_id: raw.link_id,
    sort_order: raw.sort_order,
    active_from: raw.active_from.toISOString().split("T")[0],
    marked_as_inactive: raw.marked_as_inactive,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/categories" className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h2 className="text-xl font-bold">{raw.category}</h2>
      </div>
      <CategoryForm category={category} users={users} />
    </div>
  );
}
