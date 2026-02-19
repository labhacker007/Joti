import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TimezoneProvider } from "@/contexts/TimezoneContext";
import { AuthInitializer } from "@/components/AuthInitializer";
import MainLayout from "@/components/MainLayout";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "J.O.T.I - Threat Intelligence Platform",
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
        <AuthInitializer />
        <ThemeProvider>
          <TimezoneProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </TimezoneProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
