import type { Metadata } from "next";
import "./globals.css";
import "../styles/styles/kimi-theme.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TimezoneProvider } from "@/contexts/TimezoneContext";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Joti - Threat Intelligence Platform",
  description: "Advanced threat intelligence and security monitoring platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <TimezoneProvider>
            {children}
          </TimezoneProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
