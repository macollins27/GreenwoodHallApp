import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { EVENT_BLOCKING_STATUS } from "@/lib/bookingStatus";

function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number
): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes + durationMinutes <= endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const min = currentMinutes % 60;
    const timeString = `${hour.toString().padStart(2, "0")}:${min
      .toString()
      .padStart(2, "0")}`;
    slots.push(timeString);
    currentMinutes += durationMinutes;
  }

  return slots;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  if (!dateStr) {
    return NextResponse.json(
      { error: "date parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Parse date in local timezone to avoid UTC conversion issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const dayOfWeek = date.getDay();

    // Get showing configuration
    const config = await prisma.showingConfig.findFirst({
      where: { key: "default" },
    });

    if (!config) {
      return NextResponse.json({ slots: [] });
    }

    // Get availability for this day of week
    const availability = await prisma.showingAvailability.findMany({
      where: {
        dayOfWeek,
        enabled: true,
      },
    });

    if (availability.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // Generate all possible time slots
    const allSlots: string[] = [];
    availability.forEach((window) => {
      const slots = generateTimeSlots(
        window.startTime,
        window.endTime,
        config.defaultDurationMinutes
      );
      allSlots.push(...slots);
    });

    // Check for blocked dates
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const blockedDate = await prisma.blockedDate.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (blockedDate) {
      return NextResponse.json({ slots: [], blocked: true, reason: blockedDate.reason });
    }

    // CRITICAL: Check if there's an EVENT on this date - events block entire day for showings
    const eventOnDate = await prisma.booking.findFirst({
      where: {
        bookingType: "EVENT",
        eventDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: EVENT_BLOCKING_STATUS,
      },
    });

    if (eventOnDate) {
      return NextResponse.json({ 
        slots: [], 
        blocked: true, 
        reason: "This date has an event booking. Showings are not available on event dates." 
      });
    }

    // If max slots per window is set, check existing bookings
    if (config.maxSlotsPerWindow < 999) {
      const existingShowings = await prisma.booking.findMany({
        where: {
          bookingType: "SHOWING",
          eventDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
          NOT: { status: "CANCELLED" },
        },
      });

      // Count bookings per slot
      const slotCounts: { [key: string]: number } = {};
      existingShowings.forEach((showing) => {
        const time = new Date(showing.startTime);
        const timeString = `${time.getHours().toString().padStart(2, "0")}:${time
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
        slotCounts[timeString] = (slotCounts[timeString] || 0) + 1;
      });

      // Create slot objects with availability status
      const slotsWithAvailability = allSlots.map((slot) => {
        const count = slotCounts[slot] || 0;
        const available = count < config.maxSlotsPerWindow;
        return {
          time: slot,
          available,
          reason: available ? undefined : "Fully booked",
        };
      });

      return NextResponse.json({ slots: slotsWithAvailability });
    }

    // Return all slots as available
    const slotsWithAvailability = allSlots.map((slot) => ({
      time: slot,
      available: true,
    }));

    return NextResponse.json({ slots: slotsWithAvailability });
  } catch (error) {
    console.error("Error fetching showing slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    );
  }
}
