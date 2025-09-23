import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Toaster from "@/components/Toaster";
import { HealthGate } from "@/components/health-gate";
import CommandPalette from "@/components/CommandPalette";
import RouteProgress from "@/components/RouteProgress";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Resolvet",
  description: "Resolvet Support Desk",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
        <RouteProgress/>

          <HealthGate>
            {children}
          </HealthGate>
        </Suspense>
        <Toaster />
        {/* <CommandPalette /> */}
      </body>
    </html>
  );
}
