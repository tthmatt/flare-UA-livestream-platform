import { StreamConsole } from "@/components/stream-console";

export const dynamic = "force-dynamic";

export default function Home() {
  const rtmpBaseUrl =
    process.env.NEXT_PUBLIC_RTMP_BASE_URL ??
    "rtmp://livestream.flaredynamics.com:1935/live";
  const hlsStreamUrl =
    process.env.NEXT_PUBLIC_HLS_STREAM_URL ??
    "https://livestream.flaredynamics.com/live/drone/index.m3u8";

  return (
    <StreamConsole
      rtmpBaseUrl={rtmpBaseUrl}
      hlsStreamUrl={hlsStreamUrl}
      streamName="drone"
    />
  );
}
