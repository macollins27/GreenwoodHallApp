import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding add-ons...");

  // Create default Whicker Chair add-on
  const whickerChair = await prisma.addOn.upsert({
    where: { id: "whicker-chair-default" },
    update: {},
    create: {
      id: "whicker-chair-default",
      name: "Whicker Chair",
      description: "Additional whicker chairs for your event",
      priceCents: 2500, // $25.00
      active: true,
      sortOrder: 1,
    },
  });

  console.log("✓ Created/updated add-on:", whickerChair.name);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
