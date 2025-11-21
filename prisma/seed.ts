import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with test data...");

  // Clear existing data (optional - comment out if you want to preserve data)
  console.log("Clearing existing test data...");
  await prisma.bookingAddOn.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.blockedDate.deleteMany();
  await prisma.showingAvailability.deleteMany();

  // Seed add-ons (if not already seeded)
  console.log("Creating add-ons...");
  const whickerChair = await prisma.addOn.upsert({
    where: { id: "whicker-chair-default" },
    update: {},
    create: {
      id: "whicker-chair-default",
      name: "Whicker Chair",
      description: "Additional whicker chairs for your event",
      priceCents: 2500,
      active: true,
      sortOrder: 0,
    },
  });

  const tableCloth = await prisma.addOn.upsert({
    where: { id: "table-cloth-white" },
    update: {},
    create: {
      id: "table-cloth-white",
      name: "White Table Cloth",
      description: "Premium white linen table cloths",
      priceCents: 1500,
      active: true,
      sortOrder: 1,
    },
  });

  const centerpiece = await prisma.addOn.upsert({
    where: { id: "floral-centerpiece" },
    update: {},
    create: {
      id: "floral-centerpiece",
      name: "Floral Centerpiece",
      description: "Fresh floral arrangements for tables",
      priceCents: 3500,
      active: true,
      sortOrder: 2,
    },
  });

  console.log("✓ Add-ons created");

  // Seed showing availability (Mon-Fri, 9 AM - 5 PM)
  console.log("Setting up showing availability...");
  const showingSlots = [];
  for (let day = 1; day <= 5; day++) {
    // Monday = 1, Friday = 5
    showingSlots.push(
      prisma.showingAvailability.upsert({
        where: { id: `weekday-${day}-morning` },
        update: {},
        create: {
          id: `weekday-${day}-morning`,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "12:00",
          enabled: true,
        },
      }),
      prisma.showingAvailability.upsert({
        where: { id: `weekday-${day}-afternoon` },
        update: {},
        create: {
          id: `weekday-${day}-afternoon`,
          dayOfWeek: day,
          startTime: "13:00",
          endTime: "17:00",
          enabled: true,
        },
      })
    );
  }
  await Promise.all(showingSlots);
  console.log("✓ Showing availability configured");

  // Create sample bookings
  console.log("Creating sample bookings...");

  const today = new Date();
  const getDate = (daysFromNow: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + daysFromNow);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const getDateTime = (daysFromNow: number, hour: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + daysFromNow);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0);
  };

  // EVENT 1: Upcoming wedding (14 days from now, Saturday)
  await prisma.booking.create({
    data: {
      bookingType: "EVENT",
      eventDate: getDate(14),
      startTime: getDateTime(14, 16),
      endTime: getDateTime(14, 22),
      dayType: "weekend",
      hourlyRateCents: 17500,
      eventHours: 6,
      extraSetupHours: 2,
      eventType: "Wedding",
      guestCount: 150,
      contactName: "Sarah & John Miller",
      contactEmail: "sarah.miller@example.com",
      contactPhone: "(555) 123-4567",
      notes: "Need extra chairs and white table cloths. Ceremony at 4 PM, reception to follow.",
      status: "CONFIRMED",
      baseAmountCents: 105000, // 6 hrs × $175
      extraSetupCents: 10000, // 2 hrs × $50
      depositCents: 30000,
      totalCents: 197500, // base + setup + deposit + add-ons (52500)
      rectTablesRequested: 8,
      roundTablesRequested: 12,
      chairsRequested: 150,
      setupNotes: "Ceremony setup by 3 PM. Reception tables arranged in U-shape.",
      contractAccepted: true,
      contractAcceptedAt: new Date(),
      contractSignerName: "Sarah Miller",
      contractVersion: "v1.0",
      contractText: "Standard event contract terms...",
      stripePaymentStatus: "paid",
      amountPaidCents: 197500,
      paymentMethod: "STRIPE",
      addOns: {
        create: [
          {
            addOnId: whickerChair.id,
            quantity: 20,
            priceAtBooking: 2500,
          },
          {
            addOnId: tableCloth.id,
            quantity: 15,
            priceAtBooking: 1500,
          },
        ],
      },
    },
  });

  // EVENT 2: Corporate meeting (7 days from now, weekday)
  await prisma.booking.create({
    data: {
      bookingType: "EVENT",
      eventDate: getDate(7),
      startTime: getDateTime(7, 9),
      endTime: getDateTime(7, 17),
      dayType: "weekday",
      hourlyRateCents: 12500,
      eventHours: 8,
      extraSetupHours: 1,
      eventType: "Corporate",
      guestCount: 50,
      contactName: "David Chen",
      contactEmail: "dchen@techcorp.com",
      contactPhone: "(555) 987-6543",
      notes: "Annual board meeting. Need projector and AV setup.",
      status: "CONFIRMED",
      baseAmountCents: 100000, // 8 hrs × $125
      extraSetupCents: 5000, // 1 hr × $50
      depositCents: 30000,
      totalCents: 135000,
      rectTablesRequested: 6,
      chairsRequested: 50,
      setupNotes: "Conference-style seating. AV setup by 8:30 AM.",
      contractAccepted: true,
      contractAcceptedAt: new Date(),
      contractSignerName: "David Chen",
      contractVersion: "v1.0",
      contractText: "Standard event contract terms...",
      stripePaymentStatus: "paid",
      amountPaidCents: 135000,
      paymentMethod: "STRIPE",
    },
  });

  // EVENT 3: Birthday party (21 days from now, Saturday)
  await prisma.booking.create({
    data: {
      bookingType: "EVENT",
      eventDate: getDate(21),
      startTime: getDateTime(21, 14),
      endTime: getDateTime(21, 18),
      dayType: "weekend",
      hourlyRateCents: 17500,
      eventHours: 4,
      extraSetupHours: 0,
      eventType: "Birthday",
      guestCount: 40,
      contactName: "Maria Rodriguez",
      contactEmail: "maria.r@email.com",
      contactPhone: "(555) 456-7890",
      notes: "50th birthday celebration",
      status: "PENDING",
      baseAmountCents: 70000, // 4 hrs × $175
      extraSetupCents: 0,
      depositCents: 30000,
      totalCents: 103500, // includes add-ons
      roundTablesRequested: 5,
      chairsRequested: 40,
      contractAccepted: false,
      stripePaymentStatus: null,
      amountPaidCents: 0,
      paymentMethod: null,
      addOns: {
        create: [
          {
            addOnId: centerpiece.id,
            quantity: 5,
            priceAtBooking: 3500,
          },
        ],
      },
    },
  });

  // EVENT 4: Baby shower (35 days from now, Sunday)
  await prisma.booking.create({
    data: {
      bookingType: "EVENT",
      eventDate: getDate(35),
      startTime: getDateTime(35, 13),
      endTime: getDateTime(35, 17),
      dayType: "weekend",
      hourlyRateCents: 17500,
      eventHours: 4,
      extraSetupHours: 1,
      eventType: "Baby Shower",
      guestCount: 30,
      contactName: "Emily Watson",
      contactEmail: "emily.watson@gmail.com",
      contactPhone: "(555) 234-5678",
      notes: "Gender reveal theme - pink and blue decorations",
      status: "CONFIRMED",
      baseAmountCents: 70000,
      extraSetupCents: 5000,
      depositCents: 30000,
      totalCents: 105000,
      roundTablesRequested: 4,
      chairsRequested: 30,
      setupNotes: "Decorations will be provided by client",
      contractAccepted: true,
      contractAcceptedAt: new Date(),
      contractSignerName: "Emily Watson",
      contractVersion: "v1.0",
      contractText: "Standard event contract terms...",
      stripePaymentStatus: "paid",
      amountPaidCents: 105000,
      paymentMethod: "CASH",
    },
  });

  // SHOWING 1: Tomorrow at 10 AM
  await prisma.booking.create({
    data: {
      bookingType: "SHOWING",
      eventDate: getDate(1),
      startTime: getDateTime(1, 10),
      endTime: getDateTime(1, 10.5),
      dayType: "weekday",
      hourlyRateCents: 0,
      eventHours: 0,
      extraSetupHours: 0,
      eventType: "Showing",
      contactName: "Jennifer Adams",
      contactEmail: "jadams@email.com",
      contactPhone: "(555) 111-2222",
      notes: "Interested in wedding venue for next summer",
      status: "CONFIRMED",
      baseAmountCents: 0,
      extraSetupCents: 0,
      depositCents: 0,
      totalCents: 0,
      contractAccepted: false,
      stripePaymentStatus: null,
      amountPaidCents: 0,
      paymentMethod: null,
    },
  });

  // SHOWING 2: In 3 days at 2 PM
  await prisma.booking.create({
    data: {
      bookingType: "SHOWING",
      eventDate: getDate(3),
      startTime: getDateTime(3, 14),
      endTime: getDateTime(3, 14.5),
      dayType: "weekday",
      hourlyRateCents: 0,
      eventHours: 0,
      extraSetupHours: 0,
      eventType: "Showing",
      contactName: "Robert Thompson",
      contactEmail: "rthompson@company.com",
      contactPhone: "(555) 333-4444",
      notes: "Corporate event planning",
      status: "CONFIRMED",
      baseAmountCents: 0,
      extraSetupCents: 0,
      depositCents: 0,
      totalCents: 0,
      contractAccepted: false,
      stripePaymentStatus: null,
      amountPaidCents: 0,
      paymentMethod: null,
    },
  });

  // SHOWING 3: In 5 days at 11 AM
  await prisma.booking.create({
    data: {
      bookingType: "SHOWING",
      eventDate: getDate(5),
      startTime: getDateTime(5, 11),
      endTime: getDateTime(5, 11.5),
      dayType: "weekday",
      hourlyRateCents: 0,
      eventHours: 0,
      extraSetupHours: 0,
      eventType: "Showing",
      contactName: "Lisa Park",
      contactEmail: "lpark@email.com",
      contactPhone: "(555) 555-6666",
      notes: "Looking for birthday party venue",
      status: "CONFIRMED",
      baseAmountCents: 0,
      extraSetupCents: 0,
      depositCents: 0,
      totalCents: 0,
      contractAccepted: false,
      stripePaymentStatus: null,
      amountPaidCents: 0,
      paymentMethod: null,
    },
  });

  // Add a blocked date example (60 days from now - maintenance day)
  await prisma.blockedDate.create({
    data: {
      date: getDate(60),
      reason: "Facility maintenance and repairs",
    },
  });

  console.log("✓ Sample bookings created");
  console.log("\n📊 Summary:");
  console.log("  - 4 EVENT bookings (2 confirmed & paid, 1 pending, 1 paid with cash)");
  console.log("  - 3 SHOWING bookings");
  console.log("  - 3 Add-ons available");
  console.log("  - 1 Blocked date");
  console.log("  - Showing availability configured (Mon-Fri, 9 AM - 5 PM)");
  console.log("\n✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
