import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LanguageProvider from "@/contexts/LanguageContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aloai - Your Personal AI Assistant",
  description: "Aloai provides intelligent AI agents for your personal assistance. Experience advanced messaging, AI-powered conversations, and smart features designed to enhance your daily communication and productivity.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon.png',
  },
  openGraph: {
    title: "Aloai - Your Personal AI Assistant",
    description: "Aloai provides intelligent AI agents for your personal assistance. Experience advanced messaging, AI-powered conversations, and smart features designed to enhance your daily communication and productivity.",
    type: "website",
    images: [
      {
        url: '/logo-preview.png',
        width: 1200,
        height: 630,
        alt: 'Aloai - Your Personal AI Assistant',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aloai - Your Personal AI Assistant",
    description: "Aloai provides intelligent AI agents for your personal assistance. Experience advanced messaging, AI-powered conversations, and smart features designed to enhance your daily communication and productivity.",
    images: ['/logo-preview.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <main className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100">
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  );
}
