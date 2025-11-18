import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    // Create default config
    await prisma.showingConfig.upsert({
      where: { key: "default" },
      update: {},
      create: {
        key: "default",
        defaultDurationMinutes: 30,
        maxSlotsPerWindow: 999,
      },
    });

    // Create default Thursday 3pm-6pm availability
    const existingAvailability = await prisma.showingAvailability.findMany();
    
    if (existingAvailability.length === 0) {
      await prisma.showingAvailability.create({
        data: {
          dayOfWeek: 4, // Thursday
          startTime: "15:00", // 3pm
          endTime: "18:00", // 6pm
          enabled: true,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Default showing availability initialized" });
  } catch (error) {
    console.error("Error initializing showing availability:", error);
    return NextResponse.json(
      { error: "Failed to initialize showing availability" },
      { status: 500 }
    );
  }
}
