import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_EQUIPMENT } from "../src/lib/equipment-defaults";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@local").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin123";

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      passwordHash: await bcrypt.hash(password, 10),
      role: "admin",
    },
  });

  for (const eq of DEFAULT_EQUIPMENT) {
    await prisma.equipment.upsert({
      where: { code: eq.code },
      update: { ...eq },
      create: { ...eq },
    });
  }

  const demo = [
    {
      sku: "PAL-STD",
      name: "Standard pallet",
      lengthMm: 1200,
      widthMm: 800,
      heightMm: 1400,
      weightG: 450000,
      notStackable: true,
      rotatable: true,
      color: "#c9a227",
    },
    {
      sku: "CTN-A",
      name: "Carton A",
      lengthMm: 600,
      widthMm: 400,
      heightMm: 400,
      weightG: 25000,
      rotatable: true,
      color: "#4aa3c2",
    },
    {
      sku: "CRT-HVY",
      name: "Heavy crate",
      lengthMm: 2000,
      widthMm: 1200,
      heightMm: 1200,
      weightG: 380000,
      notStackable: true,
      bottomOnly: true,
      rotatable: true,
      color: "#d06b4a",
    },
  ];

  for (const sku of demo) {
    await prisma.cargoSku.upsert({
      where: { sku: sku.sku },
      update: sku,
      create: sku,
    });
  }

  console.log("Seeded admin, equipment, and sample SKUs");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
