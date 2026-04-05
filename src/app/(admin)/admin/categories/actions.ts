"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

export async function saveCategory(
  categoryId: string | null,
  _prev: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const category = (formData.get("category") as string).trim();
  const type = parseInt(formData.get("type") as string);
  const link_type = formData.get("link_type") as string;
  const link_id = (formData.get("link_id") as string).trim();
  const sort_order = parseInt(formData.get("sort_order") as string) || 0;
  const active_from = new Date(formData.get("active_from") as string);
  const marked_as_inactive = formData.get("marked_as_inactive") === "on" ? 1 : 0;

  if (!category) return "Le nom est obligatoire.";
  if (!link_type) return "Le type de lien est obligatoire.";

  if (categoryId) {
    await prisma.bf_category.update({
      where: { category_id: categoryId },
      data: { category, type, link_type, link_id, sort_order, active_from, marked_as_inactive },
    });
  } else {
    await prisma.bf_category.create({
      data: {
        category_id: randomUUID(),
        category, type, link_type, link_id, sort_order, active_from, marked_as_inactive,
      },
    });
  }

  redirect("/admin/categories");
}
