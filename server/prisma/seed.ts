import { PrismaClient, StationType, ProductType, StaffRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const location = await prisma.location.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Royal Gaming & Cafeteria - Main Branch",
      timezone: "Africa/Cairo",
    },
  });

  const stationDefs: { name: string; type: StationType; sortOrder: number; allowMultipleSessions?: boolean }[] = [
    { name: "PlayStation 1", type: StationType.PLAYSTATION, sortOrder: 1 },
    { name: "PlayStation 2", type: StationType.PLAYSTATION, sortOrder: 2 },
    { name: "PlayStation 3", type: StationType.PLAYSTATION, sortOrder: 3 },
    { name: "Pool Table", type: StationType.TABLE_GAME, sortOrder: 4 },
    { name: "Foosball Table", type: StationType.TABLE_GAME, sortOrder: 5 },
    // A skating rink is a shared zone, not a single-occupant station — several
    // customers can skate at once, each on their own independent timer.
    { name: "Skating Rink", type: StationType.SKATING, sortOrder: 6, allowMultipleSessions: true },
  ];

  for (const s of stationDefs) {
    const existing = await prisma.station.findFirst({ where: { locationId: location.id, name: s.name } });
    if (!existing) {
      await prisma.station.create({
        data: {
          locationId: location.id,
          name: s.name,
          type: s.type,
          sortOrder: s.sortOrder,
          allowMultipleSessions: s.allowMultipleSessions ?? false,
        },
      });
    }
  }

  // Categories are rows now, so the seed creates them before the products that
  // point at them. Names, colours and order match what the enum used to imply.
  const categorySeeds = [
    { name: "PlayStation", color: "#3987e5" },
    { name: "Table Games", color: "#d95926" },
    { name: "Skating", color: "#199e70" },
    { name: "Coffee", color: "#c98500" },
    { name: "Cafeteria", color: "#d55181" },
  ];
  const categoryIds = new Map<string, string>();
  for (const [i, c] of categorySeeds.entries()) {
    const row = await prisma.productCategory.upsert({
      where: { locationId_name: { locationId: location.id, name: c.name } },
      update: {},
      create: { locationId: location.id, name: c.name, color: c.color, sortOrder: i },
    });
    categoryIds.set(c.name, row.id);
  }
  const categoryId = (name: string) => {
    const id = categoryIds.get(name);
    if (!id) throw new Error(`Seed refers to an unknown category: ${name}`);
    return id;
  };

  type ProductSeed = {
    name: string;
    category: string;
    type: ProductType;
    price: number;
    durationMin?: number;
    stationTypeLink?: StationType;
    inStock?: boolean;
    stockQty?: number;
  };

  const packagesFor = (
    category: string,
    stationTypeLink: StationType,
    prices: { label: string; durationMin: number; price: number }[]
  ): ProductSeed[] =>
    prices.map((p) => ({
      name: p.label,
      category,
      type: ProductType.TIME_PACKAGE,
      price: p.price,
      durationMin: p.durationMin,
      stationTypeLink,
    }));

  const products: ProductSeed[] = [
    ...packagesFor("PlayStation", StationType.PLAYSTATION, [
      { label: "30 Minutes", durationMin: 30, price: 25 },
      { label: "1 Hour", durationMin: 60, price: 45 },
      { label: "2 Hours", durationMin: 120, price: 80 },
    ]),
    ...packagesFor("Table Games", StationType.TABLE_GAME, [
      { label: "30 Minutes", durationMin: 30, price: 20 },
      { label: "1 Hour", durationMin: 60, price: 35 },
      { label: "2 Hours", durationMin: 120, price: 60 },
    ]),
    ...packagesFor("Skating", StationType.SKATING, [
      { label: "30 Minutes", durationMin: 30, price: 30 },
      { label: "1 Hour", durationMin: 60, price: 50 },
      { label: "2 Hours", durationMin: 120, price: 90 },
    ]),
    { name: "Espresso", category: "Coffee", type: ProductType.ITEM, price: 15, stockQty: 100 },
    { name: "Cappuccino", category: "Coffee", type: ProductType.ITEM, price: 20, stockQty: 100 },
    { name: "Latte", category: "Coffee", type: ProductType.ITEM, price: 22, stockQty: 100 },
    { name: "Turkish Coffee", category: "Coffee", type: ProductType.ITEM, price: 18, stockQty: 100 },
    { name: "Bottled Water", category: "Cafeteria", type: ProductType.ITEM, price: 5, stockQty: 48 },
    { name: "Soft Drink (Can)", category: "Cafeteria", type: ProductType.ITEM, price: 10, stockQty: 36 },
    { name: "Potato Chips", category: "Cafeteria", type: ProductType.ITEM, price: 12, stockQty: 24 },
    { name: "Chocolate Bar", category: "Cafeteria", type: ProductType.ITEM, price: 15, stockQty: 30 },
    { name: "Gaming Socks", category: "Cafeteria", type: ProductType.ITEM, price: 25, stockQty: 0 },
    { name: "Energy Drink", category: "Cafeteria", type: ProductType.ITEM, price: 18, stockQty: 20 },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { locationId: location.id, name: p.name, categoryId: categoryId(p.category) },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          locationId: location.id,
          name: p.name,
          categoryId: categoryId(p.category),
          type: p.type,
          price: p.price,
          durationMin: p.durationMin,
          stationTypeLink: p.stationTypeLink,
          stockQty: p.type === ProductType.ITEM ? p.stockQty ?? 0 : null,
          inStock: p.type === ProductType.ITEM ? (p.stockQty ?? 0) > 0 : p.inStock ?? true,
        },
      });
    }
  }

  const staffDefs = [
    { name: "Admin User", email: "admin@royalgaming.local", password: "Admin123!", role: StaffRole.ADMIN },
    { name: "Cashier User", email: "cashier@royalgaming.local", password: "Cashier123!", role: StaffRole.CASHIER },
  ];

  for (const s of staffDefs) {
    const existing = await prisma.staff.findUnique({ where: { email: s.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(s.password, 10);
      await prisma.staff.create({
        data: { locationId: location.id, name: s.name, email: s.email, passwordHash, role: s.role },
      });
    }
  }

  const customerDefs = [
    { name: "Ahmed Hassan", phone: "01000000001" },
    { name: "Sara Ali", phone: "01000000002" },
  ];

  for (const c of customerDefs) {
    const existing = await prisma.customer.findFirst({ where: { locationId: location.id, name: c.name } });
    if (!existing) {
      await prisma.customer.create({ data: { locationId: location.id, name: c.name, phone: c.phone } });
    }
  }

  console.log("Seed complete.");
  console.log("Admin login: admin@royalgaming.local / Admin123!");
  console.log("Cashier login: cashier@royalgaming.local / Cashier123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
