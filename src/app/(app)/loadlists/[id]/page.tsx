import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Planner } from "@/components/planner/Planner";
import type { PackResult } from "@/lib/packer";

export default async function LoadlistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const [list, equipment, skus] = await Promise.all([
    prisma.loadlist.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.equipment.findMany({ orderBy: { name: "asc" } }),
    prisma.cargoSku.findMany({ orderBy: { sku: "asc" } }),
  ]);
  if (!list) notFound();

  return (
    <Planner
      loadlist={{
        id: list.id,
        name: list.name,
        listType: list.listType,
        notes: list.notes,
        etd: list.etd ? list.etd.toISOString().slice(0, 10) : "",
        lengthUnit: list.lengthUnit,
        weightUnit: list.weightUnit,
        selectedEquipment: Array.isArray(list.selectedEquipment)
          ? (list.selectedEquipment as string[])
          : [],
        result: (list.result as PackResult | null) ?? null,
        items: list.items.map((i) => ({
          id: i.id,
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
        })),
      }}
      equipment={equipment}
      skus={skus}
    />
  );
}
