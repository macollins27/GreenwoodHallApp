export const CURRENT_CONTRACT_VERSION = "v1.0";

export const CONTRACT_TITLE = "Greenwood Hall Rental Agreement";

export const CONTRACT_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "Barehall Rental",
    body: "Greenwood Hall provides the event space, tables, chairs, kitchen access, and restrooms. The renter is responsible for providing all food, drinks, decor, and service staff.",
  },
  {
    heading: "Security Deposit",
    body: "A $200 refundable security deposit is required to reserve your date. The deposit may be retained, in whole or in part, in the event of damages, rule violations, or cancellations within 30 days of the event date.",
  },
  {
    heading: "Cleanup & Condition",
    body: "The renter agrees to leave the hall in reasonably clean condition, remove all trash, and take all personal items at the end of the event. Additional cleaning fees may be applied if the premises are left in poor condition.",
  },
  {
    heading: "Decorations & Damage",
    body: "No staples, nails, screws, or damaging adhesives may be used on walls, ceilings, or fixtures. Confetti, glitter, or similar materials that are difficult to clean are not permitted. The renter is responsible for any damage caused by guests, vendors, or decorations.",
  },
  {
    heading: "Noise & Conduct",
    body: "The renter agrees to comply with all local noise ordinances and to ensure that guests behave respectfully toward neighbors and staff. Disorderly conduct may result in early termination of the event without refund.",
  },
  {
    heading: "Liability",
    body: "The renter assumes responsibility for the conduct and safety of guests and vendors. Greenwood Hall is not liable for loss, theft, or injury except as required by law.",
  },
  {
    heading: "Cancellations",
    body: "Cancellations made within 30 days of the event date may result in forfeiture of part or all of the security deposit and prepaid fees, at the sole discretion of Greenwood Hall.",
  },
];

export function buildContractText(): string {
  const sections = CONTRACT_SECTIONS.map(
    (section) => `${section.heading}\n${section.body}`
  );
  return `${CONTRACT_TITLE}\n\n${sections.join("\n\n")}`;
}

