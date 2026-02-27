import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NewsForge — AI News Intelligence",
  description:
    "Autonomous AI pipeline that converts news broadcasts into structured, verified intelligence feeds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
