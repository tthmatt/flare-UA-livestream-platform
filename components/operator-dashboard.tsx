"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  Check,
  Clipboard,
  ExternalLink,
  Radio,
  RefreshCw,
  Server,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import flareLogo from "@/public/flare-dynamics-logo.png";
import styles from "@/app/operator/operator.module.css";

type Health = {
  configured: boolean;
  online: boolean;
  checkedAt: string;
  message: string;
  statusCode?: number;
};

type Props = {
  rtmpServer: string;
  streamPath: string;
  publishAddress: string;
  hlsAddress: string;
};

export function OperatorDashboard({
  rtmpServer,
  streamPath,
  publishAddress,
  hlsAddress,
}: Props) {
  const [health, setHealth] = useState<Health>({
    configured: true,
    online: false,
    checkedAt: "",
    message: "Checking AWS stream gateway…",
  });
  const [copied, setCopied] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/stream-health", { cache: "no-store" });
      const result = (await response.json()) as Health;
      setHealth(result);
    } catch {
      setHealth({
        configured: true,
        online: false,
        checkedAt: new Date().toISOString(),
        message: "The Vercel backend could not reach the AWS gateway.",
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function copy(value: string, name: string) {
    await navigator.clipboard.writeText(value);
    setCopied(name);
    window.setTimeout(() => setCopied(""), 1_800);
  }

  const checkedAt = health.checkedAt
    ? new Intl.DateTimeFormat("en-SG", {
        dateStyle: "medium",
        timeStyle: "medium",
        hour12: false,
      }).format(new Date(health.checkedAt))
    : "Waiting for first check";

  const fields = [
    { name: "server", label: "RTMP server", value: rtmpServer },
    { name: "path", label: "Stream name / key", value: streamPath },
    {
      name: "publish",
      label: "Complete address for DJI custom RTMP",
      value: publishAddress,
    },
    { name: "hls", label: "Viewer playback address", value: hlsAddress },
  ];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Open public viewer">
          <Image src={flareLogo} alt="Flare Dynamics" priority />
        </Link>
        <div>
          <span>UA LIVESTREAM</span>
          <strong>OPERATOR BACKEND</strong>
        </div>
        <Link className={styles.viewerLink} href="/">
          Public viewer <ExternalLink size={15} />
        </Link>
      </header>

      <section className={styles.content}>
        <div className={styles.intro}>
          <div>
            <span>FLARE DYNAMICS FLIGHT OPERATIONS</span>
            <h1>Livestream control and connection status</h1>
            <p>
              Use this page to confirm whether the aircraft is publishing and to
              copy the exact values required in DJI Fly or DJI GO 4.
            </p>
          </div>
          <div className={`${styles.statusBadge} ${health.online ? styles.live : ""}`}>
            {health.online ? <Radio size={20} /> : <WifiOff size={20} />}
            <span>
              <small>CURRENT STATUS</small>
              <strong>{health.online ? "DRONE STREAMING" : "NO ACTIVE FEED"}</strong>
            </span>
          </div>
        </div>

        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>
              <Server size={19} />
              <div>
                <strong>AWS gateway status</strong>
                <span>livestream.flaredynamics.com</span>
              </div>
            </div>

            <div className={styles.healthPanel}>
              <span className={`${styles.healthIcon} ${health.online ? styles.live : ""}`}>
                {health.online ? <Check size={24} /> : <Activity size={24} />}
              </span>
              <div>
                <small>{health.online ? "ONLINE" : "STANDBY"}</small>
                <strong>{health.message}</strong>
                <p>
                  HTTP status: {health.statusCode ?? "No response"}<br />
                  Last checked: {checkedAt}
                </p>
              </div>
            </div>

            <button className={styles.refreshButton} onClick={() => void refresh()} disabled={refreshing}>
              <RefreshCw className={refreshing ? styles.spin : ""} size={16} />
              Check status now
            </button>

            <div className={styles.serverFacts}>
              <span><small>RTMP ingest</small><strong>Port 1935</strong></span>
              <span><small>HLS playback</small><strong>HTTPS / 443</strong></span>
              <span><small>Stream path</small><strong>live/drone</strong></span>
              <span><small>Health polling</small><strong>Every 8 sec</strong></span>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>
              <Smartphone size={19} />
              <div>
                <strong>What to enter in the DJI app</strong>
                <span>Custom RTMP livestream</span>
              </div>
            </div>

            <ol className={styles.steps}>
              <li>Open DJI Fly or DJI GO 4 and enter the livestream settings.</li>
              <li>Select <strong>Custom RTMP</strong> or <strong>RTMP</strong>.</li>
              <li>Paste the complete address shown below.</li>
              <li>Start the broadcast and wait for the status to show DRONE STREAMING.</li>
            </ol>

            <div className={styles.fields}>
              {fields.map((field) => (
                <label key={field.name}>
                  <span>{field.label}</span>
                  <div>
                    <code>{field.value}</code>
                    <button
                      type="button"
                      onClick={() => void copy(field.value, field.name)}
                      aria-label={`Copy ${field.label}`}
                    >
                      {copied === field.name ? <Check size={16} /> : <Clipboard size={16} />}
                    </button>
                  </div>
                </label>
              ))}
            </div>

            <div className={styles.notice}>
              Enter this as one complete DJI address:
              <code>{publishAddress}</code>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
