import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PropIQ",
  description: "AI-Native Real Estate CRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
