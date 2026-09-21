import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TIMEZONE_COOKIE } from "@/lib/calendar/dates";
import { PwaRegistration } from "@/components/pwa-registration";

export const metadata: Metadata = {
  title: "Vertical — Personal Calendar",
  description: "A quiet, vertical calendar for your days.",
  applicationName: "Vertical",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Vertical",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  viewportFit: "cover",
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
        <PwaRegistration />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone;document.cookie="${TIMEZONE_COOKIE}="+encodeURIComponent(z)+";path=/;max-age=31536000;SameSite=Lax"}catch(e){}`,
          }}
        />
      </body>
    </html>
  );
}
