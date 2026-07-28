export const dynamic = "force-dynamic";

const timeoutMs = 4_500;

export async function GET() {
  const streamUrl =
    process.env.STREAM_HEALTH_URL ??
    process.env.NEXT_PUBLIC_HLS_STREAM_URL ??
    "";

  if (!streamUrl) {
    return Response.json(
      {
        configured: false,
        online: false,
        checkedAt: new Date().toISOString(),
        message: "Playback endpoint is not configured.",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  try {
    const response = await fetch(streamUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "application/vnd.apple.mpegurl, application/x-mpegURL, */*",
      },
    });

    const body = response.ok ? await response.text() : "";
    const validPlaylist = body.includes("#EXTM3U");
    const online = response.ok && validPlaylist;

    return Response.json(
      {
        configured: true,
        online,
        checkedAt: new Date().toISOString(),
        statusCode: response.status,
        message: online
          ? "Live playlist is available."
          : "Gateway responded, but no active live playlist was found.",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return Response.json(
      {
        configured: true,
        online: false,
        checkedAt: new Date().toISOString(),
        message:
          error instanceof Error
            ? `Gateway unavailable: ${error.name}`
            : "Gateway unavailable.",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

