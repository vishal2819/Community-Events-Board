import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../index.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Civic - Community Events",
  description: "A neighbourhood cultural board for discovering local experiences across India.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
