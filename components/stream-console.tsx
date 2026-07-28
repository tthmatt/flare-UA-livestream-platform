"use client";

import Hls from "hls.js";
import Image from "next/image";
import { BatteryCharging, Maximize, Radio, RefreshCw, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import flareLogo from "@/public/flare-dynamics-logo.png";

type Health = {
  configured: boolean;
  online: boolean;
  checkedAt: string;
  message: string;
  statusCode?: number;
};

type Props = {
  rtmpBaseUrl: string;
  hlsStreamUrl: string;
  streamName: string;
};

export function StreamConsole({ hlsStreamUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [health, setHealth] = useState<Health>({
    configured: true,
    online: false,
    checkedAt: "",
    message: "Checking livestream status…",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshHealth = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/stream-health", { cache: "no-store" });
      const data = (await response.json()) as Health;
      setHealth(data);
    } catch {
      setHealth({
        configured: true,
        online: false,
        checkedAt: new Date().toISOString(),
        message: "The livestream is temporarily unavailable.",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    const timer = window.setInterval(() => void refreshHealth(), 8_000);
    return () => window.clearInterval(timer);
  }, [refreshHealth]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const cleanUp = () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    cleanUp();
    if (!health.online) return cleanUp;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsStreamUrl;
      void video.play().catch(() => undefined);
      return cleanUp;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 5,
        backBufferLength: 15,
      });
      hlsRef.current = hls;
      hls.loadSource(hlsStreamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) void refreshHealth();
      });
      return cleanUp;
    }

    return cleanUp;
  }, [health.online, hlsStreamUrl, refreshHealth]);

  const lastChecked = health.checkedAt
    ? new Intl.DateTimeFormat("en-SG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(health.checkedAt))
    : "—";

  function enterFullscreen() {
    if (videoRef.current?.requestFullscreen) {
      void videoRef.current.requestFullscreen();
    }
  }

  return (
    <main className="viewer-page">
      <header className="viewer-header">
        <a href="https://www.flaredynamics.com/" aria-label="Flare Dynamics homepage">
          <Image className="viewer-logo" src={flareLogo} alt="Flare Dynamics" priority />
        </a>
        <div className={`viewer-status ${health.online ? "is-live" : ""}`}>
          <span className="status-dot" />
          {health.online ? "LIVE NOW" : "STANDBY"}
        </div>
      </header>

      <section className="viewer-content">
        <div className="viewer-heading">
          <span className="viewer-kicker">FLARE DYNAMICS LIVE OPERATIONS</span>
          <h1>{health.online ? "Live aerial view" : "Livestream temporarily paused"}</h1>
          <p>
            {health.online
              ? "You are watching a live feed from the Flare Dynamics flight team."
              : "Our flight crew is preparing the aircraft for the next segment."}
          </p>
        </div>

        <article className="viewer-card">
          <div className="viewer-toolbar">
            <div>
              {health.online ? <Radio size={17} /> : <WifiOff size={17} />}
              <span>{health.online ? "AIRCRAFT FEED ACTIVE" : "AIRCRAFT FEED PAUSED"}</span>
            </div>
            <button type="button" onClick={enterFullscreen} aria-label="Enter fullscreen">
              <Maximize size={17} />
            </button>
          </div>

          <div className="viewer-stage">
            <video
              ref={videoRef}
              controls={health.online}
              muted
              playsInline
              aria-label="Flare Dynamics live drone stream"
            />

            {!health.online && (
              <div className="standby-screen" role="status" aria-live="polite">
                <div className="battery-animation" aria-hidden="true">
                  <BatteryCharging size={42} />
                  <span />
                </div>
                <span className="standby-label">PLEASE STAND BY</span>
                <h2>Drone battery change in progress</h2>
                <p>Live coverage will resume automatically in a few moments.</p>
                <button type="button" onClick={() => void refreshHealth()} disabled={isRefreshing}>
                  <RefreshCw className={isRefreshing ? "spin" : ""} size={16} />
                  Check stream now
                </button>
              </div>
            )}

            <div className="viewer-watermark">
              <Image src={flareLogo} alt="" aria-hidden="true" />
            </div>
          </div>

          <footer className="viewer-footer">
            <span>
              <strong>{health.online ? "LIVE" : "STANDBY"}</strong>
              Stream status
            </span>
            <span>
              <strong>{lastChecked}</strong>
              Last checked
            </span>
            <span>
              <strong>AUTO</strong>
              Refresh every 8 seconds
            </span>
          </footer>
        </article>

        <p className="viewer-note">
          The page will switch to the live feed automatically when broadcasting resumes.
        </p>
      </section>
    </main>
  );
}
