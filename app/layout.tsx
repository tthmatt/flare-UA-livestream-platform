import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./viewer.css";

export const metadata: Metadata = {
  title: {
    default: "Flare Dynamics | Live Drone View",
    template: "%s | Flare Dynamics",
  },
  description:
    "Watch the Flare Dynamics live aerial operations feed. The viewer automatically resumes when the aircraft broadcast returns.",
  applicationName: "Flare Dynamics Livestream",
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
