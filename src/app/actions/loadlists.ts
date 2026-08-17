"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bootstrap } from "@/app/actions/auth";
import { packLoad, type PackItem, type PackResult } from "@/lib/packer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LengthUnit, WeightUnit } from "@/lib/units";

export type ItemInput = {
  id?: string;
  name: string;
  sku?: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  weightG: number;
  qty: number;
  notStackable: boolean;
  bottomOnly: boolean;
  rotatable: boolean;
  tiltable: boolean;
  color: string;
};

const PALETTE = ["#c9a227", "#4aa3c2", "#d06b4a", "#6bbf8a", "#8b7ad6", "#d48bb8", "#7a9e4e", "#c47a3a"];

export async function createLoadlistAction(formData: FormData) {
  await requireUser();
  await bootstrap();
  const name = String(formData.get("name") ?? "").trim() || "Untitled load plan";
  const listType = String(formData.get("listType") ?? "SEA");
  const etdRaw = String(formData.get("etd") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const lengthUnit = String(formData.get("lengthUnit") ?? "CM") as LengthUnit;
  const weightUnit = String(formData.get("weightUnit") ?? "KG") as WeightUnit;

  const defaults = await prisma.equipment.findMany({
    where: {
      code: { in: listType === "ROAD" ? ["53VAN", "BOX16"] : ["20DV", "40DV", "40HC"] },
    },
    select: { id: true },
  });

  const list = await prisma.loadlist.create({
    data: {
      name,
      listType: listType === "ROAD" ? "ROAD" : "SEA",
      etd: etdRaw ? new Date(etdRaw) : null,
      notes,
      lengthUnit,
      weightUnit,
      selectedEquipment: defaults.map((d) => d.id),
    },
  });
  redirect(`/loadlists/${list.id}`);
}

export async function deleteLoadlistAction(id: string) {
  await requireUser();
  await prisma.loadlist.delete({ where: { id } });
  revalidatePath("/loadlists");
}

export async function updateLoadlistMetaAction(
  id: string,
  data: {
    name?: string;
    notes?: string;
    etd?: string | null;
    lengthUnit?: string;
    weightUnit?: string;
    listType?: string;
    selectedEquipment?: string[];
  },
) {
  await requireUser();
  await prisma.loadlist.update({
    where: { id },
    data: {
      ...(data.name != null ? { name: data.name } : {}),
      ...(data.notes != null ? { notes: data.notes } : {}),
      ...(data.etd !== undefined ? { etd: data.etd ? new Date(data.etd) : null } : {}),
      ...(data.lengthUnit ? { lengthUnit: data.lengthUnit } : {}),
      ...(data.weightUnit ? { weightUnit: data.weightUnit } : {}),
      ...(data.listType ? { listType: data.listType } : {}),
      ...(data.selectedEquipment ? { selectedEquipment: data.selectedEquipment } : {}),
    },
  });
  revalidatePath(`/loadlists/${id}`);
}

export async function saveItemsAction(loadlistId: string, items: ItemInput[]) {
  await requireUser();
  await prisma.$transaction([
    prisma.cargoItem.deleteMany({ where: { loadlistId } }),
    ...items
      .filter((i) => i.lengthMm > 0 && i.widthMm > 0 && i.heightMm > 0 && i.weightG > 0)
      .map((i, idx) =>
        prisma.cargoItem.create({
          data: {
            loadlistId,
            sortOrder: idx,
            name: i.name.trim() || String(idx + 1),
            sku: i.sku ?? "",
            lengthMm: i.lengthMm,
            widthMm: i.widthMm,
            heightMm: i.heightMm,
            weightG: i.weightG,
            qty: Math.max(1, Math.floor(i.qty || 1)),
            notStackable: i.notStackable,
            bottomOnly: i.bottomOnly,
            rotatable: i.rotatable,
            tiltable: i.tiltable,
            color: i.color || PALETTE[idx % PALETTE.length],
          },
        }),
      ),
  ]);
  revalidatePath(`/loadlists/${loadlistId}`);
}

export async function calculateAction(loadlistId: string, items: ItemInput[], selectedEquipment: string[]) {
  await requireUser();
  await saveItemsAction(loadlistId, items);
  await prisma.loadlist.update({
    where: { id: loadlistId },
    data: { selectedEquipment },
  });

  const list = await prisma.loadlist.findUniqueOrThrow({
    where: { id: loadlistId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  const equipment = await prisma.equipment.findMany({
    where: { id: { in: selectedEquipment } },
  });
  const ordered = selectedEquipment
    .map((id) => equipment.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const packItems: PackItem[] = list.items.map((i) => ({
    id: i.id,
    name: i.name,
    l: i.lengthMm,
    w: i.widthMm,
    h: i.heightMm,
    weightG: i.weightG,
    qty: i.qty,
    notStackable: i.notStackable,
    bottomOnly: i.bottomOnly,
    rotatable: i.rotatable,
    tiltable: i.tiltable,
    color: i.color,
  }));

  const result: PackResult = packLoad(
    packItems,
    ordered.map((e) => ({
      id: e.id,
      name: e.name,
      L: e.lengthMm,
      W: e.widthMm,
      H: e.heightMm,
      payloadG: e.payloadG,
      color: e.color,
    })),
  );

  await prisma.loadlist.update({
    where: { id: loadlistId },
    data: { result: result as object },
  });
  revalidatePath(`/loadlists/${loadlistId}`);
  return result;
}

export async function addDemoCargoAction(loadlistId: string) {
  await requireUser();
  const demo: ItemInput[] = [
    {
      name: "Standard pallet",
      sku: "PAL-STD",
      lengthMm: 1200,
      widthMm: 800,
      heightMm: 1400,
      weightG: 450000,
      qty: 8,
      notStackable: true,
      bottomOnly: false,
      rotatable: true,
      tiltable: false,
      color: "#c9a227",
    },
    {
      name: "Carton A",
      sku: "CTN-A",
      lengthMm: 600,
      widthMm: 400,
      heightMm: 400,
      weightG: 25000,
      qty: 40,
      notStackable: false,
      bottomOnly: false,
      rotatable: true,
      tiltable: false,
      color: "#4aa3c2",
    },
    {
      name: "Heavy crate",
      sku: "CRT-HVY",
      lengthMm: 2000,
      widthMm: 1200,
      heightMm: 1200,
      weightG: 380000,
      qty: 4,
      notStackable: true,
      bottomOnly: true,
      rotatable: true,
      tiltable: false,
      color: "#d06b4a",
    },
  ];
  await saveItemsAction(loadlistId, demo);
}

export async function importSkusAction(loadlistId: string, skuIds: string[], qtyById: Record<string, number>) {
  await requireUser();
  const skus = await prisma.cargoSku.findMany({ where: { id: { in: skuIds } } });
  const existing = await prisma.cargoItem.findMany({
    where: { loadlistId },
    orderBy: { sortOrder: "asc" },
  });
  const merged: ItemInput[] = existing.map((i) => ({
    name: i.name,
    sku: i.sku,
    lengthMm: i.lengthMm,
    widthMm: i.widthMm,
    heightMm: i.heightMm,
    weightG: i.weightG,
    qty: i.qty,
    notStackable: i.notStackable,
    bottomOnly: i.bottomOnly,
    rotatable: i.rotatable,
    tiltable: i.tiltable,
    color: i.color,
  }));
  for (const s of skus) {
    merged.push({
      name: s.name,
      sku: s.sku,
      lengthMm: s.lengthMm,
      widthMm: s.widthMm,
      heightMm: s.heightMm,
      weightG: s.weightG,
      qty: Math.max(1, qtyById[s.id] ?? 1),
      notStackable: s.notStackable,
      bottomOnly: s.bottomOnly,
      rotatable: s.rotatable,
      tiltable: s.tiltable,
      color: s.color,
    });
  }
  await saveItemsAction(loadlistId, merged);
}
