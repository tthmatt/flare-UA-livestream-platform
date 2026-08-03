import { StreamConsole } from "@/components/stream-console";

export const dynamic = "force-dynamic";

export default function Home() {
  const rtmpBaseUrl =
    process.env.NEXT_PUBLIC_RTMP_BASE_URL ??
    "rtmp://3.1.11.194:1935/live";
  const hlsStreamUrl =
    process.env.NEXT_PUBLIC_HLS_STREAM_URL ??
    "http://3.1.11.194:8888/live/drone/index.m3u8";

  export default function Home() {
  return <StreamConsole />;
}
