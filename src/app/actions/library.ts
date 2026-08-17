"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function upsertSkuAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const data = {
    sku: String(formData.get("sku") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    lengthMm: Number(formData.get("lengthMm") ?? 0),
    widthMm: Number(formData.get("widthMm") ?? 0),
    heightMm: Number(formData.get("heightMm") ?? 0),
    weightG: Number(formData.get("weightG") ?? 0),
    notStackable: formData.get("notStackable") === "on",
    bottomOnly: formData.get("bottomOnly") === "on",
    rotatable: formData.get("rotatable") === "on",
    tiltable: formData.get("tiltable") === "on",
    color: String(formData.get("color") ?? "#c9a227"),
    notes: String(formData.get("notes") ?? ""),
  };
  if (!data.sku || !data.name) throw new Error("SKU and name required");
  if (id) {
    await prisma.cargoSku.update({ where: { id }, data });
  } else {
    await prisma.cargoSku.create({ data });
  }
  revalidatePath("/library");
}

export async function deleteSkuAction(id: string) {
  await requireUser();
  await prisma.cargoSku.delete({ where: { id } });
  revalidatePath("/library");
}

export async function createEquipmentAction(formData: FormData) {
  await requireUser();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  await prisma.equipment.create({
    data: {
      name: String(formData.get("name") ?? "").trim(),
      code,
      kind: String(formData.get("kind") ?? "container"),
      lengthMm: Number(formData.get("lengthMm") ?? 0),
      widthMm: Number(formData.get("widthMm") ?? 0),
      heightMm: Number(formData.get("heightMm") ?? 0),
      payloadG: Math.round(Number(formData.get("payloadKg") ?? 0) * 1000),
      color: String(formData.get("color") ?? "#4a6270"),
      isSystem: false,
    },
  });
  revalidatePath("/equipment");
}

export async function deleteEquipmentAction(id: string) {
  await requireUser();
  const eq = await prisma.equipment.findUnique({ where: { id } });
  if (!eq || eq.isSystem) throw new Error("Cannot delete system equipment");
  await prisma.equipment.delete({ where: { id } });
  revalidatePath("/equipment");
}
