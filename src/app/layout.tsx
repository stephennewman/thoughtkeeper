import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: '%s | VibeKeep',
    default: 'VibeKeep | Augmented intelligence for busy people',
  },
  description: "Your personal space for thoughts and reflections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${figtree.className} bg-gray-50`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
} 