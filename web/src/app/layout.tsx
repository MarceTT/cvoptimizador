import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CVOptimizador - Optimiza tu CV para ATS",
  description:
    "Optimiza tu currículum para sistemas ATS con inteligencia artificial. Mejora tu puntaje y destaca en las postulaciones.",
  keywords: ["CV", "currículum", "ATS", "optimización", "trabajo", "Chile"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
