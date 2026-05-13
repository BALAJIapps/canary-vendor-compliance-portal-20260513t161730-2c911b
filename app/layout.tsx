import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Ubuntu:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Ubuntu', ui-sans-serif, system-ui, sans-serif", margin: 0 }}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
