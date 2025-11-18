import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [availability, config] = await Promise.all([
      prisma.showingAvailability.findMany({
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      prisma.showingConfig.findFirst({
        where: { key: "default" },
      }),
    ]);

    // If no config exists, create default
    let showingConfig = config;
    if (!showingConfig) {
      showingConfig = await prisma.showingConfig.create({
        data: {
          key: "default",
          defaultDurationMinutes: 30,
          maxSlotsPerWindow: 999,
        },
      });
    }

    return NextResponse.json({
      availability,
      config: showingConfig,
    });
  } catch (error) {
    console.error("Error fetching showing availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch showing availability" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { availability, config } = body;

    // Update config
    if (config) {
      await prisma.showingConfig.upsert({
        where: { key: "default" },
        update: {
          defaultDurationMinutes: config.defaultDurationMinutes,
          maxSlotsPerWindow: config.maxSlotsPerWindow,
        },
        create: {
          key: "default",
          defaultDurationMinutes: config.defaultDurationMinutes,
          maxSlotsPerWindow: config.maxSlotsPerWindow,
        },
      });
    }

    // Delete existing availability and recreate
    if (availability) {
      await prisma.showingAvailability.deleteMany({});
      
      const availabilityData = availability.map((item: any) => ({
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        enabled: item.enabled ?? true,
      }));

      if (availabilityData.length > 0) {
        await prisma.showingAvailability.createMany({
          data: availabilityData,
        });
      }
    }

    const [updatedAvailability, updatedConfig] = await Promise.all([
      prisma.showingAvailability.findMany({
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      prisma.showingConfig.findFirst({
        where: { key: "default" },
      }),
    ]);

    return NextResponse.json({
      availability: updatedAvailability,
      config: updatedConfig,
    });
  } catch (error) {
    console.error("Error updating showing availability:", error);
    return NextResponse.json(
      { error: "Failed to update showing availability" },
      { status: 500 }
    );
  }
}
