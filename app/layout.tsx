import type { Metadata } from "next";
import { Ubuntu, Oswald } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-ubuntu",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VendorShield — Vendor Compliance Portal",
  description: "Onboard vendors, track compliance documents, and manage approvals in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${ubuntu.variable} ${oswald.variable}`}>
      <body
        className="antialiased"
        style={{ fontFamily: "var(--font-ubuntu, ui-sans-serif, system-ui, sans-serif)" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
