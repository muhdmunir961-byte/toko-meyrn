import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const category = await db.category.upsert({ where: { name: 'Game Top Up' }, update: {}, create: { name: 'Game Top Up' } });
  await db.masterProduct.upsert({ where: { sku: 'DEMO-MLBB-86' }, update: {}, create: { sku: 'DEMO-MLBB-86', name: 'Demo Mobile Legends 86 Diamonds', costMinor: 12000, categoryId: category.id } });
  for (const [name, monthlyPriceMinor] of [['Free', 0], ['Starter', 1000000], ['Pro', 2500000], ['Business', 5000000]] as const) await db.subscriptionPlan.upsert({ where: { name }, update: { monthlyPriceMinor }, create: { name, monthlyPriceMinor } });
}
main().finally(() => db.$disconnect());