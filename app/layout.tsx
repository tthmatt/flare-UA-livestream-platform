import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Flare Dynamics | UA Livestream",
    template: "%s | Flare Dynamics",
  },
  description:
    "Secure live drone video operations console for Flare Dynamics unmanned aircraft missions.",
  applicationName: "Flare UA Livestream",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07110f",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

