import { NextResponse } from "next/server";
import {
  createOperatorSession,
  isOperatorPassword,
  operatorAccessConfigured,
  operatorSessionCookie,
} from "@/lib/operator-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!operatorAccessConfigured()) {
    return NextResponse.redirect(new URL("/operator/login?error=setup", request.url), 303);
  }

  const formData = await request.formData();
  const password = formData.get("password");

  if (typeof password !== "string" || !isOperatorPassword(password)) {
    return NextResponse.redirect(new URL("/operator/login?error=invalid", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/operator", request.url), 303);
  response.cookies.set({
    name: operatorSessionCookie,
    value: createOperatorSession(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
