import { NextResponse } from "next/server";
import { FAQS } from "@/lib/constants";

export async function GET() {
  return NextResponse.json({ faqs: FAQS });
}

