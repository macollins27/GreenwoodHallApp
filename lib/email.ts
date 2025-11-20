import { ServerClient } from "postmark";
import type { Booking } from "@prisma/client";
import { formatDateForDisplay, formatTimeForDisplay } from "./datetime";

// Validate environment variables
const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
const POSTMARK_FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL;

if (!POSTMARK_SERVER_TOKEN) {
  throw new Error("POSTMARK_SERVER_TOKEN is not configured in environment variables");
}

if (!POSTMARK_FROM_EMAIL) {
  throw new Error("POSTMARK_FROM_EMAIL is not configured in environment variables");
}

// Assign validated values to constants with definite types
const SERVER_TOKEN: string = POSTMARK_SERVER_TOKEN;
const FROM_EMAIL: string = POSTMARK_FROM_EMAIL;

// Create Postmark client instance
const postmarkClient = new ServerClient(SERVER_TOKEN);

// Utility types for bookings with relations
type BookingWithAddOns = Booking & {
  addOns?: Array<{
    quantity: number;
    priceAtBooking: number;
    addOn: {
      name: string;
      description: string | null;
    };
  }>;
};

// Format currency helper
const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

/**
 * Send booking confirmation email for EVENT bookings
 */
export async function sendBookingConfirmationEmail(
  booking: BookingWithAddOns
): Promise<void> {
  console.log(`📧 Attempting to send EVENT confirmation email to ${booking.contactEmail}...`);
  
  if (booking.bookingType !== "EVENT") {
    console.warn("sendBookingConfirmationEmail called for non-EVENT booking");
    return;
  }

  try {
    // Build setup details section
    let setupDetails = "";
    if (
      booking.rectTablesRequested ||
      booking.roundTablesRequested ||
      booking.chairsRequested ||
      booking.setupNotes
    ) {
      setupDetails = "\n\nSETUP DETAILS:\n";
      if (booking.rectTablesRequested) {
        setupDetails += `• Rectangular Tables: ${booking.rectTablesRequested}\n`;
      }
      if (booking.roundTablesRequested) {
        setupDetails += `• Round Tables: ${booking.roundTablesRequested}\n`;
      }
      if (booking.chairsRequested) {
        setupDetails += `• Chairs: ${booking.chairsRequested}\n`;
      }
      if (booking.setupNotes) {
        setupDetails += `• Notes: ${booking.setupNotes}\n`;
      }
    }

    // Build add-ons section
    let addOnsDetails = "";
    if (booking.addOns && booking.addOns.length > 0) {
      addOnsDetails = "\n\nADD-ONS:\n";
      for (const bookingAddOn of booking.addOns) {
        addOnsDetails += `• ${bookingAddOn.addOn.name} x${bookingAddOn.quantity} - ${formatCurrency(bookingAddOn.priceAtBooking * bookingAddOn.quantity)}\n`;
        if (bookingAddOn.addOn.description) {
          addOnsDetails += `  ${bookingAddOn.addOn.description}\n`;
        }
      }
    }

    // Build payment status
    const paymentStatus =
      booking.stripePaymentStatus === "paid"
        ? `✓ Paid - ${formatCurrency(booking.amountPaidCents)}`
        : `Pending - Total: ${formatCurrency(booking.totalCents)}`;

    const textBody = `
Your Greenwood Hall event is confirmed!

BOOKING DETAILS:
• Booking Type: ${booking.bookingType}
• Event Type: ${booking.eventType || "Not specified"}
• Date: ${formatDateForDisplay(booking.eventDate)}
• Time: ${formatTimeForDisplay(booking.startTime)} - ${formatTimeForDisplay(booking.endTime)}
• Guest Count: ${booking.guestCount || "Not specified"}
${setupDetails}${addOnsDetails}

PAYMENT:
• ${paymentStatus}

VENUE INFORMATION:
Greenwood Hall
[Your venue address here]
Contact: ${FROM_EMAIL}

${booking.notes ? `\nYOUR NOTES:\n${booking.notes}\n` : ""}
Thank you for choosing Greenwood Hall for your event!

---
Booking ID: ${booking.id}
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c5f2d; border-bottom: 2px solid #2c5f2d; padding-bottom: 10px; }
    h2 { color: #2c5f2d; margin-top: 20px; }
    .detail-row { margin: 8px 0; }
    .label { font-weight: bold; }
    .payment { background: #f0f8f0; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    ul { list-style: none; padding-left: 0; }
    li { padding: 5px 0; }
  </style>
</head>
<body>
  <h1>Your Greenwood Hall Event is Confirmed!</h1>
  
  <h2>Booking Details</h2>
  <div class="detail-row"><span class="label">Booking Type:</span> ${booking.bookingType}</div>
  <div class="detail-row"><span class="label">Event Type:</span> ${booking.eventType || "Not specified"}</div>
  <div class="detail-row"><span class="label">Date:</span> ${formatDateForDisplay(booking.eventDate)}</div>
  <div class="detail-row"><span class="label">Time:</span> ${formatTimeForDisplay(booking.startTime)} - ${formatTimeForDisplay(booking.endTime)}</div>
  <div class="detail-row"><span class="label">Guest Count:</span> ${booking.guestCount || "Not specified"}</div>
  
  ${
    setupDetails
      ? `
  <h2>Setup Details</h2>
  <ul>
    ${booking.rectTablesRequested ? `<li>Rectangular Tables: ${booking.rectTablesRequested}</li>` : ""}
    ${booking.roundTablesRequested ? `<li>Round Tables: ${booking.roundTablesRequested}</li>` : ""}
    ${booking.chairsRequested ? `<li>Chairs: ${booking.chairsRequested}</li>` : ""}
    ${booking.setupNotes ? `<li>Notes: ${booking.setupNotes}</li>` : ""}
  </ul>
  `
      : ""
  }
  
  ${
    booking.addOns && booking.addOns.length > 0
      ? `
  <h2>Add-ons</h2>
  <ul>
    ${booking.addOns
      .map(
        (addon) => `
      <li>
        <strong>${addon.addOn.name}</strong> x${addon.quantity} - ${formatCurrency(addon.priceAtBooking * addon.quantity)}
        ${addon.addOn.description ? `<br><small>${addon.addOn.description}</small>` : ""}
      </li>
    `
      )
      .join("")}
  </ul>
  `
      : ""
  }
  
  <div class="payment">
    <h2 style="margin-top: 0;">Payment</h2>
    <div>${paymentStatus}</div>
  </div>
  
  <h2>Venue Information</h2>
  <div class="detail-row">Greenwood Hall</div>
  <div class="detail-row">[Your venue address here]</div>
  <div class="detail-row">Contact: ${FROM_EMAIL}</div>
  
  ${booking.notes ? `<h2>Your Notes</h2><p>${booking.notes}</p>` : ""}
  
  <div class="footer">
    <p>Thank you for choosing Greenwood Hall for your event!</p>
    <p>Booking ID: ${booking.id}</p>
  </div>
</body>
</html>
    `.trim();

    await postmarkClient.sendEmail({
      From: FROM_EMAIL,
      To: booking.contactEmail,
      Subject: `Your Greenwood Hall event is confirmed – ${formatDateForDisplay(booking.eventDate)}`,
      TextBody: textBody,
      HtmlBody: htmlBody,
      MessageStream: "outbound",
    });

    console.log(`✅ Event confirmation email sent to ${booking.contactEmail} for booking ${booking.id}`);
  } catch (error) {
    console.error("❌ Failed to send booking confirmation email:", error);
    console.error("   Booking ID:", booking.id);
    console.error("   Customer email:", booking.contactEmail);
    console.error("   Error details:", error instanceof Error ? error.message : String(error));
    // Don't throw - we don't want email failures to break booking creation
  }
}

/**
 * Send showing confirmation email for SHOWING bookings
 */
export async function sendShowingConfirmationEmail(
  booking: Booking
): Promise<void> {
  if (booking.bookingType !== "SHOWING") {
    console.warn("sendShowingConfirmationEmail called for non-SHOWING booking");
    return;
  }

  try {
    const textBody = `
Your Greenwood Hall showing is scheduled!

SHOWING DETAILS:
• Booking Type: ${booking.bookingType}
• Date: ${formatDateForDisplay(booking.eventDate)}
• Time: ${formatTimeForDisplay(booking.startTime)} - ${formatTimeForDisplay(booking.endTime)}

VENUE INFORMATION:
Greenwood Hall
[Your venue address here]
Contact: ${FROM_EMAIL}

${booking.notes ? `\nYOUR NOTES:\n${booking.notes}\n` : ""}
We look forward to showing you our beautiful venue!

---
Booking ID: ${booking.id}
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c5f2d; border-bottom: 2px solid #2c5f2d; padding-bottom: 10px; }
    h2 { color: #2c5f2d; margin-top: 20px; }
    .detail-row { margin: 8px 0; }
    .label { font-weight: bold; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Your Greenwood Hall Showing is Scheduled!</h1>
  
  <h2>Showing Details</h2>
  <div class="detail-row"><span class="label">Booking Type:</span> ${booking.bookingType}</div>
  <div class="detail-row"><span class="label">Date:</span> ${formatDateForDisplay(booking.eventDate)}</div>
  <div class="detail-row"><span class="label">Time:</span> ${formatTimeForDisplay(booking.startTime)} - ${formatTimeForDisplay(booking.endTime)}</div>
  
  <h2>Venue Information</h2>
  <div class="detail-row">Greenwood Hall</div>
  <div class="detail-row">[Your venue address here]</div>
  <div class="detail-row">Contact: ${FROM_EMAIL}</div>
  
  ${booking.notes ? `<h2>Your Notes</h2><p>${booking.notes}</p>` : ""}
  
  <div class="footer">
    <p>We look forward to showing you our beautiful venue!</p>
    <p>Booking ID: ${booking.id}</p>
  </div>
</body>
</html>
    `.trim();

    await postmarkClient.sendEmail({
      From: FROM_EMAIL,
      To: booking.contactEmail,
      Subject: `Your Greenwood Hall showing is scheduled – ${formatDateForDisplay(booking.eventDate)}`,
      TextBody: textBody,
      HtmlBody: htmlBody,
      MessageStream: "outbound",
    });

    console.log(`Showing confirmation email sent to ${booking.contactEmail} for booking ${booking.id}`);
  } catch (error) {
    console.error("Failed to send showing confirmation email:", error);
    // Don't throw - we don't want email failures to break booking creation
  }
}

/**
 * Send admin notification email for new bookings
 */
export async function sendAdminNotificationEmail(
  booking: BookingWithAddOns,
  type: "EVENT" | "SHOWING"
): Promise<void> {
  console.log(`📧 Attempting to send ADMIN notification for ${type} booking ${booking.id}...`);
  
  try {
    // Build details based on booking type
    let detailsSection = "";

    if (type === "EVENT") {
      detailsSection = `
EVENT DETAILS:
• Event Type: ${booking.eventType || "Not specified"}
• Guest Count: ${booking.guestCount || "Not specified"}
• Duration: ${booking.eventHours} hours${booking.extraSetupHours > 0 ? ` + ${booking.extraSetupHours} setup hours` : ""}
`;

      // Add setup details
      if (
        booking.rectTablesRequested ||
        booking.roundTablesRequested ||
        booking.chairsRequested ||
        booking.setupNotes
      ) {
        detailsSection += "\nSETUP REQUIREMENTS:\n";
        if (booking.rectTablesRequested) {
          detailsSection += `• Rectangular Tables: ${booking.rectTablesRequested}\n`;
        }
        if (booking.roundTablesRequested) {
          detailsSection += `• Round Tables: ${booking.roundTablesRequested}\n`;
        }
        if (booking.chairsRequested) {
          detailsSection += `• Chairs: ${booking.chairsRequested}\n`;
        }
        if (booking.setupNotes) {
          detailsSection += `• Setup Notes: ${booking.setupNotes}\n`;
        }
      }

      // Add add-ons
      if (booking.addOns && booking.addOns.length > 0) {
        detailsSection += "\nADD-ONS:\n";
        for (const addon of booking.addOns) {
          detailsSection += `• ${addon.addOn.name} x${addon.quantity} - ${formatCurrency(addon.priceAtBooking * addon.quantity)}\n`;
        }
      }

      // Add pricing
      detailsSection += `
PRICING:
• Base Amount: ${formatCurrency(booking.baseAmountCents)}
• Extra Setup: ${formatCurrency(booking.extraSetupCents)}
• Security Deposit: ${formatCurrency(booking.depositCents)}
• Total: ${formatCurrency(booking.totalCents)}
• Payment Status: ${booking.stripePaymentStatus || "Pending"}
`;
    } else {
      // SHOWING details
      detailsSection = `
SHOWING DETAILS:
• Duration: ${formatTimeForDisplay(booking.startTime)} - ${formatTimeForDisplay(booking.endTime)}
`;
    }

    const textBody = `
New ${type} booking received!

CUSTOMER INFORMATION:
• Name: ${booking.contactName}
• Email: ${booking.contactEmail}
• Phone: ${booking.contactPhone || "Not provided"}

BOOKING INFORMATION:
• Date: ${formatDateForDisplay(booking.eventDate)}
• Time: ${formatTimeForDisplay(booking.startTime)} - ${formatTimeForDisplay(booking.endTime)}
${detailsSection}
${booking.notes ? `\nCUSTOMER NOTES:\n${booking.notes}\n` : ""}
---
Booking ID: ${booking.id}
Status: ${booking.status}
Created: ${formatDateForDisplay(booking.createdAt, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c5f2d; border-bottom: 2px solid #2c5f2d; padding-bottom: 10px; }
    h2 { color: #2c5f2d; margin-top: 20px; }
    .detail-row { margin: 8px 0; }
    .label { font-weight: bold; }
    .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    ul { list-style: none; padding-left: 0; }
    li { padding: 5px 0; }
  </style>
</head>
<body>
  <h1>New ${type} Booking Received!</h1>
  
  <div class="highlight">
    <h2 style="margin-top: 0;">Customer Information</h2>
    <div class="detail-row"><span class="label">Name:</span> ${booking.contactName}</div>
    <div class="detail-row"><span class="label">Email:</span> ${booking.contactEmail}</div>
    <div class="detail-row"><span class="label">Phone:</span> ${booking.contactPhone || "Not provided"}</div>
  </div>
  
  <h2>Booking Information</h2>
  <div class="detail-row"><span class="label">Date:</span> ${formatDateForDisplay(booking.eventDate)}</div>
  <div class="detail-row"><span class="label">Time:</span> ${formatTimeForDisplay(booking.startTime)} - ${formatTimeForDisplay(booking.endTime)}</div>
  
  ${
    type === "EVENT"
      ? `
  <div class="detail-row"><span class="label">Event Type:</span> ${booking.eventType || "Not specified"}</div>
  <div class="detail-row"><span class="label">Guest Count:</span> ${booking.guestCount || "Not specified"}</div>
  <div class="detail-row"><span class="label">Duration:</span> ${booking.eventHours} hours${booking.extraSetupHours > 0 ? ` + ${booking.extraSetupHours} setup hours` : ""}</div>
  
  ${
    booking.rectTablesRequested ||
    booking.roundTablesRequested ||
    booking.chairsRequested ||
    booking.setupNotes
      ? `
  <h2>Setup Requirements</h2>
  <ul>
    ${booking.rectTablesRequested ? `<li>Rectangular Tables: ${booking.rectTablesRequested}</li>` : ""}
    ${booking.roundTablesRequested ? `<li>Round Tables: ${booking.roundTablesRequested}</li>` : ""}
    ${booking.chairsRequested ? `<li>Chairs: ${booking.chairsRequested}</li>` : ""}
    ${booking.setupNotes ? `<li>Setup Notes: ${booking.setupNotes}</li>` : ""}
  </ul>
  `
      : ""
  }
  
  ${
    booking.addOns && booking.addOns.length > 0
      ? `
  <h2>Add-ons</h2>
  <ul>
    ${booking.addOns
      .map(
        (addon) =>
          `<li>${addon.addOn.name} x${addon.quantity} - ${formatCurrency(addon.priceAtBooking * addon.quantity)}</li>`
      )
      .join("")}
  </ul>
  `
      : ""
  }
  
  <h2>Pricing</h2>
  <ul>
    <li>Base Amount: ${formatCurrency(booking.baseAmountCents)}</li>
    <li>Extra Setup: ${formatCurrency(booking.extraSetupCents)}</li>
    <li>Security Deposit: ${formatCurrency(booking.depositCents)}</li>
    <li><strong>Total: ${formatCurrency(booking.totalCents)}</strong></li>
    <li>Payment Status: ${booking.stripePaymentStatus || "Pending"}</li>
  </ul>
  `
      : ""
  }
  
  ${booking.notes ? `<h2>Customer Notes</h2><p>${booking.notes}</p>` : ""}
  
  <div class="footer">
    <p>Booking ID: ${booking.id}</p>
    <p>Status: ${booking.status}</p>
    <p>Created: ${formatDateForDisplay(booking.createdAt, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
  </div>
</body>
</html>
    `.trim();

    await postmarkClient.sendEmail({
      From: FROM_EMAIL,
      To: FROM_EMAIL, // Send to admin (same as from email)
      Subject: `New ${type} booked – ${formatDateForDisplay(booking.eventDate)}`,
      TextBody: textBody,
      HtmlBody: htmlBody,
      MessageStream: "outbound",
    });

    console.log(`✅ Admin notification email sent for ${type} booking ${booking.id} to ${FROM_EMAIL}`);
  } catch (error) {
    console.error("❌ Failed to send admin notification email:", error);
    // Don't throw - we don't want email failures to break booking creation
  }
}
