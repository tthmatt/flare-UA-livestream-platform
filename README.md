# Flare Dynamics UA Livestream Platform

A Flare Dynamics operations console for live DJI aircraft video. DJI GO 4 or
DJI Fly publishes RTMP to a persistent MediaMTX gateway; the Vercel-hosted
console plays the resulting low-latency HLS feed over HTTPS.

## Architecture

```mermaid
flowchart LR
  A["DJI GO 4 / DJI Fly"] -->|RTMP :1935| B["MediaMTX gateway"]
  B -->|Low-latency HLS| C["Vercel console"]
  C -->|HTTPS| D["Remote viewers"]
```

The web console belongs on Vercel. The RTMP gateway does not: RTMP needs a
permanent TCP listener on port 1935, while Vercel Services and Functions are
HTTP request-based and have bounded execution durations. The `infra/mediamtx`
folder contains the persistent gateway configuration.

## Local web setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Vercel configuration

Create a Vercel project from this repository and set:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_RTMP_BASE_URL` | Public RTMP server/base path, without credentials |
| `NEXT_PUBLIC_HLS_STREAM_URL` | Browser HLS playlist URL |
| `STREAM_HEALTH_URL` | Optional server-side health target |

Recommended production values:

```text
NEXT_PUBLIC_RTMP_BASE_URL=rtmp://ingest.flaredynamics.com:1935/live
NEXT_PUBLIC_HLS_STREAM_URL=https://streams.flaredynamics.com/live/drone/index.m3u8
STREAM_HEALTH_URL=https://streams.flaredynamics.com/live/drone/index.m3u8
```

Do not put publisher credentials in any `NEXT_PUBLIC_*` variable. Every
`NEXT_PUBLIC_*` value is shipped to browsers.

## MediaMTX gateway

MediaMTX is pinned to `v1.19.3`.

```bash
cd infra/mediamtx
cp .env.example .env
# Replace the example password with a long random value.
docker compose up -d
```

Open these firewall ports on the gateway:

| Port | Protocol | Purpose |
| --- | --- | --- |
| `1935` | TCP | DJI RTMP ingest |
| `8888` | TCP | HLS origin; normally placed behind HTTPS |
| `8889` | TCP | WebRTC handshake, if used |
| `8189` | UDP | WebRTC media, if used |

Use a reverse proxy such as Caddy or Nginx in front of port `8888` so
`streams.flaredynamics.com` receives a valid TLS certificate. Vercel
automatically provides SSL for `livestream.flaredynamics.com` after the domain
is attached to the Vercel project.

The authenticated DJI publish URL uses this form:

```text
rtmp://USERNAME:PASSWORD@ingest.flaredynamics.com:1935/live/drone
```

Keep this full URL out of the public repository, screenshots and public chat.

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

