import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const upstreamOrigin = "http://3.1.11.194:8888";

function copyHeader(headers: Headers, name: string, target: Headers) {
  const value = headers.get(name);
  if (value) target.set(name, value);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;

  if (!path.length || path.some((segment) => !segment || segment === "." || segment === "..")) {
    return new Response("Invalid stream path.", { status: 400 });
  }

  const upstreamUrl = new URL(
    `${upstreamOrigin}/${path.map(encodeURIComponent).join("/")}`,
  );
  upstreamUrl.search = request.nextUrl.search;

  const headers = new Headers({ Accept: request.headers.get("accept") ?? "*/*" });
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);

  try {
    const upstream = await fetch(upstreamUrl, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const responseHeaders = new Headers({
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Access-Control-Allow-Origin": request.nextUrl.origin,
      Vary: "Origin, Range",
    });

    for (const name of [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "last-modified",
      "etag",
    ]) {
      copyHeader(upstream.headers, name, responseHeaders);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response("Livestream gateway is unavailable.", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
