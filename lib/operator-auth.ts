import { createHmac, timingSafeEqual } from "node:crypto";

export const operatorSessionCookie = "flare_operator_session";
const sessionPayload = "flare-operator-v1";

function signingKey() {
  return process.env.OPERATOR_SESSION_SECRET ?? process.env.OPERATOR_PASSWORD ?? "";
}

function signature() {
  const key = signingKey();
  return key
    ? createHmac("sha256", key).update(sessionPayload).digest("base64url")
    : "";
}

export function isOperatorPassword(password: string) {
  const configuredPassword = process.env.OPERATOR_PASSWORD;
  if (!configuredPassword) return false;

  const received = Buffer.from(password);
  const expected = Buffer.from(configuredPassword);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function createOperatorSession() {
  const value = signature();
  if (!value) throw new Error("Operator access is not configured.");
  return `v1.${value}`;
}

export function hasOperatorSession(value?: string) {
  const expected = createOperatorSession();
  const received = Buffer.from(value ?? "");
  const target = Buffer.from(expected);
  return received.length === target.length && timingSafeEqual(received, target);
}
