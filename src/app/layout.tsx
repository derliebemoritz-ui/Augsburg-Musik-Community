import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Augsburg Musik Community",
  description: "Augsburg Musik Community",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-page text-ink font-sans">{children}</body>
    </html>
  );
}
