import type { Metadata } from "next";
import { OperatorDashboard } from "@/components/operator-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operator Backend | Flare Dynamics",
  description: "Operator status and DJI livestream configuration for Flare Dynamics.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OperatorPage() {
  const gatewayIp = "3.1.11.194";
  const rtmpServer =
    process.env.NEXT_PUBLIC_RTMP_BASE_URL ??
    `rtmp://${gatewayIp}:1935/live`;
  const streamPath = "drone";
  const publishAddress = `${rtmpServer.replace(/\\/$/, "")}/${streamPath}`;
  const hlsAddress =
    process.env.NEXT_PUBLIC_HLS_STREAM_URL ??
    "/api/hls/live/drone/index.m3u8";

  return (
    <OperatorDashboard
      gatewayIp={gatewayIp}
      rtmpServer={rtmpServer}
      streamPath={streamPath}
      publishAddress={publishAddress}
      hlsAddress={hlsAddress}
    />
  );
}
