import { StreamConsole } from "@/components/stream-console";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <StreamConsole
      rtmpBaseUrl="rtmp://3.1.11.194:1935/live"
      hlsStreamUrl="/api/hls/live/drone/index.m3u8"
      streamName="drone"
    />
  );
}
