import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "AFC – Amicale Football",
  description: "Gestion des cotisations et de la vie du club",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AFC",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0ea5e9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/images/logo-afc.png" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
          <Toaster richColors position="top-center" closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
