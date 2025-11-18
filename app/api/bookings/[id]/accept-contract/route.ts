import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  CURRENT_CONTRACT_VERSION,
  CONTRACT_SECTIONS,
} from "@/lib/contract";

type AcceptContractRequestBody = {
  signerName: string;
};

function buildContractText(): string {
  return CONTRACT_SECTIONS.map(
    (section) => `${section.heading}\n\n${section.body}`
  ).join("\n\n");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  let body: AcceptContractRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const { signerName } = body;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    // CRITICAL: Contract acceptance is ONLY for EVENT bookings
    // Showings never use contracts
    if (booking.bookingType !== "EVENT") {
      return NextResponse.json(
        { error: "Contract acceptance is only available for event bookings." },
        { status: 400 }
      );
    }

    if (!signerName || typeof signerName !== "string" || !signerName.trim()) {
      return NextResponse.json(
        { error: "Signer name is required." },
        { status: 400 }
      );
    }

    const fullContractText = buildContractText();

    // If contract already accepted, we allow updating the signer name
    // but keep the original contract text and version
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        contractAccepted: true,
        contractAcceptedAt: new Date(),
        contractSignerName: signerName.trim(),
        // Only set version/text if not already set
        contractVersion:
          booking.contractVersion ?? CURRENT_CONTRACT_VERSION,
        contractText: booking.contractText ?? fullContractText,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to accept contract:", error);
    return NextResponse.json(
      { error: "Unable to accept contract at this time." },
      { status: 500 }
    );
  }
}

