import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createSessionToken, isCorrectAdminPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  let password: unknown;
  try {
    const body = await request.json();
    password = body?.password;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "Passwort erforderlich." }, { status: 400 });
  }

  let correct: boolean;
  try {
    correct = isCorrectAdminPassword(password);
  } catch {
    return NextResponse.json(
      { error: "Server ist nicht korrekt konfiguriert (ADMIN_PASSWORD fehlt)." },
      { status: 500 }
    );
  }

  if (!correct) {
    return NextResponse.json({ error: "Falsches Passwort." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}
