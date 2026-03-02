import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next8n Chat",
  description: "Voice and Text Chat Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
