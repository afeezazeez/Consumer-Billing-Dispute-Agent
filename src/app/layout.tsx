import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consumer Billing Dispute Agent",
  description: "An evidence-led agent for investigating billing disputes and preparing a reviewable response.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
