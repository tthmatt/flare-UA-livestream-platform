"use client";

import Hls from "hls.js";
import Image from "next/image";
import {
  Activity,
  Antenna,
  Check,
  ChevronRight,
  CircleAlert,
  Clipboard,
  Clock3,
  ExternalLink,
  Eye,
  Gauge,
  LockKeyhole,
  Maximize,
  Radio,
  RefreshCw,
  Satellite,
  ShieldCheck,
  Signal,
  Smartphone,
  Video,
  WifiOff,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export function StreamConsole({
  rtmpBaseUrl,
  hlsStreamUrl,
  streamName,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [health, setHealth] = useState<Health>({
    configured: Boolean(hlsStreamUrl),
    online: false,
    checkedAt: "",
    message: hlsStreamUrl
      ? "Checking the stream gateway…"
      : "Playback endpoint is not configured.",
  });
  const [playerMessage, setPlayerMessage] = useState(
    hlsStreamUrl ? "Waiting for aircraft feed" : "Gateway setup required",
  );
  const [copied, setCopied] = useState("");
  const [showSetup, setShowSetup] = useState(false);

  const publishPath = useMemo(
    () => `${rtmpBaseUrl.replace(/\/$/, "")}/${streamName}`,
    [rtmpBaseUrl, streamName],
  );

  const refreshHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/stream-health", {
        cache: "no-store",
      });
      const data = (await response.json()) as Health;
      setHealth(data);
    } catch {
      setHealth((current) => ({
        ...current,
        online: false,
        checkedAt: new Date().toISOString(),
        message: "Console could not reach the health endpoint.",
      }));
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsStreamUrl) return;

    const cleanUp = () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };

    cleanUp();

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsStreamUrl;
      const onReady = () => setPlayerMessage("");
      const onError = () => setPlayerMessage("Waiting for aircraft feed");
      video.addEventListener("loadedmetadata", onReady);
      video.addEventListener("error", onError);
      return () => {
        video.removeEventListener("loadedmetadata", onReady);
        video.removeEventListener("error", onError);
        cleanUp();
      };
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
        setPlayerMessage("");
        void video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        setPlayerMessage("Waiting for aircraft feed");
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          window.setTimeout(() => hls.startLoad(), 2_000);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        }
      });
      return cleanUp;
    }

    const unsupportedMessage = window.setTimeout(
      () => setPlayerMessage("This browser cannot play HLS video."),
      0,
    );
    return () => {
      window.clearTimeout(unsupportedMessage);
      cleanUp();
    };
  }, [hlsStreamUrl]);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 2_000);
    } catch {
      setCopied("");
    }
  }

  function enterFullscreen() {
    const video = videoRef.current;
    if (video?.requestFullscreen) void video.requestFullscreen();
  }

  const lastChecked = health.checkedAt
    ? new Intl.DateTimeFormat("en-SG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(health.checkedAt))
    : "—";

  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="brand" href="https://www.flaredynamics.com/">
          <Image
            className="brand-logo"
            src={flareLogo}
            alt="Flare Dynamics"
            priority
          />
          <span className="brand-product">UA LIVESTREAM</span>
        </a>
        <nav aria-label="Primary navigation">
          <a className="active" href="#live">
            Live operations
          </a>
          <a href="#connection">Connection</a>
          <a href="#deployment">Architecture</a>
        </nav>
        <div className="header-actions">
          <span className={`system-status ${health.online ? "online" : ""}`}>
            <span />
            {health.online ? "AIRCRAFT LIVE" : "STANDBY"}
          </span>
          <button className="setup-button" onClick={() => setShowSetup(true)}>
            DJI setup <ChevronRight size={14} />
          </button>
        </div>
      </header>

      <div className="workspace">
        <section className="hero-row">
          <div>
            <span className="eyebrow">MISSION VIDEO / LIVE COMMAND FEED</span>
            <h1>Eyes on the operation.</h1>
            <p>
              Low-latency browser viewing for DJI aircraft streams, built for
              Flare Dynamics field operations and remote stakeholders.
            </p>
          </div>
          <div className={`mission-state ${health.online ? "live" : ""}`}>
            {health.online ? <Radio size={18} /> : <WifiOff size={18} />}
            <span>
              <small>CURRENT STATE</small>
              <strong>{health.online ? "LIVE FEED ACTIVE" : "AWAITING FEED"}</strong>
            </span>
          </div>
        </section>

        <section className="console-grid" id="live">
          <div className="video-column">
            <article className="video-panel">
              <div className="video-toolbar">
                <div className="stream-identity">
                  <span className={health.online ? "pulse" : "idle-dot"} />
                  <div>
                    <strong>UA-01 · PRIMARY CAMERA</strong>
                    <small>PATH /live/{streamName}</small>
                  </div>
                </div>
                <div className="video-actions">
                  <span>{health.online ? "LOW-LATENCY HLS" : "NO SIGNAL"}</span>
                  <button onClick={enterFullscreen} aria-label="Enter fullscreen">
                    <Maximize size={16} />
                  </button>
                </div>
              </div>
              <div className="video-stage">
                <video
                  ref={videoRef}
                  controls
                  muted
                  playsInline
                  aria-label="Live unmanned aircraft video"
                />
                {playerMessage && (
                  <div className="video-placeholder">
                    <div className="radar">
                      <span />
                      <span />
                      <Satellite size={34} />
                    </div>
                    <strong>{playerMessage}</strong>
                    <p>
                      Start a custom RTMP broadcast from DJI GO 4 or DJI Fly.
                    </p>
                    <button onClick={() => setShowSetup(true)}>
                      Open connection guide
                    </button>
                  </div>
                )}
                <div className="video-watermark">
                  <Image
                    className="watermark-logo"
                    src={flareLogo}
                    alt=""
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="telemetry-strip">
                <span>
                  <Signal size={14} />
                  <small>GATEWAY</small>
                  <strong>{health.online ? "CONNECTED" : "IDLE"}</strong>
                </span>
                <span>
                  <Activity size={14} />
                  <small>PROTOCOL</small>
                  <strong>RTMP → HLS</strong>
                </span>
                <span>
                  <Clock3 size={14} />
                  <small>LAST CHECK</small>
                  <strong>{lastChecked}</strong>
                </span>
                <span>
                  <Eye size={14} />
                  <small>VIEWER</small>
                  <strong>SECURE HTTPS</strong>
                </span>
              </div>
            </article>

            <article className="status-card">
              <div className={`status-icon ${health.online ? "online" : ""}`}>
                {health.online ? <Check size={20} /> : <CircleAlert size={20} />}
              </div>
              <div>
                <small>STREAM HEALTH</small>
                <strong>{health.message}</strong>
                <p>
                  Health is checked from the Vercel control plane every eight
                  seconds.
                </p>
              </div>
              <button onClick={() => void refreshHealth()}>
                <RefreshCw size={15} /> Refresh
              </button>
            </article>
          </div>

          <aside className="side-column">
            <article className="side-card" id="connection">
              <div className="card-heading">
                <span>
                  <Antenna size={17} />
                  DJI connection
                </span>
                <small>OPERATOR</small>
              </div>
              <p>
                Enter the authenticated publish URL in your DJI flight app.
                Publisher credentials are intentionally never exposed here.
              </p>
              <label className="connection-field">
                <span>RTMP server</span>
                <div>
                  <code>{rtmpBaseUrl}</code>
                  <button
                    onClick={() => void copy(rtmpBaseUrl, "server")}
                    aria-label="Copy RTMP server"
                  >
                    {copied === "server" ? (
                      <Check size={14} />
                    ) : (
                      <Clipboard size={14} />
                    )}
                  </button>
                </div>
              </label>
              <label className="connection-field">
                <span>Stream path</span>
                <div>
                  <code>{streamName}</code>
                  <button
                    onClick={() => void copy(streamName, "path")}
                    aria-label="Copy stream path"
                  >
                    {copied === "path" ? (
                      <Check size={14} />
                    ) : (
                      <Clipboard size={14} />
                    )}
                  </button>
                </div>
              </label>
              <div className="credential-note">
                <LockKeyhole size={16} />
                <span>
                  Add the publisher username and password supplied by your
                  administrator to the URL before flight.
                </span>
              </div>
              <button className="primary-action" onClick={() => setShowSetup(true)}>
                <Smartphone size={16} /> View DJI setup steps
              </button>
            </article>

            <article className="side-card" id="deployment">
              <div className="card-heading">
                <span>
                  <ShieldCheck size={17} />
                  Deployment
                </span>
                <small>HYBRID</small>
              </div>
              <div className="architecture">
                <div>
                  <Smartphone size={16} />
                  <span>
                    <strong>DJI aircraft</strong>
                    <small>RTMP publisher</small>
                  </span>
                </div>
                <ChevronRight size={14} />
                <div>
                  <Gauge size={16} />
                  <span>
                    <strong>Media gateway</strong>
                    <small>RTMP / HLS</small>
                  </span>
                </div>
                <ChevronRight size={14} />
                <div>
                  <Zap size={16} />
                  <span>
                    <strong>Vercel console</strong>
                    <small>HTTPS viewer</small>
                  </span>
                </div>
              </div>
              <p className="architecture-note">
                Vercel hosts this web console. MediaMTX runs on a persistent
                gateway because RTMP requires a permanent TCP listener on port
                1935.
              </p>
            </article>

            <article className="side-card compact-card">
              <div className="card-heading">
                <span>
                  <Video size={17} />
                  Viewer link
                </span>
              </div>
              <p>
                Intended production address
              </p>
              <a
                className="viewer-link"
                href="https://livestream.flaredynamics.com"
                target="_blank"
                rel="noreferrer"
              >
                livestream.flaredynamics.com
                <ExternalLink size={14} />
              </a>
            </article>
          </aside>
        </section>

        <footer>
          <span>FLARE DYNAMICS · UA LIVESTREAM</span>
          <p>
            Operational video is decision-support information. The PIC remains
            responsible for safe conduct of the flight.
          </p>
          <a href="https://www.flaredynamics.com/">flaredynamics.com</a>
        </footer>
      </div>

      {showSetup && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setShowSetup(false)}
        >
          <section
            className="setup-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">FIELD CONNECTION GUIDE</span>
                <h2 id="setup-title">Connect DJI to Flare Livestream</h2>
              </div>
              <button onClick={() => setShowSetup(false)}>Close</button>
            </div>
            <ol className="setup-steps">
              <li>
                <span>01</span>
                <div>
                  <strong>Open the live-stream settings</strong>
                  <p>
                    In DJI GO 4, open General Settings → Choose Livestream
                    Platform → Custom RTMP. In DJI Fly, open Transmission →
                    Livestream Platforms → RTMP.
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Enter the authenticated publish URL</strong>
                  <p>
                    Use the RTMP server and stream path shown in this console.
                    Insert the operator credentials provided through the secure
                    Flare operations channel.
                  </p>
                  <code>{publishPath}</code>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Start at 1080p where available</strong>
                  <p>
                    Use a stable uplink and confirm the console changes to LIVE
                    FEED ACTIVE before the aircraft leaves the immediate area.
                  </p>
                </div>
              </li>
              <li>
                <span>04</span>
                <div>
                  <strong>Verify the remote viewer</strong>
                  <p>
                    Confirm motion, orientation and acceptable delay with the
                    remote observer. Stop the broadcast after the operation.
                  </p>
                </div>
              </li>
            </ol>
            <div className="modal-warning">
              <ShieldCheck size={18} />
              Never send the publisher password through a public chat or expose
              it in a screenshot.
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
