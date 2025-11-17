import BookingCompleteClient from "@/components/booking/BookingCompleteClient";

type PageProps = {
  searchParams: Promise<{ session_id?: string; sessionId?: string }>;
};

export default async function BookingCompletePage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const sessionId = resolved.session_id ?? resolved.sessionId ?? null;

  return <BookingCompleteClient sessionId={sessionId} />;
}

