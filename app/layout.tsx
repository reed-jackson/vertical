import type { Metadata } from "next";
import "./globals.css";
import { TIMEZONE_COOKIE } from "@/lib/calendar/dates";

export const metadata: Metadata = {
  title: "Vertical — Personal Calendar",
  description: "A quiet, vertical calendar for your days.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone;document.cookie="${TIMEZONE_COOKIE}="+encodeURIComponent(z)+";path=/;max-age=31536000;SameSite=Lax"}catch(e){}`,
          }}
        />
      </body>
    </html>
  );
}
