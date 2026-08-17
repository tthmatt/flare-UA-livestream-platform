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

type PlaybackState = "idle" | "connecting" | "playing" | "reconnecting";

const initialRetryDelayMs = 1_000;
const maximumRetryDelayMs = 8_000;
const playbackStallTimeoutMs = 12_000;

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
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [playerRevision, setPlayerRevision] = useState(0);
  const restartTimerRef = useRef<number | null>(null);
  const stallTimerRef = useRef<number | null>(null);
  const retryDelayRef = useRef(initialRetryDelayMs);

  const refreshHealth = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/stream-health", { cache: "no-store" });
      const data = (await response.json()) as Health;
      setPlaybackState((current) =>
        data.online ? (current === "playing" ? "playing" : "connecting") : "idle",
      );
      setHealth(data);
    } catch {
      setPlaybackState("idle");
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
    const initialCheck = window.setTimeout(() => void refreshHealth(), 0);
    const timer = window.setInterval(() => void refreshHealth(), 8_000);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(timer);
    };
  }, [refreshHealth]);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current === null) return;
    window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
  }, []);

  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current === null) return;
    window.clearTimeout(stallTimerRef.current);
    stallTimerRef.current = null;
  }, []);

  const restartPlayerNow = useCallback(() => {
    clearRestartTimer();
    retryDelayRef.current = initialRetryDelayMs;
    setPlaybackState("reconnecting");
    setPlayerRevision((revision) => revision + 1);
    void refreshHealth();
  }, [clearRestartTimer, refreshHealth]);

  const schedulePlayerRestart = useCallback(() => {
    if (!health.online || restartTimerRef.current !== null) return;

    setPlaybackState("reconnecting");
    const delay = retryDelayRef.current;
    retryDelayRef.current = Math.min(delay * 2, maximumRetryDelayMs);
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      setPlayerRevision((revision) => revision + 1);
    }, delay);
    void refreshHealth();
  }, [health.online, refreshHealth]);

  useEffect(() => {
    if (health.online) return;
    clearRestartTimer();
    retryDelayRef.current = initialRetryDelayMs;
  }, [clearRestartTimer, health.online]);

  useEffect(() => clearRestartTimer, [clearRestartTimer]);

  useEffect(() => clearStallTimer, [clearStallTimer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const cleanUp = () => {
      clearStallTimer();
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    cleanUp();
    if (!health.online) return cleanUp;

    const armStallTimer = () => {
      clearStallTimer();
      if (video.paused || video.ended || document.visibilityState !== "visible") return;

      stallTimerRef.current = window.setTimeout(() => {
        stallTimerRef.current = null;
        if (video.paused || video.ended || document.visibilityState !== "visible") return;
        schedulePlayerRestart();
      }, playbackStallTimeoutMs);
    };
    const handlePlaying = () => {
      clearRestartTimer();
      retryDelayRef.current = initialRetryDelayMs;
      setPlaybackState("playing");
      armStallTimer();
    };
    const handleVideoError = () => schedulePlayerRestart();
    const handlePlaybackProgress = () => armStallTimer();
    const handlePlaybackPause = () => clearStallTimer();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        armStallTimer();
      } else {
        clearStallTimer();
      }
    };

    video.addEventListener("playing", handlePlaying);
    video.addEventListener("error", handleVideoError);
    video.addEventListener("timeupdate", handlePlaybackProgress);
    video.addEventListener("waiting", handlePlaybackProgress);
    video.addEventListener("stalled", handlePlaybackProgress);
    video.addEventListener("pause", handlePlaybackPause);
    video.addEventListener("ended", handlePlaybackPause);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const cleanUpPlayer = () => {
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("error", handleVideoError);
      video.removeEventListener("timeupdate", handlePlaybackProgress);
      video.removeEventListener("waiting", handlePlaybackProgress);
      video.removeEventListener("stalled", handlePlaybackProgress);
      video.removeEventListener("pause", handlePlaybackPause);
      video.removeEventListener("ended", handlePlaybackPause);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cleanUp();
    };

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 5,
        backBufferLength: 15,
      });
      hlsRef.current = hls;
      let attemptedMediaRecovery = false;
      hls.loadSource(hlsStreamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !attemptedMediaRecovery) {
          attemptedMediaRecovery = true;
          hls.recoverMediaError();
          return;
        }

        hls.destroy();
        if (hlsRef.current === hls) hlsRef.current = null;
        schedulePlayerRestart();
      });
      return cleanUpPlayer;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsStreamUrl;
      void video.play().catch(() => undefined);
      return cleanUpPlayer;
    }

    schedulePlayerRestart();
    return cleanUpPlayer;
  }, [
    clearRestartTimer,
    clearStallTimer,
    health.online,
    hlsStreamUrl,
    playerRevision,
    schedulePlayerRestart,
  ]);

  const isPlaying = health.online && playbackState === "playing";
  const isReconnecting = health.online && !isPlaying;

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
        <div
          className={`viewer-status ${
            isPlaying ? "is-live" : isReconnecting ? "is-reconnecting" : ""
          }`}
        >
          <span className="status-dot" />
          {isPlaying ? "LIVE NOW" : isReconnecting ? "RECONNECTING" : "STANDBY"}
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
              {isPlaying ? (
                <Radio size={17} />
              ) : isReconnecting ? (
                <RefreshCw className="spin" size={17} />
              ) : (
                <WifiOff size={17} />
              )}
              <span>
                {isPlaying
                  ? "AIRCRAFT FEED ACTIVE"
                  : isReconnecting
                    ? "RECONNECTING TO AIRCRAFT"
                    : "AIRCRAFT FEED PAUSED"}
              </span>
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

            {isReconnecting && (
              <div className="standby-screen" role="status" aria-live="polite">
                <div className="battery-animation" aria-hidden="true">
                  <RefreshCw size={38} />
                  <span />
                </div>
                <span className="standby-label">RESTORING LIVE VIDEO</span>
                <h2>Reconnecting to aircraft feed</h2>
                <p>The player will jump back to the latest live frame automatically.</p>
                <button type="button" onClick={restartPlayerNow}>
                  <RefreshCw size={16} />
                  Retry now
                </button>
              </div>
            )}

            <div className="viewer-watermark">
              <Image src={flareLogo} alt="" aria-hidden="true" />
            </div>
          </div>

          <footer className="viewer-footer">
            <span>
              <strong>{isPlaying ? "LIVE" : isReconnecting ? "CONNECTING" : "STANDBY"}</strong>
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
