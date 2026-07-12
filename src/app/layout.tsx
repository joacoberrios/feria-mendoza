import type { Metadata } from "next";
import { Fredoka, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Topbar } from "@/components/layout/Topbar";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Feria Mendoza",
  description: "Marketplace local de Mendoza",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fredoka.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Topbar />
        {children}
      </body>
    </html>
  );
}
