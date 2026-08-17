"use server";

import { redirect } from "next/navigation";
import {
  clearSessionCookie,
  ensureAdmin,
  hashPassword,
  requireUser,
  setSessionCookie,
  signSession,
  verifyLogin,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EQUIPMENT } from "@/lib/equipment-defaults";
import { revalidatePath } from "next/cache";

export async function bootstrap() {
  await ensureAdmin();
  for (const eq of DEFAULT_EQUIPMENT) {
    await prisma.equipment.upsert({
      where: { code: eq.code },
      update: {},
      create: { ...eq },
    });
  }
}

export async function loginAction(formData: FormData) {
  await bootstrap();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/loadlists");
  const user = await verifyLogin(email, password);
  if (!user) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  const token = await signSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  await setSessionCookie(token);
  redirect(next.startsWith("/") ? next : "/loadlists");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function createUserAction(formData: FormData) {
  const me = await requireUser();
  if (me.role !== "admin") throw new Error("Admin only");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || email;
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 6) throw new Error("Email and password (6+ chars) required");
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      role: "planner",
    },
  });
  revalidatePath("/settings");
}
