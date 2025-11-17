import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminCredentials } from "@/lib/auth";

type LoginRequest = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const { email, password }: LoginRequest = await request.json().catch(() => ({
    email: undefined,
    password: undefined,
  }));

  const creds = getAdminCredentials();

  if (!creds.email || !creds.password) {
    return NextResponse.json(
      { error: "Admin credentials not configured." },
      { status: 500 }
    );
  }

  if (email !== creds.email || password !== creds.password) {
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "ok",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}

