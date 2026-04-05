"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

export async function saveUser(
  userId: string | null,
  _prev: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string).trim();
  const role = parseInt(formData.get("role") as string) || 0;
  const password = (formData.get("password") as string).trim();

  if (!name) return "Le nom est obligatoire.";
  if (!email) return "L'e-mail est obligatoire.";

  if (userId) {
    const data: Record<string, unknown> = { name, email, role };
    if (password) data.password = createHash("md5").update(password).digest("hex");
    await prisma.bf_user.update({ where: { user_id: userId }, data });
  } else {
    if (!password) return "Le mot de passe est obligatoire pour un nouvel utilisateur.";
    await prisma.bf_user.create({
      data: {
        user_id: randomUUID(),
        name,
        email,
        role,
        password: createHash("md5").update(password).digest("hex"),
      },
    });
  }

  redirect("/admin/users");
}
