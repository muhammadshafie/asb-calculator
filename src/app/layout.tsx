import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASNB Dividend Calculator",
  description: "Calculate your ASNB dividend returns for lump sum, monthly, and periodic investment strategies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
