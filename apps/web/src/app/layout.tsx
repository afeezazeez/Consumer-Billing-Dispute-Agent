import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Billing Case Agent — Make sense of the charge",
  description: "Organize billing records, understand what they show, and prepare a response for your review.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
