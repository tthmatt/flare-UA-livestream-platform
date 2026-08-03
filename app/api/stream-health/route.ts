export const dynamic = "force-dynamic";

const timeoutMs = 4_500;
const defaultStreamUrl =
  "http://3.1.11.194:8888/live/drone/index.m3u8";

export async function GET() {
  const streamUrl =
    process.env.STREAM_HEALTH_URL ??
    process.env.NEXT_PUBLIC_HLS_STREAM_URL ??
    defaultStreamUrl;

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
          : "The aircraft feed is currently paused.",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return Response.json(
      {
        configured: true,
        online: false,
        checkedAt: new Date().toISOString(),
        message: "The aircraft feed is currently paused.",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
