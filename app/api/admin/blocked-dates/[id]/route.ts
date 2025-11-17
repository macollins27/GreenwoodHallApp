import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  if (!cookieStore.get(ADMIN_COOKIE_NAME)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;

  try {
    await prisma.blockedDate.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete blocked date", error);
    return NextResponse.json(
      { error: "Unable to delete blocked date." },
      { status: 500 }
    );
  }
}

