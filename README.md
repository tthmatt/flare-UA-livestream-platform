# Flare Dynamics UA Livestream Platform

A Flare Dynamics operations console for live DJI aircraft video. DJI GO 4 or
DJI Fly publishes RTMP to a persistent MediaMTX gateway; the Vercel-hosted
console plays the resulting low-latency HLS feed over HTTPS.

## Architecture

```mermaid
flowchart LR
  A["DJI GO 4 / DJI Fly"] -->|"RTMP :1935"| B["MediaMTX gateway"]
  B -->|"Low-latency HLS"| C["Vercel console"]
  C -->|"HTTPS"| D["Remote viewers"]
```

## Local web setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Vercel configuration

Set these variables in Vercel Project Settings → Environment Variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_RTMP_BASE_URL` | Public RTMP server/base path, without credentials |
| `NEXT_PUBLIC_HLS_STREAM_URL` | Browser HLS playlist URL |
| `STREAM_HEALTH_URL` | Server-side health target |
| `OPERATOR_PASSWORD` | Required password for `/operator`; server-only |
| `OPERATOR_SESSION_SECRET` | Recommended unique random string for signing the operator session cookie |

Verified gateway values:

```text
NEXT_PUBLIC_RTMP_BASE_URL=rtmp://3.1.11.194:1935/live
NEXT_PUBLIC_HLS_STREAM_URL=/api/hls/live/drone/index.m3u8
STREAM_HEALTH_URL=http://3.1.11.194:8888/live/drone/index.m3u8
```

The `/operator` route is protected by a server-side, HTTP-only session cookie.
Set `OPERATOR_PASSWORD` in Vercel; never use a `NEXT_PUBLIC_*` variable for
a password.

## MediaMTX gateway

MediaMTX is pinned to `v1.19.3`.

```bash
cd infra/mediamtx
cp .env.example .env
docker compose up -d
```

Open these firewall ports on the gateway:

| Port | Protocol | Purpose |
| --- | --- | --- |
| `1935` | TCP | DJI RTMP ingest |
| `8888` | TCP | HLS origin consumed by the Vercel proxy |
| `8889` | TCP | WebRTC handshake, if used |
| `8189` | UDP | WebRTC media, if used |

The public viewer is hosted at `livestream.flaredynamics.com` on Vercel. DJI
publishes to:

```text
rtmp://3.1.11.194:1935/live/drone
```

## Validation

```bash
npm run typecheck
npm run lint
npm run build
docker compose -f infra/mediamtx/docker-compose.yml config
```

## Operational note

Live video is decision-support information. The pilot-in-command remains
responsible for safe conduct of the flight and must not rely on remote video as
the sole means of maintaining required awareness.
